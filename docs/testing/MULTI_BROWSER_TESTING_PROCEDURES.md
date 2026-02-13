# Multi-Browser Real-Time Sync Testing Procedures

## Test Environment Setup

### Prerequisites
- ✅ API Server running on port 3010
- ✅ Frontend running on port 3011
- ✅ Two browser windows side-by-side
- ✅ Browser consoles open (F12) to monitor WebSocket events

### Setup Steps
1. **Browser A (Left):** Chrome → http://localhost:3011
2. **Browser B (Right):** Chrome Incognito → http://localhost:3011
3. **Create/Open same production in both browsers**
4. **Position windows side-by-side for easier observation**

---

## Test 1: Production Settings Sync ✅ (VERIFIED WORKING)

### Steps
**Browser A:**
1. Navigate to Settings page
2. Change "Client Name" field
3. Click Save

### Expected Results
**Browser B:**
- ✅ Settings page updates immediately
- ✅ New client name visible without refresh
- ✅ Version number increments

### Console Logs to Verify
```
📡 Broadcasting production:updated to room production:{id}
📨 Received production:updated
🔀 Auto-merging production update
✅ Auto-merged production update
```

**Status:** ✅ PASSING

---

## Test 2: Checklist Item Sync 🐛 (ISSUES FOUND)

### Steps
**Browser A:**
1. Navigate to **Checklist** page
2. Click "Add Item" button
3. Type: "Multi-Browser Test Item"
4. Press Enter/Save
5. Click checkbox to mark item complete
6. Click checkbox again to mark incomplete

**Browser B:**
1. Navigate to **Checklist** page
2. Observe changes from Browser A
3. Try editing a checklist item
4. Try adding your own item

### Expected Results
- ✅ New items appear instantly in both browsers
- ✅ Checkbox state syncs in real-time
- ✅ Item edits sync across browsers
- ✅ Delete operations sync immediately
- ❌ Checklist groups don't all expand on page load
- ❌ Item edits don't trigger refresh warnings

### Console Logs to Verify
```
📡 checklist-item:created
📨 Received checklist-item:created
📡 checklist-item:updated
📨 Received checklist-item:updated
📡 checklist-item:deleted
📨 Received checklist-item:deleted
```

### 🐛 BUGS FOUND (Test 2)

#### Bug 2.1: Show Opens to Wrong Page
**Severity:** Medium  
**Repro Steps:**
1. From show list page, click on a show in Browser A
2. Observe which page opens

**ACTUAL:** Opens to Media Server page  
**EXPECTED:** Opens to Dashboard page  

**Impact:** Users land on wrong page, must manually navigate to dashboard

---

#### Bug 2.2: Checklist Page Conflict Warning (OLD BUG RETURNED)
**Severity:** High  
**Repro Steps:**
1. Open Checklist page in Browser A
2. Open Checklist page in Browser B

**ACTUAL:** 
- Conflict warning appears in Browser B
- All checklist groups expand automatically
- Warning suggests production data conflict

**EXPECTED:** 
- No conflict warning
- Groups respect user's collapsed/expanded preferences
- Preferences should be user-specific, not synced

**Root Cause Hypothesis:** 
Checklist group expand/collapse preferences are being synced across browsers as production data, but they should be stored per-user (localStorage or user settings table)

**Impact:** 
- Users get false conflict warnings
- All groups expand, losing user's organization
- Confusing UX - looks like data conflict when it's preferences

---

#### Bug 2.3: Checklist Item Edits Don't Sync
**Severity:** High  
**Repro Steps:**
1. In Browser A, click edit on any checklist item
2. Change the text
3. Save the edit
4. Observe Browser B

**ACTUAL:**
- Edit doesn't appear in Browser B
- No WebSocket event fired for edit
- Refreshing Browser A removes the edit (!!)

**EXPECTED:**
- Edit syncs to Browser B immediately
- Console shows `checklist-item:updated` event
- Refresh preserves the edit

**Impact:**
- Multi-user editing of checklist item text doesn't work
- Data loss on refresh (edits not saved to database)
- Critical blocker for collaborative use

**Related Working Features:**
- ✅ Add item - works cross-browser
- ✅ Delete item - works cross-browser
- ✅ Mark complete/incomplete - works cross-browser
- ❌ Edit item text - BROKEN

---

**Status:** ⚠️ PARTIAL PASS (3/4 features working, 1 critical failure)

---

## Test 3: Camera Sync 🎥

### Steps
**Browser A:**
1. Navigate to **Cameras** page
2. Click "Add Camera" button
3. Fill in camera details:
   - Name: "Test Camera 1"
   - Model: "Sony HDC-3500"
   - Serial: (optional)
4. Click Save

**Browser B:**
5. Verify camera appears in list

**Browser A:**
6. Click edit on "Test Camera 1"
7. Change name to: "Test Camera 1 - MODIFIED"
8. Save

**Browser B:**
9. Verify name updates without refresh

**Browser B:**
10. Delete "Test Camera 1"

**Browser A:**
11. Verify camera removed from list

### Expected Results
- ✅ Camera creation appears instantly in Browser B
- ✅ Camera edit syncs to Browser B without refresh
- ✅ Camera deletion syncs to Browser A
- ✅ Version numbers increment in console
- ✅ No duplicate cameras
- ✅ No orphaned data

### Console Logs to Verify
```
📡 Broadcasting camera:created to room production:{id}
📨 Received camera:created
📊 Version check: current: 1, incoming: 2
🔀 Auto-merging camera update
✅ Auto-merged camera update
📡 Broadcasting entity:deleted
📨 Received entity:deleted
```

**Status:** ✅ PASSING (Fixed 2026-02-12)

### 🐛 BUGS FOUND & FIXED (Test 3)

#### Bug 3.1: Camera Delete Not Persisting
**Severity:** High  
**Repro Steps:**
1. Create camera in Browser A
2. Delete camera in Browser A
3. Refresh browser

**ACTUAL:** Camera reappears after refresh  
**EXPECTED:** Camera stays deleted  

**Root Cause:** `handleDelete` only called local store deleteCamera, didn't call API  
**Fix:** Updated to call `camerasAPI.deleteCamera()` before updating local state  
**Commit:** 5d54e6e - "Fix camera delete to call API before updating local state"

---

#### Bug 3.2: Real-Time Sync Not Working
**Severity:** High  
**Repro Steps:**
1. Create camera in Browser A
2. Observe Browser B

**ACTUAL:** Camera only appears in Browser B after manual refresh  
**EXPECTED:** Camera appears instantly via WebSocket  

**Root Cause:** Camera API routes emitted `camera:created/updated/deleted` events but frontend listened for generic `entity:created/updated/deleted` events  
**Fix:** Updated cameras.ts to emit generic entity events matching sources.ts pattern  
**Commit:** c3b747f - "Fix camera WebSocket sync by using generic entity events"

---

**Test Completion Notes:**
- All camera CRUD operations now persist to database
- Real-time sync working across browsers without refresh
- Equipment library seeded with 133 items (3 cameras, 30 LED tiles, 26 routers, etc.)

---

## Test 4: Source Sync 📺

### Steps
**Browser A:**
1. Navigate to **Sources** (Computers) page
2. Click "Add Source"
3. Fill in:
   - Name: "Test Source 1"
   - Type: "Playback"
   - Resolution: "1920x1080"
4. Save

**Browser B:**
5. Verify source appears immediately

**Browser B:**
6. Edit "Test Source 1"
7. Change resolution to "3840x2160"
8. Change frame rate
9. Save

**Browser A:**
10. Verify changes appear without refresh

**Browser A:**
11. Delete source

**Browser B:**
12. Verify deletion

### Expected Results
- ✅ Source creation syncs instantly
- ✅ Property changes sync in real-time
- ✅ Deletion syncs immediately
- ✅ Version increments properly

**Status:** ⏳ PENDING TEST

---

## Test 5: Send Sync 📤

### Steps
**Browser A:**
1. Navigate to **Sends** (LED/Projection) page
2. Click "Add Send"
3. Fill in details:
   - Name: "Test Send 1"
   - Type: "LED Wall"
4. Save

**Browser B:**
5. Verify send appears

**Browser A:**
6. Edit send properties
7. Save

**Browser B:**
8. Verify updates appear

**Browser B:**
9. Delete send

**Browser A:**
10. Verify deletion

### Expected Results
- ✅ Send creation syncs instantly
- ✅ Updates sync in real-time
- ✅ Deletion syncs immediately

**Status:** ⏳ PENDING TEST

---

## Test 6: CCU Sync 🎛️

### Steps
**Browser A:**
1. Navigate to **CCUs** page
2. Add new CCU:
   - Name: "Test CCU 1"
   - Model: (select from dropdown)
3. Save

**Browser B:**
4. Verify CCU appears

**Browser B:**
5. Edit CCU settings
6. Save

**Browser A:**
7. Verify updates

**Browser A:**
8. Delete CCU

**Browser B:**
9. Verify deletion

### Expected Results
- ✅ CCU creation syncs instantly
- ✅ Updates sync in real-time
- ✅ Deletion syncs immediately

**Status:** ⏳ PENDING TEST

---

## Test 7: Signal Flow Connections 🔌

### Steps
**Browser A:**
1. Navigate to **Signal Flow** page
2. Create new connection (if UI available)
3. Save

**Browser B:**
4. Verify connection appears

**Browser A:**
5. Modify connection routing
6. Save

**Browser B:**
7. Verify changes appear

### Expected Results
- ✅ Connection creation syncs
- ✅ Routing changes sync
- ✅ Deletion syncs

**Status:** ⏳ PENDING TEST (depends on Signal Flow UI implementation)

---

## Test 8: Offline Mode & Reconnection 🔴

### Steps
**Browser A - Simulate Disconnect:**
1. Open DevTools (F12)
2. Switch to **Network** tab
3. Check **"Offline"** checkbox at top of tab

**Both Browsers - Observe:**
4. Connection indicator should turn **RED**
5. **"You are offline"** banner should appear

**Browser A (Still Offline):**
6. Try to add a camera
7. Note that change saves locally only

**Browser A - Reconnect:**
8. Uncheck **"Offline"** checkbox

**Both Browsers - Observe:**
9. Indicator goes **ORANGE** ("Reconnecting...")
10. Then **GREEN** ("Connected")
11. Pending changes sync automatically
12. Browser B receives the camera from step 6

### Expected Results
- ✅ Offline indicator appears immediately
- ✅ Red banner displays
- ✅ Local changes queue while offline
- ✅ Reconnection automatic
- ✅ Queued changes sync on reconnect
- ✅ No data loss

### Console Logs to Verify
```
🔌 WebSocket disconnected
⚠️ Connection lost - you are offline
🔄 WebSocket reconnecting...
✅ WebSocket connected
🔄 Syncing queued changes...
```

**Status:** ⏳ PENDING TEST

---

## Test 9: Version Conflict Resolution ⚠️

### Steps
**Setup:**
1. Open **Production Settings** in both browsers
2. Note current version number in console

**Browser B - Go Offline:**
3. DevTools → Network → Check **"Offline"**

**Browser A (Online):**
4. Change "Client Name" to "**Client AAA**"
5. Click Save
6. Version increments to **v2**

**Browser B (Offline):**
7. Change "Client Name" to "**Client BBB**"
8. Click Save (still thinks version is **v1**)
9. Uncheck **"Offline"** in Network tab

**Both Browsers - Observe:**
10. Conflict detection triggers
11. Auto-merge resolves conflict
12. Both browsers show **same** client name
13. Version numbers **match**

### Expected Results
- ✅ Conflict detected automatically
- ✅ Auto-merge uses latest version (v2)
- ✅ No data loss
- ✅ Both browsers consistent
- ✅ User notified of auto-merge

### Console Logs to Verify
```
⚠️ Version conflict detected: current=2, incoming=1
🔀 Auto-merging production update
✅ Conflict resolved - using version 2
📊 Version synchronized: both browsers at v2
```

**Status:** ⏳ PENDING TEST

---

## Test 10: Rapid Updates (Stress Test) 🚀

### Steps
**Browser A:**
1. Navigate to **Checklist** page
2. Find any checklist item with a checkbox
3. **Rapidly click checkbox 10 times** (fast as possible)
4. Count final version number in console

**Browser B - Observe:**
5. Checkbox state should stay in sync
6. Final state should match Browser A
7. No missing toggles
8. No duplicate toggles

### Expected Results
- ✅ All 10 updates process correctly
- ✅ Browser B stays in sync
- ✅ Final checkbox state matches both browsers
- ✅ Version increments from v1 → v10
- ✅ No skipped versions
- ✅ No race conditions

### Console Logs to Verify
```
📊 Version check: current: 1, incoming: 2
📊 Version check: current: 2, incoming: 3
📊 Version check: current: 3, incoming: 4
...
📊 Version check: current: 9, incoming: 10
✅ All updates processed successfully
```

**Status:** ⏳ PENDING TEST

---

## 🐛 Bug Summary

### Critical Bugs (Block Release)
1. **Bug 2.3** - Checklist item edits don't sync + data loss on refresh
   - Priority: P0 - CRITICAL
   - Blocks collaborative editing

### High Priority Bugs
2. **Bug 2.2** - Checklist page conflict warning (preferences syncing)
   - Priority: P1 - HIGH
   - Major UX issue, false warnings

### Medium Priority Bugs
3. **Bug 2.1** - Show opens to wrong page (Media Server instead of Dashboard)
   - Priority: P2 - MEDIUM
   - Navigation annoyance

---

## Test Completion Checklist

- [x] Test 1: Production Settings - ✅ PASSING
- [x] Test 2: Checklist Items - ⚠️ PARTIAL (3 bugs found)
- [ ] Test 3: Camera Sync
- [ ] Test 4: Source Sync
- [ ] Test 5: Send Sync
- [ ] Test 6: CCU Sync
- [ ] Test 7: Signal Flow Connections
- [ ] Test 8: Offline Mode
- [ ] Test 9: Version Conflicts
- [ ] Test 10: Rapid Updates

**Overall Progress:** 2/10 tests completed (20%)

---

## Quick Reference Commands

### Check WebSocket Connection
```bash
# In browser console:
console.log('WebSocket Status:', window.socket?.connected)
```

### Test API Endpoint Directly
```bash
# Create test camera
curl -X POST http://localhost:3010/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-'$(date +%s)'",
    "productionId": "YOUR_PROD_ID",
    "name": "API Test Camera",
    "model": "Test Model",
    "lastModifiedBy": "test-script"
  }'
```

### Monitor WebSocket Events
```javascript
// In browser console - log all WebSocket events:
window.socket.onAny((event, ...args) => {
  console.log(`📡 Event: ${event}`, args);
});
```

### Check Version Numbers
```javascript
// In browser console - check entity version:
const production = /* your production object */;
console.log('Current version:', production.version);
console.log('Field versions:', production.fieldVersions);
```

---

## Notes

- All tests should complete in under 100ms sync time
- Console logs are critical for debugging
- Version numbers must increment monotonically
- No page refreshes should be required
- Connection indicator must be accurate at all times

---

**Last Updated:** 2026-02-12  
**Tested By:** Kevin  
**Test Session:** Multi-Browser Sync Phase 5
