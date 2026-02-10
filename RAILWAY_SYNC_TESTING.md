# Multi-Browser Sync Testing - Railway Production

**Testing Environment:** Railway Production Servers  
**Date:** February 9, 2026  
**Status:** Ready for Testing

---

## 🌐 Railway URLs

- **Frontend:** https://videodept-production.up.railway.app
- **API:** https://videodept-api-production.up.railway.app
- **Health Check:** https://videodept-api-production.up.railway.app/health ✅

---

## 🎯 Test Setup (Simple!)

### 1. Open Two Browser Windows

Choose one of these methods:

**Option A: Two Different Browsers**
- **Browser A:** Chrome → https://videodept-production.up.railway.app
- **Browser B:** Firefox → https://videodept-production.up.railway.app

**Option B: Same Browser + Incognito**
- **Browser A:** Chrome Regular → https://videodept-production.up.railway.app
- **Browser B:** Chrome Incognito → https://videodept-production.up.railway.app

**Option C: Two Chrome Windows (Easiest)**
- **Browser A:** Chrome Tab 1 → https://videodept-production.up.railway.app
- **Browser B:** Chrome Tab 2 → https://videodept-production.up.railway.app
- Place side-by-side for easy comparison

### 2. Navigate to Same Production

1. In **Browser A**: Open or create a production
2. Note the production ID from the URL: `/production/[PRODUCTION_ID]`
3. In **Browser B**: Navigate to the same production ID
4. Verify connection indicator shows "Connected" (green) in both browsers

### 3. Open Browser DevTools (Optional)

- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- Watch the Console tab for WebSocket events
- Look for messages like:
  - ✅ WebSocket connected
  - 📡 Broadcasting entity:updated
  - 📨 Received entity:updated

---

## 🧪 Test Scenarios

### ✅ Test 1: Production Settings Sync (Already Working)

**Status:** Verified ✅  
**Skip this test** - already confirmed working

---

### Test 2: Checklist Item Sync 📋

**Browser A Actions:**
1. Navigate to **Checklist** page
2. Click **"+ Add Item"** button
3. Type: "Test Real-Time Sync"
4. Click **Save** (or press Enter)
5. **Check the box** to mark it complete

**Browser B - What You Should See:**
- ✨ New item appears **instantly** (no refresh needed)
- ☑️ Checkbox state updates in **real-time** when toggled in Browser A

**Pass Criteria:**
- ✅ Item appears in Browser B within 1 second
- ✅ Checkbox toggles sync between browsers
- ✅ No page refresh required

**If It Fails:**
- Check console for WebSocket errors
- Verify both browsers show "Connected" indicator
- Try refreshing Browser B and testing again

---

### Test 3: Camera Sync 🎥

**Browser A Actions:**
1. Navigate to **Cameras** page
2. Click **"+ Add Camera"**
3. Name it: "Camera 1 - Sync Test"
4. Add any additional details
5. Click **Save**
6. Now **edit** the camera name to: "Camera 1 - Modified"
7. Click **Save** again

**Browser B - What You Should See:**
- ✨ New camera appears **instantly** after step 5
- ✏️ Name change appears **instantly** after step 7

**Pass Criteria:**
- ✅ Camera creation syncs immediately
- ✅ Camera updates sync immediately
- ✅ No manual refresh needed

---

### Test 4: Source Sync 💻

**Browser A Actions:**
1. Navigate to **Sources** (Computers) page
2. Click **"+ Add Source"**
3. Fill in source details (name, type, resolution)
4. Click **Save**
5. **Edit** a property (e.g., change resolution)
6. Click **Save**

**Browser B - What You Should See:**
- ✨ New source appears **instantly**
- 🔄 Property changes update **in real-time**

**Pass Criteria:**
- ✅ Source creation syncs immediately
- ✅ Source updates sync immediately

---

### Test 5: Send Sync 📤

**Browser A Actions:**
1. Navigate to **Sends** (LED/Projection/Monitors) page
2. Click **"+ Add Send"**
3. Fill in details
4. Click **Save**
5. **Edit** properties
6. Click **Save**

**Browser B - What You Should See:**
- ✨ New send appears **instantly**
- 🔄 Updates propagate **in real-time**

**Pass Criteria:**
- ✅ Send creation syncs immediately
- ✅ Send updates sync immediately

---

### Test 6: CCU Sync 🎛️

**Browser A Actions:**
1. Navigate to **CCUs** page
2. Click **"+ Add CCU"**
3. Fill in CCU details
4. Click **Save**
5. **Edit** CCU settings
6. Click **Save**

**Browser B - What You Should See:**
- ✨ New CCU appears **instantly**
- 🔄 Settings updates sync **in real-time**

**Pass Criteria:**
- ✅ CCU creation syncs immediately
- ✅ CCU updates sync immediately

---

### Test 7: Connection Sync 🔌

**Browser A Actions:**
1. Navigate to **Signal Flow** page
2. Create a new connection between devices
3. Modify the routing

**Browser B - What You Should See:**
- ✨ New connection appears **instantly**
- 🔄 Routing changes update **live**

**Pass Criteria:**
- ✅ Connection creation syncs immediately
- ✅ Connection updates sync immediately

---

### Test 8: Offline Warning 🔴

**This Test Requires Railway API to Go Down**

**Important:** We cannot actually stop the Railway API server (it's production!), so this test can only verify the **UI exists** for offline detection.

**What to Check:**
1. Look for the **Offline Warning Component** in the UI
2. Connection status indicator should show current state
3. Skip the actual "disconnect" test for production

**Alternative Test - Network Simulation:**
1. In **Browser A** DevTools:
   - Open Network tab
   - Click "Offline" checkbox (simulates network loss)
2. Should see:
   - 🔴 Red "Disconnected" banner appears
   - Status changes to offline
3. Uncheck "Offline":
   - 🟢 Should reconnect automatically
   - Banner disappears

**Pass Criteria:**
- ✅ Offline simulation triggers disconnected state
- ✅ Reconnection works automatically
- ✅ User sees clear offline indicator

---

### Test 9: Version Conflict Resolution ⚠️

**Complex Test - Skip if Using Same Browser**

This test requires actual network disconnection. **Skip for now** or test with:

1. Two different devices (laptop + phone)
2. Turn off WiFi on one device
3. Make conflicting changes
4. Reconnect and verify conflict resolution

**Pass Criteria:**
- ✅ Conflicts detected when versions mismatch
- ✅ Auto-merge resolves conflicts
- ✅ User sees consistent state after resolution

---

### Test 10: Rapid Updates 🚀

**Browser A Actions:**
1. Go to **Checklist** page
2. Find a checklist item
3. **Rapidly click** the checkbox 5-10 times quickly
4. Watch Browser B

**Browser B - What You Should See:**
- ☑️ Checkbox toggles with each click
- 🚫 **NO** duplicate updates or flickering
- ✅ Final state matches Browser A
- 📈 Version numbers increment correctly (check console)

**Pass Criteria:**
- ✅ All rapid clicks sync to Browser B
- ✅ No duplicates or race conditions
- ✅ Final state consistent across browsers
- ✅ Sync latency < 500ms

---

## 🐛 Troubleshooting

### Issue: "Changes not appearing in Browser B"

**Check:**
1. ✅ Connection indicator shows "Connected" (green) in both browsers
2. ✅ Both browsers on same production (check URL)
3. ✅ Browser console for WebSocket errors (F12 → Console)
4. ✅ Railway API health: https://videodept-api-production.up.railway.app/health

**Try:**
- Refresh both browsers
- Close and reopen browsers
- Check Railway deployment status

---

### Issue: "WebSocket connection failed"

**Check Console for:**
```
❌ WebSocket error: ...
🔴 Connection failed
```

**Possible Causes:**
- Railway WebSocket not configured properly
- CORS policy blocking connection
- Railway deployment in progress

**Try:**
- Wait 30 seconds and refresh
- Check Railway deployment logs
- Verify API is responding: curl https://videodept-api-production.up.railway.app/health

---

### Issue: "Seeing duplicate updates"

**This indicates a bug!** Document:
- Which entity type (checklist, camera, etc.)
- What action triggered it
- Console logs showing duplicates
- Steps to reproduce

---

## ✅ Success Criteria

**Phase 5 Complete When:**
- ✅ All 7 main tests pass (Tests 2-7, 10)
- ✅ Changes sync within 500ms
- ✅ No page refresh required for any entity
- ✅ Connection indicator accurate
- ✅ No duplicate updates
- ✅ Console shows proper event flow

**Optional Tests (8, 9):** Can skip or test with limitations

---

## 📊 Test Results Template

**Copy this and fill out as you test:**

```markdown
## Test Results - [Your Name] - [Date]

### Environment
- Browser A: [Chrome/Firefox/Safari]
- Browser B: [Chrome/Firefox/Safari]  
- Production ID: [ID from URL]

### Test 2: Checklist Items
- [ ] PASS / [ ] FAIL
- Notes: 

### Test 3: Cameras
- [ ] PASS / [ ] FAIL
- Notes:

### Test 4: Sources
- [ ] PASS / [ ] FAIL
- Notes:

### Test 5: Sends
- [ ] PASS / [ ] FAIL
- Notes:

### Test 6: CCUs
- [ ] PASS / [ ] FAIL
- Notes:

### Test 7: Connections
- [ ] PASS / [ ] FAIL
- Notes:

### Test 8: Offline Warning (Simulated)
- [ ] PASS / [ ] FAIL
- Notes:

### Test 10: Rapid Updates
- [ ] PASS / [ ] FAIL
- Notes:

### Overall Status
- [ ] ALL TESTS PASSED - Phase 5 COMPLETE! 🎉
- [ ] Some tests failed - details above
- [ ] Need assistance with: 
```

---

## 🎯 Ready to Begin!

1. Open two browser windows to: https://videodept-production.up.railway.app
2. Navigate to the same production in both
3. Start with **Test 2: Checklist Items**
4. Work through tests in order
5. Document results in template above

**Good luck!** 🚀
