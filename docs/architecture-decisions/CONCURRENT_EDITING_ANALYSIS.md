# Concurrent Editing Analysis & Solutions

## Current Implementation (⚠️ Limitations)

### How It Actually Works Right Now

#### 1. **Save Frequency**
```typescript
updateActiveProject: (updates) => {
  // Update local state immediately
  set({ activeProject: { ...activeProject, ...updates } });
  
  // Debounced save - 500ms delay
  setTimeout(() => {
    get().saveProject(); // Hits Railway database
  }, 500);
}
```

**Behavior:**
- Every change (add source, edit venue, etc.) triggers `updateActiveProject()`
- 500ms debounce before actually saving to Railway
- Multiple rapid edits within 500ms = single save
- **No continuous polling** - only saves on user actions

#### 2. **Concurrent Edits** 
**❌ NOT HANDLED**

**Current behavior:**
```
User A opens "Summer Festival 2026"
User B opens "Summer Festival 2026"

User A: Adds camera "Sony A7"    → Saves at 10:00:00
User B: Adds source "Laptop 1"   → Saves at 10:00:05

Result: User A's camera is LOST (overwritten by User B's save)
```

**Why:** Full object replacement - last write wins, no merging.

#### 3. **Conflict Detection**
**❌ NONE**

- No `version` field to detect conflicts
- No `updatedAt` timestamp checking
- No dirty checking
- Users have NO IDEA someone else is editing

#### 4. **Change Tracking**
```typescript
recordChange: (action, entityType, entityId, changes) => {
  // Records changes to IndexedDB (local only)
  // Auto-flush every 2 seconds
  setTimeout(() => get().flushChanges(), 2000);
}
```

**Limitation:** Change records are local only, not synced to Railway.

## Real-World Problems

### Scenario 1: Lost Work
```
10:00 AM - Kevin opens show, adds 5 cameras
10:02 AM - Sarah opens same show (doesn't see Kevin's cameras yet)
10:03 AM - Kevin saves → Cameras in database
10:04 AM - Sarah adds 3 sources, saves → Kevin's cameras GONE
```

### Scenario 2: No Awareness
```
Kevin is editing venue details
Sarah is editing the same show at same time
Neither knows the other is in the show
Both save → whoever saves last wins
```

### Scenario 3: Stale Data
```
10:00 AM - Kevin opens show
11:00 AM - Sarah makes major changes and saves
11:30 AM - Kevin still sees 10:00 AM version
11:31 AM - Kevin makes small edit, saves → Sarah's changes LOST
```

## Solutions (Not Implemented Yet)

### 🟢 OPTION 1: Optimistic Locking (Easiest)

**Add version field:**
```sql
ALTER TABLE productions 
ADD COLUMN version INTEGER DEFAULT 1;
```

**Update logic:**
```typescript
async saveProject() {
  const currentVersion = activeProject.version;
  
  const result = await apiClient.updateProduction(id, {
    ...data,
    version: currentVersion + 1
  }, {
    // Only succeed if version matches
    where: { id, version: currentVersion }
  });
  
  if (!result) {
    // Version mismatch = someone else edited
    throw new ConflictError('Production was modified by another user');
  }
}
```

**User experience:**
1. User makes changes
2. Tries to save
3. If someone else saved first → Error message
4. Options: "Reload and lose your changes" or "View differences"

**Pros:**
- Simple to implement
- Prevents lost data
- Clear error to user

**Cons:**
- User has to manually resolve
- Can be frustrating if conflicts happen often

---

### 🟡 OPTION 2: Field-Level Locking (Granular)

**Track what fields each user is editing:**
```typescript
// When user focuses a field
socket.emit('lock:field', { 
  productionId, 
  field: 'venue',
  userId: 'kevin' 
});

// Other users see
<input 
  disabled={lockedBy === 'sarah'} 
  placeholder="Sarah is editing..."
/>
```

**Pros:**
- Users can edit different fields simultaneously
- Visual feedback of who's editing what
- No conflicts if editing different fields

**Cons:**
- Requires WebSockets/real-time connection
- Complex UI state management
- What if user closes browser without unlocking?

---

### 🟢 OPTION 3: Operational Transforms (Google Docs Style)

**Transform operations to handle concurrent edits:**
```typescript
// Kevin's operation
{ type: 'add', entity: 'source', index: 2, data: {...} }

// Sarah's operation (simultaneous)
{ type: 'add', entity: 'source', index: 2, data: {...} }

// Transform Sarah's operation
{ type: 'add', entity: 'source', index: 3, data: {...} }
// (adjusted because Kevin's insert came first)
```

**Pros:**
- True real-time collaboration
- No conflicts, everything merges
- Best user experience

**Cons:**
- VERY complex to implement correctly
- Requires operational transform library (ShareDB, Yjs, Automerge)
- Needs WebSocket connection
- Significant architecture change

---

### 🟢 OPTION 4: Auto-Merge with CRDT (Most Robust)

**Use Conflict-free Replicated Data Types:**
```typescript
import * as Y from 'yjs';

// Create shared document
const ydoc = new Y.Doc();
const yproduction = ydoc.getMap('production');

// All changes automatically merge
yproduction.set('venue', 'New Venue');  // Kevin
yproduction.get('sources').push([...]) // Sarah (simultaneous)

// Both changes preserved, no conflict
```

**Pros:**
- Automatic conflict resolution
- Works offline then syncs
- Proven technology (Figma, Notion use this)

**Cons:**
- Major architecture change
- Learning curve
- Different mental model for state management

---

### 🟡 OPTION 5: Periodic Polling + Manual Merge

**Poll for changes every N seconds:**
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const latest = await apiClient.getProduction(id);
    
    if (latest.updatedAt > localProject.modified) {
      // Someone else made changes
      showNotification('Show was updated by another user');
      
      if (hasLocalChanges) {
        // Prompt user to merge or reload
        showMergeDialog(localChanges, remoteChanges);
      } else {
        // No local changes, safe to update
        updateLocalCopy(latest);
      }
    }
  }, 30000); // Poll every 30 seconds
  
  return () => clearInterval(interval);
}, []);
```

**Pros:**
- No WebSockets needed
- Simple to implement
- User stays somewhat in sync

**Cons:**
- Not real-time (30s lag)
- Inefficient (polling even if no changes)
- Still requires manual conflict resolution

---

## Recommended Approach (Phased Implementation)

### Phase 1: Basic Conflict Detection
**Total Time: 4-6 hours**

#### Step 1.1: Update Database Schema (30 minutes)
```prisma
// api/prisma/schema.prisma
model Production {
  // ... existing fields
  version     Int       @default(1)
  updatedAt   DateTime  @updatedAt
  updatedBy   String?   // User ID who made last change
}
```
- Add fields to schema
- Run migration: `npx prisma migrate dev`
- Test in Railway: `railway run npx prisma migrate deploy`

**Time breakdown:**
- Schema update: 5 minutes
- Migration creation: 10 minutes
- Testing locally: 10 minutes
- Deploy to Railway: 5 minutes

---

#### Step 1.2: Update API Route with Optimistic Locking (1.5 hours)
```typescript
// api/src/routes/productions.ts
router.put('/:id', async (req, res) => {
  const { version, updatedBy, ...data } = req.body;
  
  // Validate version provided
  if (version === undefined) {
    return res.status(400).json({ 
      error: 'Version required for conflict detection'
    });
  }
  
  // Try to update with version check
  const production = await prisma.production.findUnique({
    where: { id: req.params.id }
  });
  
  if (!production) {
    return res.status(404).json({ error: 'Production not found' });
  }
  
  if (production.version !== version) {
    return res.status(409).json({ 
      error: 'Conflict',
      message: 'Production was modified by another user',
      currentVersion: production.version,
      latestData: production
    });
  }
  
  // Update with incremented version
  const updated = await prisma.production.update({
    where: { id: req.params.id },
    data: {
      ...data,
      version: version + 1,
      updatedBy,
      updatedAt: new Date()
    }
  });
  
  res.json(updated);
});
```

**Time breakdown:**
- Implement route logic: 30 minutes
- Add error handling: 15 minutes
- Write tests: 30 minutes
- Manual testing with Postman/curl: 15 minutes

---

#### Step 1.3: Update Frontend Save Logic (2 hours)
```typescript
// src/hooks/useProjectStore.ts
async saveProject() {
  const { activeProject } = get();
  
  try {
    const response = await apiClient.updateProduction(
      activeProject.production.id, 
      {
        ...data,
        version: activeProject.version,
        updatedBy: getCurrentUserId() // TODO: Add user management
      }
    );
    
    // Success - update local version
    set({ 
      activeProject: { 
        ...activeProject, 
        version: response.version // Use server's new version
      }
    });
    
    console.log('✅ Production saved successfully');
  } catch (error) {
    if (error.status === 409) {
      // Conflict detected!
      handleConflict(error.data);
    } else {
      throw error;
    }
  }
}

function handleConflict(conflictData) {
  const userChoice = confirm(
    `⚠️ CONFLICT DETECTED\n\n` +
    `Someone else modified this show while you were editing.\n\n` +
    `Their changes:\n` +
    `- Version: ${conflictData.currentVersion}\n` +
    `- Last modified: ${new Date(conflictData.latestData.updatedAt).toLocaleString()}\n\n` +
    `Options:\n` +
    `• Click OK to reload their changes (you will LOSE your unsaved work)\n` +
    `• Click Cancel to continue editing (you may OVERWRITE their changes)`
  );
  
  if (userChoice) {
    // Reload from server
    loadProject(activeProjectId);
  } else {
    // Force save - user accepts overwriting
    set({ 
      activeProject: { 
        ...activeProject, 
        version: conflictData.currentVersion // Use server's version to force
      }
    });
  }
}
```

**Time breakdown:**
- Update saveProject function: 30 minutes
- Add conflict detection logic: 30 minutes
- Implement user choice dialog: 20 minutes
- Add version tracking to state: 15 minutes
- Test conflict scenarios: 25 minutes

---

#### Step 1.4: Test Complete Flow (30 minutes)
1. Open show in two browsers
2. Edit in Browser A, save
3. Edit in Browser B, save → Should see conflict
4. Test "Reload" option → Should load fresh data
5. Test "Continue" option → Should force save

---

### Phase 2: Real-Time Presence Indicator
**Total Time: 6-8 hours**

#### Step 2.1: Create Presence UI Component (✅ DONE - 1.5 hours)
- Created `src/components/PresenceIndicator.tsx`
- Added to Layout.tsx sidebar
- Google Docs-style avatar badges
- Hover to expand full user list

**Already implemented!**

---

#### Step 2.2: Add Socket.io to Backend (2 hours)
```bash
cd api
npm install socket.io
```

```typescript
// api/src/server.ts
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

// Presence tracking
const activeUsers = new Map<string, Set<string>>(); // productionId -> Set<userId>

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('production:join', ({ productionId, userId, userName }) => {
    socket.join(`production:${productionId}`);
    socket.data.productionId = productionId;
    socket.data.userId = userId;
    socket.data.userName = userName;
    
    // Add to active users
    if (!activeUsers.has(productionId)) {
      activeUsers.set(productionId, new Set());
    }
    activeUsers.get(productionId)!.add(userId);
    
    // Broadcast updated user list to room
    const users = Array.from(activeUsers.get(productionId)!);
    io.to(`production:${productionId}`).emit('presence:update', users);
  });
  
  socket.on('production:leave', ({ productionId, userId }) => {
    socket.leave(`production:${productionId}`);
    activeUsers.get(productionId)?.delete(userId);
    
    const users = Array.from(activeUsers.get(productionId) || []);
    io.to(`production:${productionId}`).emit('presence:update', users);
  });
  
  socket.on('disconnect', () => {
    const { productionId, userId } = socket.data;
    if (productionId && userId) {
      activeUsers.get(productionId)?.delete(userId);
      const users = Array.from(activeUsers.get(productionId) || []);
      io.to(`production:${productionId}`).emit('presence:update', users);
    }
  });
});

httpServer.listen(PORT);
```

**Time breakdown:**
- Install and configure Socket.io: 15 minutes
- Implement connection handlers: 45 minutes
- Add presence tracking logic: 30 minutes
- Test with multiple connections: 30 minutes

---

#### Step 2.3: Add Socket.io to Frontend (2 hours)
```bash
cd video-production-manager
npm install socket.io-client
```

```typescript
// src/hooks/usePresence.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/services';

let socket: Socket | null = null;

export function usePresence(productionId: string | undefined) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  
  useEffect(() => {
    if (!productionId) return;
    
    // Connect to Socket.io
    const apiUrl = apiClient.getBaseURL();
    socket = io(apiUrl, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('auth_token')
      }
    });
    
    // Join production room
    socket.emit('production:join', {
      productionId,
      userId: getCurrentUserId(),
      userName: getCurrentUserName()
    });
    
    // Listen for presence updates
    socket.on('presence:update', (userIds: string[]) => {
      // Fetch user details for each ID
      Promise.all(
        userIds.map(id => fetchUserDetails(id))
      ).then(users => {
        setActiveUsers(users);
      });
    });
    
    // Cleanup on unmount
    return () => {
      socket?.emit('production:leave', { productionId, userId: getCurrentUserId() });
      socket?.disconnect();
    };
  }, [productionId]);
  
  return { activeUsers };
}
```

```typescript
// src/components/PresenceIndicator.tsx
import { usePresence } from '@/hooks/usePresence';

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  productionId
}) => {
  const { activeUsers } = usePresence(productionId);
  
  // ... rest of component (already implemented)
}
```

**Time breakdown:**
- Install socket.io-client: 5 minutes
- Create usePresence hook: 45 minutes
- Integrate with PresenceIndicator: 30 minutes
- Add connection error handling: 15 minutes
- Test real-time updates: 25 minutes

---

#### Step 2.4: Test Presence System (30 minutes)
1. Open show in Browser A → See yourself
2. Open same show in Browser B → Both see each other
3. Close Browser A → Browser B sees user leave
4. Test with 3+ users → See overflow count

---

#### Step 2.5: Add User Management (1 hour)
```typescript
// Simple user ID generation for now
function getCurrentUserId(): string {
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user_id', userId);
  }
  return userId;
}

function getCurrentUserName(): string {
  let userName = localStorage.getItem('user_name');
  if (!userName) {
    userName = prompt('Enter your name:') || 'Anonymous';
    localStorage.setItem('user_name', userName);
  }
  return userName;
}

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

**Time breakdown:**
- Implement user ID/name functions: 20 minutes
- Add name prompt UI: 20 minutes
- Store in localStorage: 10 minutes
- Test across browsers: 10 minutes

---

### Phase 3: Polling + Background Sync (3-4 hours)
```typescript
// Add to Prisma schema
model Production {
  // ... existing fields
  version     Int       @default(1)
  updatedAt   DateTime  @updatedAt
  updatedBy   String?   // Who made last change
}

// Frontend: Check version before save
async saveProject() {
  try {
    await apiClient.updateProduction(id, {
      ...data,
      version: currentVersion + 1,
      expectedVersion: currentVersion // Server validates this
    });
  } catch (ConflictError) {
    alert('This show was modified by another user. Please reload to see their changes.');
    // Optionally: Show diff, allow manual merge
  }
}
```

**Impact:**
- ✅ Prevents silent data loss
- ✅ User knows there's a conflict
- ❌ Still requires manual reload

---

### Phase 3: Polling + Background Sync
**Total Time: 3-4 hours**

#### Step 3.1: Add Polling Hook (1.5 hours)
```typescript
// src/hooks/useProjectStore.ts
useEffect(() => {
  if (!activeProjectId || !activeProject) return;
  
  const checkForUpdates = setInterval(async () => {
    try {
      const latest = await apiClient.getProduction(activeProject.production.id);
      
      if (latest.version > activeProject.version) {
        // Someone else edited!
        const hasLocalChanges = pendingChanges.length > 0 || isSaving;
        
        if (hasLocalChanges) {
          // Show warning toast
          toast.warning(
            '⚠️ Another user modified this show',
            {
              action: {
                label: 'Reload',
                onClick: () => loadProject(activeProjectId)
              }
            }
          );
        } else {
          // No local changes, safe to auto-update
          const freshProject = latest.metadata as VideoDepProject;
          set({ activeProject: freshProject });
          toast.info('✅ Show updated with latest changes');
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }, 30000); // Poll every 30 seconds
  
  return () => clearInterval(checkForUpdates);
}, [activeProjectId, activeProject?.version]);
```

**Time breakdown:**
- Implement polling logic: 30 minutes
- Add toast notifications: 20 minutes
- Handle auto-update vs manual reload: 25 minutes
- Test with concurrent edits: 15 minutes

---

#### Step 3.2: Add Toast Notification Library (30 minutes)
```bash
npm install sonner
```

```typescript
// src/App.tsx
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      {/* rest of app */}
    </>
  );
}
```

**Time breakdown:**
- Install library: 5 minutes
- Add to App: 5 minutes
- Style customization: 15 minutes
- Test notifications: 5 minutes

---

#### Step 3.3: Add Visual Sync Indicator (1 hour)
```typescript
// src/components/SyncIndicator.tsx
export const SyncIndicator = () => {
  const { lastSyncTime, isSaving } = useProjectStore();
  const [timeSinceSync, setTimeSinceSync] = useState('');
  
  useEffect(() => {
    const updateTimer = setInterval(() => {
      if (lastSyncTime) {
        const seconds = Math.floor((Date.now() - lastSyncTime) / 1000);
        if (seconds < 60) setTimeSinceSync(`${seconds}s ago`);
        else setTimeSinceSync(`${Math.floor(seconds / 60)}m ago`);
      }
    }, 1000);
    
    return () => clearInterval(updateTimer);
  }, [lastSyncTime]);
  
  return (
    <div className="flex items-center gap-2 text-xs text-av-text-muted">
      {isSaving ? (
        <>
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          Saving...
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          Saved {timeSinceSync}
        </>
      )}
    </div>
  );
};
```

Add to Layout header next to user presence.

**Time breakdown:**
- Create component: 20 minutes
- Add to Layout: 10 minutes
- Style and animations: 20 minutes
- Test sync states: 10 minutes

---

### Phase 4: Real-Time Change Broadcasting (Optional)
**Total Time: 4-6 hours**

Broadcast specific changes rather than full reloads:

```typescript
// When user makes a change
socket.emit('production:change', {
  productionId,
  userId,
  changeType: 'source:added',
  data: newSource
});

// Other users receive
socket.on('production:change', ({ userId, changeType, data }) => {
  if (userId !== getCurrentUserId()) {
    // Apply change to local state
    applyRemoteChange(changeType, data);
    toast.info(`${userName} added a source`);
  }
});
```

This is more complex but provides true collaborative editing.

---

## Complete Implementation Timeline

### MVP (Minimum Viable Product)
**Total: 10-14 hours (~2 days)**

| Phase | Feature | Time | Priority |
|-------|---------|------|----------|
| 1.1 | Database schema | 30 min | 🔴 CRITICAL |
| 1.2 | API optimistic locking | 1.5 hrs | 🔴 CRITICAL |
| 1.3 | Frontend conflict handling | 2 hrs | 🔴 CRITICAL |
| 1.4 | Testing | 30 min | 🔴 CRITICAL |
| 2.1 | Presence UI component | ✅ DONE | 🟡 HIGH |
| 2.2 | Socket.io backend | 2 hrs | 🟡 HIGH |
| 2.3 | Socket.io frontend | 2 hrs | 🟡 HIGH |
| 2.4 | Test presence | 30 min | 🟡 HIGH |
| 2.5 | User management | 1 hr | 🟡 HIGH |
| **TOTAL** | **~10-14 hours** | | |

---

### Full Production Ready
**Total: 17-22 hours (~3-4 days)**

Includes MVP + Polling + Visual indicators:

| Phase | Feature | Time | Priority |
|-------|---------|------|----------|
| MVP | All MVP features | 10-14 hrs | 🔴 CRITICAL |
| 3.1 | Polling hook | 1.5 hrs | 🟢 MEDIUM |
| 3.2 | Toast notifications | 30 min | 🟢 MEDIUM |
| 3.3 | Sync indicator | 1 hr | 🟢 MEDIUM |
| **TOTAL** | **~13-17 hours** | | |

---

### Advanced (Real-Time Changes)
**Total: 21-28 hours (~4-5 days)**

Full collaborative editing with change broadcasting:

| Phase | Feature | Time | Priority |
|-------|---------|------|----------|
| Full | All production features | 13-17 hrs | 🔴 CRITICAL |
| 4 | Change broadcasting | 4-6 hrs | 🔵 LOW |
| **TOTAL** | **~17-23 hours** | | |

---

## Priority Recommendation

### Week 1: Safety First (Critical) 
**Days 1-2: Implement Phase 1**
- Prevents data loss
- User aware of conflicts
- Foundation for everything else

**Estimated: 4-6 hours**

### Week 1: Team Awareness (High)
**Days 2-3: Implement Phase 2**
- See who else is in the show
- Real-time presence
- Better collaboration UX

**Estimated: 6-8 hours**

### Week 2: Polish (Medium)
**Days 4-5: Implement Phase 3**
- Auto-sync in background
- Visual feedback
- Smoother experience

**Estimated: 3-4 hours**

### Future: Advanced (Optional)
**Week 3+: Implement Phase 4**
- Real-time change syncing
- Google Docs-level collaboration
- Nice to have, not essential

**Estimated: 4-6 hours**

---
```typescript
// Poll every 30 seconds
useEffect(() => {
  const poller = setInterval(async () => {
    const remote = await apiClient.getProduction(id);
    
    if (remote.version > local.version) {
      if (hasUnsavedChanges) {
        showWarning('Someone else is editing this show');
      } else {
        // Auto-update in background
        updateLocalCopy(remote);
        toast.success('Show updated with latest changes');
      }
    }
  }, 30000);
  
  return () => clearInterval(poller);
}, [id]);
```

**Impact:**
- ✅ Users see when others are editing
- ✅ Auto-updates if no local changes
- ✅ Warns if conflict likely

---

### Phase 3: WebSocket Real-Time (1-2 weeks)
```typescript
// Backend: Socket.io server
io.on('connection', (socket) => {
  socket.on('production:join', (productionId) => {
    socket.join(`production:${productionId}`);
    
    // Notify others
    socket.to(`production:${productionId}`).emit('user:joined', {
      userId: socket.userId,
      userName: socket.userName
    });
  });
  
  socket.on('production:update', (data) => {
    // Broadcast to others
    socket.to(`production:${data.id}`).emit('production:changed', data);
  });
});

// Frontend: Real-time updates
socket.on('production:changed', (updated) => {
  if (hasLocalChanges) {
    showNotification('Someone else made changes');
  } else {
    updateLocalCopy(updated);
  }
});

socket.on('user:joined', ({ userName }) => {
  showPresence(`${userName} is viewing this show`);
});
```

**Impact:**
- ✅ Real-time awareness
- ✅ See who else is editing
- ✅ Instant updates
- ❌ Still need conflict resolution for simultaneous edits

---

### Phase 4: CRDT or OT (1-2 months)
Full collaborative editing like Google Docs.

---

## Immediate Recommendations

### 🚨 Critical (Do Now)

**1. Add Version Field**
```typescript
// api/prisma/schema.prisma
model Production {
  // ... existing
  version     Int       @default(1)
  updatedAt   DateTime  @updatedAt
  updatedBy   String?
}
```

**2. Implement Optimistic Locking**
```typescript
// api/src/routes/productions.ts
router.put('/:id', async (req, res) => {
  const { version, ...data } = req.body;
  
  const updated = await prisma.production.updateMany({
    where: { 
      id: req.params.id,
      version: version // Only update if version matches
    },
    data: {
      ...data,
      version: version + 1,
      updatedAt: new Date()
    }
  });
  
  if (updated.count === 0) {
    return res.status(409).json({ 
      error: 'Conflict',
      message: 'Production was modified by another user'
    });
  }
  
  res.json({ success: true });
});
```

**3. Handle Conflict in Frontend**
```typescript
async saveProject() {
  try {
    await apiClient.updateProduction(id, {
      ...data,
      version: activeProject.version
    });
    
    // Success - update local version
    set({ 
      activeProject: { 
        ...activeProject, 
        version: activeProject.version + 1 
      }
    });
  } catch (error) {
    if (error.status === 409) {
      // Conflict!
      const reload = confirm(
        'This show was modified by another user.\n' +
        'Click OK to reload and see their changes (you will lose your unsaved work).\n' +
        'Click Cancel to keep editing (you may overwrite their changes).'
      );
      
      if (reload) {
        await loadProject(id); // Reload from database
      }
    } else {
      throw error;
    }
  }
}
```

---

### 🎯 Next Priority (This Week)

**Add Polling for Awareness**
```typescript
// In useProjectStore.ts
useEffect(() => {
  if (!activeProjectId) return;
  
  const checkForUpdates = setInterval(async () => {
    try {
      const latest = await apiClient.getProduction(activeProject.production.id);
      
      if (latest.version > activeProject.version) {
        // Someone else edited
        if (pendingChanges.length > 0) {
          toast.warning('⚠️ Another user modified this show');
        } else {
          // No local changes, safe to update
          const freshProject = latest.metadata as VideoDepProject;
          set({ activeProject: freshProject });
          toast.info('✅ Show updated with latest changes');
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }, 30000); // Check every 30 seconds
  
  return () => clearInterval(checkForUpdates);
}, [activeProjectId]);
```

---

## Current Risk Assessment

| Risk | Severity | Likelihood | Impact |
|------|----------|------------|--------|
| **Lost work due to overwrite** | 🔴 CRITICAL | High | Data loss, user frustration |
| **No awareness of concurrent edits** | 🟡 HIGH | High | Confusion, duplicate work |
| **Stale data being edited** | 🟡 HIGH | Medium | Wasted effort, conflicts |
| **No audit trail** | 🟡 MEDIUM | Low | Can't track who changed what |

---

## Summary

### Current State
- ❌ No conflict detection
- ❌ No concurrent edit handling
- ❌ Last write wins (silent data loss)
- ✅ Saves every 500ms after user action
- ❌ No polling or real-time updates

### Minimum Viable Fix (This Week)
1. Add `version` field to database ✅
2. Implement optimistic locking in API ✅
3. Handle 409 conflicts in frontend ✅
4. Add polling every 30s to detect changes ✅

### Future Enhancements
- WebSocket for real-time presence
- Field-level locking
- Automatic merge strategies
- CRDT for true collaborative editing

**Time Estimate:**
- Basic conflict detection: 4-6 hours
- Polling + notifications: 4-6 hours
- **Total for immediate safety: 1-2 days**
