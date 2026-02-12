# Real-Time Sync Architecture

**Last Updated:** February 12, 2026  
**Status:** Phase 5 - Multi-Browser Testing  

This document consolidates all synchronization documentation for the Video Production Manager app.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database-First Strategy](#database-first-strategy)
3. [Multi-Browser Real-Time Sync](#multi-browser-real-time-sync)
4. [Cross-Device Sync](#cross-device-sync)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Testing & Troubleshooting](#testing--troubleshooting)
7. [API Reference](#api-reference)

---

## Architecture Overview

### Sync Layers

The app implements three levels of synchronization:

1. **Database Sync** (Railway PostgreSQL) - Source of truth
2. **Cache Sync** (IndexedDB) - Local performance cache
3. **Real-Time Sync** (WebSockets) - Multi-browser collaboration

### Key Principles

- **Railway is truth**: PostgreSQL database is the authoritative data source
- **Cache is speed**: IndexedDB provides fast local access
- **WebSockets are collaboration**: Real-time updates across browsers
- **Field-level versioning**: Prevents conflicts in concurrent editing

---

## Database-First Strategy

### Create Operation
```
User Action → API Call (POST) → Railway DB → Response → IndexedDB → UI Update → WebSocket Broadcast
```

### Read Operation
```
App Load → Check IndexedDB Cache → API Call (GET) → Railway DB → Update Cache → UI Display
```

### Update Operation
```
User Edit → API Call (PUT) → Railway DB → Response → IndexedDB → UI Update → WebSocket Broadcast
```

### Delete Operation
```
User Delete → API Call (DELETE) → Railway DB → Response → IndexedDB Remove → UI Update → WebSocket Broadcast
```

### Storage Strategy

**Primary Storage: Railway PostgreSQL**
- All productions, entities, settings stored here
- Accessible from any device
- Survives browser cache clears
- Enables team collaboration

**Secondary Storage: IndexedDB**
- Local cache for fast loading
- Updated after every API operation
- Invalidated on conflicts
- Automatically synced on app startup

---

## Multi-Browser Real-Time Sync

### WebSocket Architecture

**Connection Flow:**
```
Browser A connects → Joins production room
Browser B connects → Joins same production room
Browser A updates entity → API saves → Broadcasts to room → Browser B receives update
```

**Event Pattern:**
```typescript
// Broadcasting (server-side)
broadcastEntityUpdate(io, productionId, entity, 'checklist-item', userId)
// Emits: checklist-item:updated

// Listening (client-side)
subscribe('checklist-item:updated', (data) => {
  updateStore(data)  // Auto-updates UI
})
```

### Field-Level Versioning

**Purpose:** Prevent conflicts when multiple users edit same entity

**Mechanism:**
```json
{
  "version": 5,
  "field_versions": {
    "name": 3,
    "note": 5,
    "assignedTo": 2
  }
}
```

**Conflict Resolution:**
- Each field tracks its own version
- Only `id` field causes conflicts (by design - prevents duplicate keys)
- All other fields auto-merge (last-write-wins per field)
- Server increments version on every update

### Entities Using Real-Time Sync

All entities support WebSocket sync:
- ✅ Productions (settings)
- ✅ Checklist Items
- ✅ Cameras
- ✅ CCUs
- ✅ Sources
- ✅ Sends
- ✅ Connections
- ✅ Cable Snakes
- ✅ Switchers
- ✅ LED Screens
- ✅ Media Servers
- ✅ Projection Screens
- ✅ Records
- ✅ Routers
- ✅ Streams

### WebSocket Events

**Format:** `{entity-type}:{action}`

**Actions:**
- `created` - New entity added
- `updated` - Entity modified
- `deleted` - Entity removed

**Example Events:**
```
checklist-item:created
checklist-item:updated
checklist-item:deleted
camera:created
camera:updated
source:updated
send:deleted
```

**Data Payload:**
```typescript
{
  data: entityObject,      // Full entity in camelCase
  userId: 'user-id',       // Who made the change
  timestamp: '2026-02-12T...'
}
```

---

## Cross-Device Sync

### Scenario: Home Desktop + Work Laptop

**At Home (Desktop):**
1. Open app
2. Create production: "Client Event 2026"
3. ✅ Saved to Railway + cached locally

**At Work (Laptop):**
1. Open app
2. 🔄 Auto-syncs with Railway on startup
3. ✅ "Client Event 2026" appears in Projects list
4. Edit and save
5. ✅ Changes sync to Railway

**Back at Home (Desktop):**
1. Refresh app
2. 🔄 Auto-syncs with Railway
3. ✅ Work changes are now visible

### Automatic Sync on Startup

**App Initialization Sequence:**
```typescript
// App.tsx
1. Load equipment library (from API)
2. syncWithAPI() // Download all productions from Railway
3. Load last opened project (from IndexedDB)
4. Connect WebSocket for real-time updates
```

### Sync Method Implementation

```typescript
const syncWithAPI = async () => {
  // Download productions from Railway
  const remoteProductions = await apiClient.getProductions()
  
  // Get local productions from IndexedDB
  const localProductions = await projectsDB.productions.toArray()
  
  // Add missing productions to cache
  for (const remote of remoteProductions) {
    const exists = localProductions.find(p => p.id === remote.id)
    if (!exists) {
      await projectsDB.productions.add(remote)
      console.log(`✅ Downloaded production: ${remote.name}`)
    }
  }
}
```

---

## Data Flow Patterns

### Pattern 1: Dual-Path Loading

**Cached Path (Fast):**
```
loadProject() → IndexedDB → Display Immediately
```

**Fresh Path (Authoritative):**
```
loadProject() → API Call → Railway DB → Update IndexedDB → Update UI if changed
```

**Both paths executed in parallel** - User sees cached data instantly, then real data replaces it if different.

### Pattern 2: Optimistic Updates

```
User Action → Update UI Immediately → API Call → If fails, revert UI
```

**Not currently implemented** - All updates wait for API confirmation.

### Pattern 3: Fire-and-Forget Broadcast

```
API Update → Save to DB → Broadcast WebSocket → Return Response
```

Broadcasting doesn't block the API response. Clients handle updates asynchronously.

### Pattern 4: Room-Based Broadcasting

```
User A joins production X → Socket joins room "production-{id}"
User B joins production X → Socket joins same room
Update happens → Broadcast only to that room (not all connected clients)
```

---

## Testing & Troubleshooting

### Multi-Browser Sync Test

**Setup:**
1. Open Browser A: http://localhost:3011
2. Open Browser B: http://localhost:3011 (incognito or different browser)
3. Both load same production

**Test Checklist Item Creation:**
1. Browser A: Add checklist item "Test Sync"
2. Browser B: Item should appear instantly (< 1 second)
3. Console shows: `✅ Received: checklist-item:created`

**Test Checklist Item Update:**
1. Browser A: Toggle completion state
2. Browser B: Checkbox should update instantly
3. Console shows: `✅ Received: checklist-item:updated`

**Test Real-Time Editing:**
1. Browser A: Edit camera name to "Camera 1 Updated"
2. Browser B: Name should update in real-time
3. No page refresh needed

### Cross-Device Verification

**Check Railway Database:**
```bash
curl https://videodept-api-production.up.railway.app/api/productions | jq
```

**Check API Health:**
```bash
curl https://videodept-api-production.up.railway.app/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "latency": "110ms"
  }
}
```

### Common Issues

**Issue: "Show doesn't appear on other device"**

Solutions:
1. Refresh page (triggers sync)
2. Check console for sync errors
3. Verify `VITE_API_URL` points to Railway
4. Confirm API is running (health check)

**Issue: "WebSocket not syncing"**

Solutions:
1. Check browser console for connection errors
2. Verify both browsers joined same production room
3. Check API server logs for WebSocket events
4. Confirm port 3010 is accessible

**Issue: "Offline errors"**

Solutions:
- App requires internet for production management
- Check internet connection
- Verify Railway API is up
- Local cache is read-only in offline mode

### Monitoring Sync

**Browser Console Messages:**

✅ Success:
```
🔄 Syncing with Railway API...
✅ Downloaded production: Client Event
✅ Sync complete
✅ Production synced to Railway API
🔌 User connected: {socket-id}
👤 A joined production: {production-id}
```

⚠️ Warnings:
```
⚠️ Failed to sync to API, saved locally
⚠️ Failed to sync with API
⚠️ You are offline
```

❌ Errors:
```
Failed to fetch productions from API
WebSocket disconnected
```

---

## API Reference

### REST Endpoints

**Productions:**
```
GET    /api/productions           # List all
POST   /api/productions           # Create
GET    /api/productions/:id       # Get one
PUT    /api/productions/:id       # Update
DELETE /api/productions/:id       # Delete
```

**Entities (cameras, ccus, sources, sends, etc.):**
```
GET    /api/productions/:productionId/{entity}       # List
POST   /api/productions/:productionId/{entity}       # Create
PUT    /api/productions/:productionId/{entity}/:id   # Update
DELETE /api/productions/:productionId/{entity}/:id   # Delete
```

### WebSocket Events

**Client → Server:**
```
join-production: { productionId }  # Join room for updates
leave-production: { productionId } # Leave room
```

**Server → Client:**
```
{entity}:created  # New entity
{entity}:updated  # Entity modified
{entity}:deleted  # Entity removed
connection-status # Connection state change
```

### Data Transformations

**Server always sends camelCase:**
```typescript
// In API routes
broadcastEntityUpdate(io, productionId, toCamelCase(entity), 'camera', userId)
```

**Client receives camelCase:**
```typescript
subscribe('camera:updated', (data) => {
  // data.productionId (not production_id)
  // data.ccuId (not ccu_id)
})
```

**No manual mapping needed** - Server transforms before broadcasting.

---

## Implementation Status

### ✅ Completed
- Database-first architecture
- Cross-device sync via Railway API
- WebSocket real-time sync infrastructure
- Field-level versioning system
- All entity routes support sync
- Sync helpers (broadcastEntityUpdate, etc.)
- Connection status indicator
- Production settings sync

### 🚧 In Progress
- Multi-browser sync testing (Phase 5)
- Component integration (useEntitySync hooks)

### 📋 Future Enhancements
- Offline queue (retry failed syncs)
- Conflict resolution UI
- Activity feed (show all changes)
- User avatars on editing fields
- WebSocket reconnection logic
- Undo/redo with sync support

---

## Developer Guidelines

### Adding Sync to New Entity

1. **Add field_versions to schema:**
```prisma
model new_entity {
  id               String   @id @default(uuid())
  production_id    String
  // ... other fields
  version          Int      @default(1)
  field_versions   Json?
  last_modified_by String?
  created_at       DateTime @default(now())
  updated_at       DateTime
}
```

2. **Use sync helpers in routes:**
```typescript
import { broadcastEntityUpdate, broadcastEntityCreated } from '../utils/sync-helpers'

// In POST route
const entity = await prisma.new_entity.create({ data })
broadcastEntityCreated(io, productionId, toCamelCase(entity), 'new-entity', userId)

// In PUT route
const updated = await prepareVersionedUpdate(...)
broadcastEntityUpdate(io, productionId, toCamelCase(updated), 'new-entity', userId)
```

3. **Add WebSocket listener:**
```typescript
subscribe('new-entity:created', (data) => {
  set(state => ({
    entities: [...state.entities, data.data]
  }))
})
```

4. **Run migration:**
```bash
npm run db:migrate:check
npx prisma migrate dev --name add_field_versions_to_new_entity
```

---

## References

**Related Documentation:**
- [PROJECT_RULES.md](PROJECT_RULES.md) - Data integrity pillars
- [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md) - Schema details
- [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) - Production deployment
- [SESSION_JOURNAL.md](SESSION_JOURNAL.md) - Development history

**Source Files:**
- `api/src/utils/sync-helpers.ts` - Broadcast utilities
- `api/src/utils/fieldVersioning.ts` - Versioning logic
- `src/hooks/useProjectStore.ts` - Sync implementation
- `api/src/routes/*.ts` - Entity routes with sync

---

**Consolidated from:** API_SYNC_GUIDE.md, CROSS_DEVICE_SYNC.md, CONCURRENT_EDITING_ANALYSIS.md
