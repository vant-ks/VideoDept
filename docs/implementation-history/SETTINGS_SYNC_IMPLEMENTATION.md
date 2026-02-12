# Settings Sync Implementation

## Overview
Implemented database-backed global workspace settings with real-time WebSocket synchronization across all connected users. Equipment settings (source types, connector types, frame rates, resolutions) are now stored in PostgreSQL and synced via WebSocket broadcasts, with Zustand providing offline caching and optimistic UI updates.

## Architecture

### Data Flow
```
Settings UI (any role)
    ↓ POST/DELETE/PUT
/api/settings/{category}
    ↓ Prisma
Database (global workspace tables)
    ↓ Socket.IO
io.emit('settings:{category}-updated')
    ↓ WebSocket
All connected browsers
    ↓ Event listener
Update Zustand store
    ↓ Reactivity
UI auto-updates (Settings + Add Source modal)
```

### Why Global Workspace Settings?
- Equipment types are organizational standards, not project-specific
- Users expect consistency across all shows
- Per-production approach caused infinite render loop (activeProject object reference changes)
- Offline workflow breaks if types require production data
- Industry standard: Jira issue types, GitHub labels are workspace-level

## Backend Changes

### Database Tables (Already Existed)
```typescript
// api/prisma/schema.prisma
model source_types {
  id         String   @id
  name       String   @unique
  sort_order Int      @default(0)
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  @@index([sort_order, is_active])
}

model connector_types { /* same structure */ }
model frame_rates { rate String @unique /* same structure */ }
model resolution_presets { /* same structure */ }
```

### API Routes Updated
**File**: `api/src/routes/settings.ts`

Added WebSocket broadcasts to all CRUD operations:
```typescript
import { getIO } from '../server';

// Example: Source Types POST
router.post('/source-types', async (req, res) => {
  const sourceType = await prisma.source_types.create({
    data: { id: `src-type-${Date.now()}`, name, sort_order, updated_at: new Date() }
  });
  
  const io = getIO();
  io.emit('settings:source-types-updated', { action: 'add', type: sourceType.name });
  
  res.json(sourceType);
});
```

### Restore Defaults Endpoints
Added POST endpoints for restoring seed defaults:
- `/api/settings/source-types/restore-defaults` - 11 default types (Laptop - PC MISC, etc.)
- `/api/settings/connector-types/restore-defaults` - 17 connector types (HDMI, SDI, DP, etc.)
- `/api/settings/frame-rates/restore-defaults` - 8 frame rates (60, 59.94, 50, 30, 29.97, 25, 24, 23.98)
- `/api/settings/resolutions/restore-defaults` - 9 resolutions (8192 x 1080, 7680 x 1080, etc.)

### WebSocket Events
Server emits these events on mutations:
- `settings:source-types-updated` → `{ action: 'add'|'delete'|'reorder'|'restore-defaults', type/types }`
- `settings:connector-types-updated` → `{ action: 'add'|'delete'|'reorder'|'restore-defaults', type/types }`
- `settings:frame-rates-updated` → `{ action: 'add'|'delete'|'reorder'|'restore-defaults', rate/rates }`
- `settings:resolution-presets-updated` → `{ action: 'add'|'delete'|'reorder'|'restore-defaults', resolutions }`

## Frontend Changes

### Settings.tsx
**File**: `src/pages/Settings.tsx`

#### 1. Added WebSocket Hook
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

const { socket, isConnected } = useWebSocket();
```

#### 2. API Fetch on Mount
```typescript
useEffect(() => {
  const fetchSettings = async () => {
    const apiUrl = getApiUrl();
    
    // Fetch all 4 categories
    const sourceTypesRes = await fetch(`${apiUrl}/api/settings/source-types`);
    if (sourceTypesRes.ok) {
      const types = await sourceTypesRes.json();
      oldStore.setSourceTypes?.(types); // Update Zustand cache
    }
    // ... repeat for connector-types, frame-rates, resolutions
  };
  
  fetchSettings();
}, []);
```

#### 3. WebSocket Listeners
```typescript
useEffect(() => {
  if (!socket || !isConnected) return;
  
  const handleSourceTypesUpdated = (data: any) => {
    console.log('Settings: Received source-types update via WebSocket:', data);
    // Refetch from API to get latest data
    fetch(`${apiUrl}/api/settings/source-types`)
      .then(res => res.json())
      .then(types => oldStore.setSourceTypes?.(types))
      .catch(err => console.error('Failed to refetch source types:', err));
  };
  
  socket.on('settings:source-types-updated', handleSourceTypesUpdated);
  // ... register listeners for other 3 categories
  
  return () => {
    socket.off('settings:source-types-updated', handleSourceTypesUpdated);
    // ... cleanup other listeners
  };
}, [socket, isConnected]);
```

#### 4. Updated Handlers to Call API
**Before (Zustand only)**:
```typescript
const handleAddSourceType = async (e: React.FormEvent) => {
  e.preventDefault();
  addSourceType(trimmedType); // Only updates local Zustand
};
```

**After (API + Optimistic Update)**:
```typescript
const handleAddSourceType = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/settings/source-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedType })
    });
    
    if (!response.ok) throw new Error('Failed to add source type');
    
    // Optimistic update - will be confirmed by WebSocket
    addSourceType(trimmedType);
  } catch (error) {
    console.error('Failed to add source type:', error);
    setTypeError('Failed to add source type');
  }
};
```

Similar updates for:
- `handleRemoveSourceType` → DELETE `/api/settings/source-types/:name`
- `handleRestoreDefaultSourceTypes` → POST `/api/settings/source-types/restore-defaults`
- `handleTypeDragEnd` → PUT `/api/settings/source-types/reorder`
- All connector types, frame rates, and resolutions handlers

#### 5. Added Restore Defaults Buttons
Added restore defaults buttons to all 4 sections with RotateCcw icon:
```typescript
{canEditEquipmentSettings && (
  <div className="mb-4">
    <button 
      onClick={handleRestoreDefaultConnectorTypes}
      className="btn-secondary text-sm flex items-center gap-2"
    >
      <RotateCcw className="w-4 h-4" />
      Restore Defaults
    </button>
  </div>
)}
```

#### 6. Removed Role Restrictions
**Before**:
```typescript
const canEditEquipmentSettings = userRole === 'admin' || userRole === 'manager';
```

**After**:
```typescript
// Equipment settings (source types, connector types, frame rates, resolutions) are open to all roles including operators
const canEditEquipmentSettings = true;
// Production info editing remains restricted to admin/manager only
const canEditProductionInfo = userRole === 'admin' || userRole === 'manager';
```

### Zustand Store Update
**File**: `src/hooks/useStore.ts`

Added setter method for source types:
```typescript
// Interface
setSourceTypes: (types: string[]) => void;

// Implementation
setSourceTypes: (types) => {
  set({ sourceTypes: types });
},
```

## Permissions
- **Equipment Settings** (source types, connector types, frame rates, resolutions): Open to **all roles** including operators
- **Production Info** (show name, client, dates): Restricted to **admin/manager** only

## Testing
To test multi-browser sync:
1. Start API server: `npm run dev` in `api/` folder
2. Start frontend: `npm run dev` in project root
3. Open app in 2 browsers (e.g., Chrome and Firefox)
4. In Browser A: Add/remove/reorder source types
5. In Browser B: Verify changes appear immediately without refresh

Expected behavior:
- ✅ Changes sync instantly via WebSocket
- ✅ Both browsers show identical lists
- ✅ Restore defaults replaces all items with seed values
- ✅ Drag-and-drop reorder syncs across browsers
- ✅ Offline: Settings cached in Zustand/localStorage, sync on reconnect

## Implementation Summary
| Category | Backend API | WebSocket Broadcast | Frontend Handler | Restore Defaults | Permission |
|----------|-------------|---------------------|------------------|------------------|------------|
| Source Types | ✅ | ✅ | ✅ | ✅ (11 items) | All roles |
| Connector Types | ✅ | ✅ | ✅ | ✅ (17 items) | All roles |
| Frame Rates | ✅ | ✅ | ✅ | ✅ (8 items) | All roles |
| Resolutions | ✅ | ✅ | ✅ | ✅ (9 items) | All roles |

## Key Decisions
1. **Global vs Per-Production**: Chose global workspace settings to avoid infinite render loops and match industry standards
2. **Optimistic Updates**: UI updates immediately on user action, confirmed by WebSocket broadcast
3. **Refetch on WebSocket**: Rather than directly applying WebSocket payload, refetch from API to ensure consistency
4. **Permission Model**: Opened equipment settings to operators while keeping production info restricted
5. **Offline Support**: Zustand cache provides offline fallback, syncs on reconnect

## Files Modified
- ✅ `api/src/routes/settings.ts` - Added WebSocket broadcasts + restore defaults
- ✅ `src/pages/Settings.tsx` - API integration + WebSocket listeners + restore buttons
- ✅ `src/hooks/useStore.ts` - Added `setSourceTypes` method
- ✅ `src/hooks/useWebSocket.ts` - Already existed, used for connection

## Files NOT Modified (Already Correct)
- ✅ `api/prisma/schema.prisma` - Tables already exist with proper structure
- ✅ `src/hooks/useEquipmentLibrary.ts` - Already has `setConnectorTypes`, `setFrameRates`, `setResolutions`
- ✅ `src/components/SourceFormModal.tsx` - No changes needed, reads from Zustand which Settings populates

## Next Steps
1. Start servers and test multi-browser sync
2. Verify restore defaults returns correct seed values
3. Test offline behavior (disconnect network, make changes, reconnect)
4. Consider adding toast notifications for successful operations
5. Monitor WebSocket console logs to verify events are received
