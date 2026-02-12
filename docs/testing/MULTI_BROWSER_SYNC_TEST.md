# Multi-Browser Real-Time Sync Testing Guide

## Prerequisites

- Both servers running:
  - API Server: `http://localhost:3010` 
  - Frontend: `http://localhost:3011`
- Two browser windows (or use different browsers/incognito modes)
- Same production open in both browsers

## Test Environment Setup

### 1. Start Servers
```bash
# Terminal 1 - API Server
cd video-production-manager/api && npm run dev

# Terminal 2 - Frontend
cd video-production-manager && npm run dev
```

### 2. Open Two Browser Windows
- **Browser A**: `http://localhost:3011` (Chrome)
- **Browser B**: `http://localhost:3011` (Chrome Incognito or Firefox)

### 3. Navigate to Same Production
1. Open the same project in both browsers
2. Verify you see presence indicators showing multiple users
3. Check connection status indicator shows "Connected" (green)

## Test Scenarios

### Test 1: Production Settings Sync ✅ (Already Working)

**Browser A Actions:**
1. Navigate to Settings page
2. Change "Client" field
3. Click Save

**Browser B Verification:**
- Settings page should update immediately
- New client name visible without refresh
- Version number increments

**Expected Console Logs:**
```
📡 Broadcasting production:updated to room production:{id}
📨 Received production:updated
🔀 Auto-merging production update
✅ Auto-merged production update
```

---

### Test 2: Checklist Item Sync 🎯

**Browser A Actions:**
1. Navigate to Checklist page  
2. Add new checklist item: "Test Real-Time Sync"
3. Check the item as complete

**Browser B Verification:**
- New item appears instantly in list
- Checkbox state updates in real-time
- No page refresh needed

**WebSocket Events:**
- `checklist-item:created` - When item added
- `checklist-item:updated` - When checkbox toggled

**API Test (Optional):**
```bash
# Create item
curl -X POST http://localhost:3010/api/checklist-items \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-'$(date +%s)'",
    "productionId": "YOUR_PRODUCTION_ID",
    "title": "API Test Item",
    "completed": false,
    "lastModifiedBy": "test-user"
  }'

# Both browsers should show new item instantly
```

---

### Test 3: Camera Sync 🎥

**Browser A Actions:**
1. Navigate to Cameras page
2. Add new camera: "Camera 1"
3. Update camera name to "Camera 1 - Modified"

**Browser B Verification:**
- New camera appears in list immediately
- Name change updates without refresh
- Version increments shown in console

**WebSocket Events:**
- `camera:created` - When camera added
- `camera:updated` - When name changed

---

### Test 4: Source Sync 📺

**Browser A Actions:**
1. Navigate to Sources (Computers) page
2. Add new source
3. Change resolution or other properties

**Browser B Verification:**
- Source appears immediately
- Property changes sync in real-time

**WebSocket Events:**
- `source:created`
- `source:updated`

---

### Test 5: Send Sync 📤

**Browser A Actions:**
1. Navigate to Sends (LED/Projection) page
2. Add new send
3. Update send properties

**Browser B Verification:**
- Send appears instantly
- Changes propagate immediately

**WebSocket Events:**
- `send:created`
- `send:updated`

---

### Test 6: CCU Sync 🎛️

**Browser A Actions:**
1. Navigate to CCUs page
2. Add new CCU
3. Update CCU settings

**Browser B Verification:**
- CCU appears in real-time
- Updates sync immediately

**WebSocket Events:**
- `ccu:created`
- `ccu:updated`

---

### Test 7: Connection Sync 🔌

**Browser A Actions:**
1. Navigate to Signal Flow page
2. Create new connection
3. Modify connection routing

**Browser B Verification:**
- Connection appears instantly
- Routing changes update live

**WebSocket Events:**
- `connection:created`
- `connection:updated`

---

## Connection Status Testing

### Test 8: Offline Warning 🔴

**Steps:**
1. Stop API server: `pkill -9 -f 'tsx watch'`
2. Both browsers should show:
   - Red "Disconnected" indicator
   - Red banner: "You are offline"
3. Try making changes - changes saved locally only
4. Restart API server
5. Should show "Reconnecting" (orange) then "Connected" (green)
6. Pending changes sync automatically

---

## Conflict Resolution Testing

### Test 9: Version Conflict Detection ⚠️

**Setup:**
1. Open production settings in both browsers
2. Disconnect Browser B from network (Dev Tools > Network > Offline)

**Browser A Actions:**
1. Change "Client" to "Client A"
2. Save (version becomes 2)

**Browser B Actions (while offline):**
1. Change "Client" to "Client B"  
2. Save (still thinks version is 1)
3. Reconnect to network
4. Should detect conflict - version mismatch

**Expected Behavior:**
- Conflict detection kicks in
- Auto-merge resolves by using latest version
- Both browsers show consistent state

---

## Performance Testing

### Test 10: Rapid Updates 🚀

**Steps:**
1. Toggle checklist item rapidly (5-10 times fast)
2. Both browsers should stay in sync
3. No duplicate updates
4. Version numbers increment correctly

---

## Debugging

### Browser Console Logs to Monitor

**Connection Status:**
```
✅ WebSocket connected
🔌 WebSocket disconnected
🔄 WebSocket reconnecting
```

**Presence:**
```
🚪 Joining production room
👥 Active users: [...]
```

**Entity Updates:**
```
📡 Broadcasting {entity}:updated to room
📨 Received {entity}:updated  
📊 Version check: {current: X, incoming: Y}
🔀 Auto-merging {entity} update
✅ Auto-merged {entity} update
```

### Common Issues

**Issue: Changes not syncing**
- Check connection indicator is green
- Verify both browsers in same production
- Check browser console for WebSocket errors
- Confirm API server running on port 3010

**Issue: Duplicate updates**
- Check version numbers in console
- Verify only one useEntitySync hook per component
- Check for duplicate WebSocket listeners

**Issue: Offline warning not showing**
- Stop API server completely  
- Check OfflineWarning component in Layout
- Verify WebSocket status updating

---

## Success Criteria ✅

All tests pass when:
- ✅ Changes appear instantly in other browser (< 100ms)
- ✅ No page refresh required
- ✅ Version numbers increment correctly
- ✅ Connection status indicator accurate
- ✅ Offline warning shows when disconnected
- ✅ No duplicate updates or race conditions
- ✅ Console logs show proper event flow
- ✅ Presence indicators show all active users

---

## Quick Test Script

```bash
# Create test items in different entity types
PROD_ID="YOUR_PRODUCTION_ID"

# Checklist item
curl -X POST http://localhost:3010/api/checklist-items -H "Content-Type: application/json" -d "{\"id\":\"test-$(date +%s)\",\"productionId\":\"$PROD_ID\",\"title\":\"Sync Test\",\"lastModifiedBy\":\"tester\"}"

# Watch both browsers - item should appear instantly!
```

---

## Phase 5 Completion Checklist

- [ ] All entity routes updated with sync-helpers
- [ ] WebSocket broadcasts working for all entities
- [ ] Multi-browser sync verified for:
  - [ ] Productions (settings)
  - [ ] Checklist items
  - [ ] Cameras
  - [ ] CCUs
  - [ ] Sources
  - [ ] Sends
  - [ ] Connections
- [ ] Connection status UI showing correct states
- [ ] Offline warning displays when disconnected
- [ ] Version conflict resolution working
- [ ] No duplicate updates or race conditions
- [ ] Performance acceptable (< 100ms sync time)

Once all checkboxes complete, Phase 5 (20-22) is DONE! 🎉
