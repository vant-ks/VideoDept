# TODO List - Next Work Session

## 📍 Current Branch Structure
- **`v0.1_sends`** — long-running parent branch for all sends-related work. DO NOT merge to main until explicitly instructed.
- **`v0.1.2_toDosCatchUp`** ← you are here. Branch off `v0.1_sends`. Merge into `v0.1_sends` when done.

---

## 🔴 PRIORITY 1 — Schema Drift Resolution (Camera/CCU)

**Status:** Unresolved — blocks adding `sort_order` to CCUs and any future migrations  
**Risk:** Running `migrate dev` without resolving drift will prompt Prisma to wipe the entire DB

**Steps:**
1. Run `npx prisma migrate status` in `video-production-manager/api`
2. Review which DB objects are not in migration history
3. Get explicit Kevin approval before proceeding
4. Create baseline migration OR use `prisma db push` (dev only)
5. After resolved: add `sort_order Int @default(0)` to `ccus` model and migrate safely

---

## 🔴 PRIORITY 2 — Camera/CCU Integration Testing (Phase 10)

All implementation is done. These are verification tests:

- [ ] Add a Camera → persists after page refresh
- [ ] Add Camera in Browser A → appears in Browser B within ~1 second (WebSocket)
- [ ] Edit a Camera → persists after refresh
- [ ] Delete a Camera → disappears in all browsers
- [ ] Select equipment spec on Camera → `equipment_uuid` saved in DB
- [ ] Assign CCU to Camera → `ccu_id` and `ccu_uuid` saved in DB
- [ ] Add/Edit/Delete CCU → all persist and sync
- [ ] CCU card shows linked camera count badge
- [ ] All operations work on Railway (production) as well as local dev

---

## 🟠 PRIORITY 3 — Railway Deployment: Switch to New GitHub Repo

**Issue:** Railway still connected to old repo `kashea24/VideoDept`  
**Target:** `vant-ks/VideoDept`

- [ ] Update Railway project to connect to `vant-ks/VideoDept`
- [ ] Verify deployment triggers on `main` branch pushes
- [ ] Test production health endpoint after redeployment
- [ ] Update any docs with new Railway URL if it changed

---

## 🟠 PRIORITY 4 — Multi-Browser Sync Testing (Phase 5 — 10 Scenarios)

Run all scenarios from `MULTI_BROWSER_SYNC_TEST.md`:

- [ ] Test 1: Production Settings Sync
- [ ] Test 2: Checklist Item Sync
- [ ] Test 3: Camera Sync
- [ ] Test 4: Source Sync
- [ ] Test 5: Send Sync (LED / Projection / Monitor)
- [ ] Test 6: CCU Sync
- [ ] Test 7: Connection/Signal Flow Sync
- [ ] Test 8: Offline Warning (red banner on disconnect, orange→green on reconnect)
- [ ] Test 9: Conflict Resolution (stale version merge)
- [ ] Test 10: Performance — rapid toggles, sync latency < 100ms

Document results in `docs/PHASE_5_TEST_RESULTS.md`

---

## 🟡 PRIORITY 5 — Production Checklist Feature

**Goal:** Second checklist that activates 48 hrs before load-in

- Pre-Production Checklist (current): planning → 48 hrs before load-in
- Production Checklist (new): on-site activities — setup, testing, rehearsal, show day, strike
- Needs: trigger mechanism design (manual vs. date-based), category set for production phase

---

## 🟡 PRIORITY 6 — Sync Hooks: Wire into Remaining Page Components

Pages still using manual state instead of sync hooks:

- [ ] `Checklist.tsx` → `useChecklistItemSync`
- [ ] `Cameras.tsx` → `useCameraSync`
- [ ] `CCUs.tsx` → `useCCUSync`
- [ ] `Computers.tsx` / Media Servers → `useSourceSync`
- [ ] Sends pages (LED, Projection) → `useSendSync`

---

## 🟡 PRIORITY 7 — Update Remaining API Routes with Sync Helpers

- [ ] `ip-addresses.ts` — add `broadcastEntityUpdate/Created` + `last_modified_by`
- [ ] Audit `sources.ts` — verify fully using sync-helpers

---

## 🟢 LOW / OPTIONAL

- [ ] `apiClient.ts` — add Camera/CCU methods for consistency with Equipment (currently using hooks directly — functionally fine)
- [ ] `SYNC_RULES.md` — document WebSocket event naming, conflict strategy
- [ ] `ARCHITECTURE_SYNC.md` — data flow diagrams, component integration guide
- [ ] `DEVELOPER_TESTING_GUIDE.md` — how to add sync to new entity types
- [ ] Field-edit indicators (Google Sheets style — show who's editing which field)
- [ ] Offline change queue (save locally, sync on reconnect)

---

## ✅ COMPLETED THIS SESSION (2026-03-01)

### Monitors + Equipment Port Sync — Branch `v0.1.1_sends-monitors` → merged to `main`

**Bug 1 — Equipment edits silently failing (category enum mismatch)**
- `transformApiEquipment` lowercases category; edit modal sent lowercase back; Prisma 500'd silently
- Fix: `toEquipmentCategoryEnum()` in PUT/POST handlers; uppercase category init in `EquipmentFormModal`
- Commits: `cb4e4ec`

**Bug 2 — New ports not appearing in Monitor edit modal**
- `parseConnectorRouting` returned saved JSON verbatim, ignoring spec changes
- Fix: always start from `initConnectorRouting(spec)`, merge saved signal assignments over it
- Also: removed `length === 0` guard on `fetchFromAPI()` — always fetch fresh on mount
- Commit: `8bbaf9c`

**Bug 3 — Port changes require manual refresh in other tabs**
- Monitors never subscribed to `equipment:updated` socket event
- Fix: added same listener pattern as `Equipment.tsx`
- Commit: `4a091a9`

---

## ✅ COMPLETED: Media Server Creation Fixed (2026-02-26)

**Status:** RESOLVED  
**Root Cause:** Spread operator violation (Rule #6)  
**Fix:** Commit `75f7ea0` - Replace spread operators with explicit field lists

### What Was Fixed
Media servers were appearing briefly then disappearing due to 500 error on creation.

**Root Cause Identified:**
- `useProjectStore.ts` was using `...mainServer` and `...backupServer` spreads
- Violated PROJECT_RULES.md Rule #6: "NO SPREAD OPERATORS ON INPUT"
- When transformation fails, strings iterate character-by-character: `{0:'M', 1:'e', 2:'d'...}`
- Prisma rejected with "Invalid invocation" showing numeric keys

**Fix Applied:**
- Replaced spread operators with explicit field lists in `addMediaServerPair()`
- Matched pattern from working entities (cameras, sources, ccus)
- Explicitly listed: id, name, pairNumber, isBackup, platform, outputs, note

**Files Changed:**
- `video-production-manager/src/hooks/useProjectStore.ts` (lines 1518-1532)
- `video-production-manager/DEVLOG.md` (added root cause analysis)

**Testing Status:** Ready for verification
1. Open Media Servers page
2. Click "Add Media Server Pair"
3. Configure platform and outputs
4. Save and verify both A and B servers persist
5. Refresh page and confirm servers still present

**Lessons Learned:**
- Research pattern: Compare working entities → Find differences → Apply same pattern
- Git history invaluable: commit `908983a` showed computers fix, `daf68ff` showed working media servers
- Rule #6 is critical: Never spread objects going to API, always explicit field lists

### Debug Commands for Next Session
```bash
# Check what's in the database
cd video-production-manager/api
npx prisma studio

# Watch API logs in real-time
cd video-production-manager/api
npm run dev
# Then create media server and watch console

# Check media_servers table structure
npx prisma db execute --stdin <<< "SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'media_servers' AND table_schema = 'public' ORDER BY ordinal_position;"
```

### Key Files to Review
- `video-production-manager/DEVLOG.md` - historical working states
- `video-production-manager/src/hooks/useProjectStore.ts` - frontend CRUD
- `video-production-manager/api/src/routes/media-servers.ts` - API routes
- `video-production-manager/api/prisma/schema.prisma` - database schema
- Git history around computers bug fix

---

## 🚀 DEPLOYMENT: Update Railway to New GitHub Repository

**Issue:** Railway production server still connected to old GitHub repo (kashea24/VideoDept)  
**New Repo:** https://github.com/vant-ks/VideoDept  
**Status:** Deferred for later session  
**Tasks:**
- [ ] Update Railway project to connect to vant-ks/VideoDept repository
- [ ] Verify deployment triggers on main branch pushes
- [ ] Test production health endpoint after redeployment
- [ ] Update any documentation with new Railway URL (if changed)

---

## �🚀 NEW FEATURE: Production Checklist (Post Load-In)

**Goal:** Create a separate "production checklist" that activates 48 hours before load-in

**Pre-Production Checklist** (Current):
- All existing categories: SCREENS, SWITCH, IMAG, MEDIA_SERVERS, SOURCES, DESTINATIONS, DISPLAYS, OUTSIDE_VENDORS, DOCUMENTATION
- Active from initial planning through 48hrs before load-in

**Production Checklist** (New):
- Activates at 48hrs before load-in
- Covers on-site activities: setup, testing, rehearsal, show day, strike
- Should reference/include pre-production checklist data

**Implementation Options:**
1. **Summary Statement:** Add a summary of pre-production checklist completion status to production checklist
2. **View-Only Modal:** Add button to open pre-production checklist in read-only modal (like a log viewer)

**Technical Notes:**
- Need to determine trigger mechanism (manual switch vs automatic based on load-in date)
- Consider checklist versioning/archiving
- May need new category set for production phase activities

---

## ✅ COMPLETED: Reset App Server Restart Fix

**Issue:** Reset App "Restart API Server" button was failing with 404  
**Fix:** Added POST `/api/server/restart` endpoint to server.ts  
**Commit:** `90832d9` - "feat: add server restart endpoint for Reset App tool"  
**Note:** Endpoint gracefully shuts down server. When run via `npm run dev` (tsx watch), process must be manually restarted. Auto-restart only works in development terminal, not VS Code background tasks.

---

## 🎯 Priority 1: Multi-Browser Sync Testing (Phase 5 Validation)

### Execute All Test Scenarios from MULTI_BROWSER_SYNC_TEST.md

- [ ] **Test 1: Production Settings Sync** 
  - Already verified working ✅
  - Re-test to confirm still working after route updates

- [ ] **Test 2: Checklist Item Sync**
  - Create checklist item in Browser A
  - Verify appears instantly in Browser B
  - Toggle completion state
  - Verify WebSocket events: `checklist-item:created`, `checklist-item:updated`

- [ ] **Test 3: Camera Sync**
  - Add camera in Browser A
  - Update camera properties
  - Verify real-time sync in Browser B
  - Check console logs for `camera:created`, `camera:updated`

- [ ] **Test 4: Source Sync**
  - Navigate to Computers/Sources page
  - Add and edit sources
  - Verify instant propagation

- [ ] **Test 5: Send Sync**
  - Test LED/Projection/Monitor sends
  - Create and update in Browser A
  - Verify Browser B updates immediately

- [ ] **Test 6: CCU Sync**
  - Add and modify CCUs
  - Check real-time updates

- [ ] **Test 7: Connection Sync**
  - Create signal flow connections
  - Verify routing changes sync

- [ ] **Test 8: Offline Warning**
  - Stop API server
  - Verify red banner appears: "You are offline"
  - Restart server
  - Verify reconnection indicator (orange → green)

- [ ] **Test 9: Conflict Resolution**
  - Disconnect Browser B
  - Make changes in Browser A (version increments)
  - Make conflicting changes in Browser B (stale version)
  - Reconnect Browser B
  - Verify auto-merge resolves conflict

- [ ] **Test 10: Performance Testing**
  - Rapid toggle checklist items (5-10 times fast)
  - Verify no duplicate updates
  - Check version numbers increment correctly
  - Confirm sync latency < 100ms

### Testing Documentation

- [ ] Document test results in a new file `PHASE_5_TEST_RESULTS.md`
- [ ] Screenshot/record any issues found
- [ ] Note console logs for successful vs failed scenarios
- [ ] Performance metrics (sync latency measurements)

---

## 📚 Documentation Phase (23-24)

### Rules Documentation

- [ ] **Create SYNC_RULES.md**
  - Version increment rules
  - Conflict resolution strategy
  - WebSocket event naming conventions
  - When to use which sync utility function
  - Error handling patterns

- [ ] **Update API Documentation**
  - Document `last_modified_by` field in all entity endpoints
  - Version tracking requirements
  - WebSocket event schemas for each entity type
  - Conflict detection HTTP 409 responses

- [ ] **Create ARCHITECTURE_SYNC.md**
  - Overview of sync architecture
  - Data flow diagrams (WebSocket → Store → UI)
  - Component integration guide
  - Hook usage patterns (useEntitySync)

### Testing Guides

- [ ] **Enhance MULTI_BROWSER_SYNC_TEST.md**
  - Add actual test results
  - Screenshots of successful syncs
  - Common failure patterns and solutions

- [ ] **Create DEVELOPER_TESTING_GUIDE.md**
  - How to test new entity types
  - Adding sync to new routes (step-by-step)
  - Debugging WebSocket issues
  - Using browser dev tools for sync debugging

---

## �️ Bug Fixes & Improvements

### Reset App Service - Server Restart
- [ ] **Fix "Restart API Server" button**
  - Currently fails when server is already down
  - Should handle ECONNREFUSED gracefully
  - Possibly use direct process management instead of HTTP endpoint
  - Consider: `pkill -9 -f 'tsx watch' && npm run dev` approach

---

## �🔧 Component Integration (Outstanding Work)

### Integrate Entity Sync Hooks into UI Components

- [ ] **Checklist Page** (`src/pages/Checklist.tsx`)
  - Import and use `useChecklistItemSync`
  - Handle real-time updates in list view
  - Update local state when sync events received

- [ ] **Cameras Page** (`src/pages/Cameras.tsx`)
  - Integrate `useCameraSync`
  - Update camera list on `camera:created` events
  - Handle camera edits from other users

- [ ] **Sources Pages** (Computers, Media Servers)
  - Integrate `useSourceSync`
  - Real-time list updates

- [ ] **Sends Pages** (LED, Projection, Monitors)
  - Integrate `useSendSync`
  - Sync send property changes

- [ ] **CCUs Page** (`src/pages/CCUs.tsx`)
  - Integrate `useCCUSync`
  - Real-time CCU updates

- [ ] **Signal Flow/Connections Page**
  - Integrate `useConnectionSync`
  - Update connection routing in real-time

### Update Remaining Routes

- [ ] **Verify sources.ts route**
  - Check if properly using sync-helpers
  - Update if needed (seemed to have some sync already)

- [ ] **Update ip-addresses route**
  - Add sync-helpers imports
  - Implement broadcastEntityUpdate/Created
  - Add last_modified_by tracking

- [ ] **Test all route updates**
  - Verify no TypeScript errors
  - Check Prisma client up to date
  - Test each endpoint with curl

---

## 🏁 Final QA Phase (25)

### Complete System Validation

- [ ] **End-to-End User Flow Testing**
  - Create new production
  - Add sources, sends, cameras, CCUs
  - Create connections
  - Add checklist items
  - Verify all operations sync across browsers

- [ ] **Performance Testing**
  - Measure WebSocket message latency
  - Test with multiple concurrent users (3-5 browsers)
  - Check for memory leaks (long-running sessions)
  - Database query performance

- [ ] **Error Handling Validation**
  - Network disconnection/reconnection
  - API server crashes and restarts
  - Invalid data handling
  - Concurrent edit scenarios

- [ ] **Browser Compatibility**
  - Chrome (primary)
  - Firefox
  - Safari
  - Edge

- [ ] **Mobile/Responsive Testing**
  - Test on mobile browsers
  - Verify sync works on smaller screens
  - Check touch interactions

### Code Quality

- [ ] **Code Review**
  - Review all sync-helpers usage
  - Check for code duplication
  - Verify error handling patterns
  - TypeScript type safety

- [ ] **Clean Up**
  - Remove debug console.logs (or gate behind debug flag)
  - Remove test data from database
  - Update .gitignore if needed

---

## 🐛 Bug Fixes & Issues

### Known Issues to Address

- [ ] **Checklist item update endpoint issue**
  - PUT endpoint was failing in testing
  - Need to debug prepareVersionedUpdate interaction
  - Test update operations thoroughly

- [ ] **Field-level versioning for productions**
  - Productions have `field_versions` JSON field
  - Verify this works with new sync system
  - May need special handling

---

## 🚀 Optional Enhancements (Future Work)

### Phase 4.4: Field Edit Indicators (Google Sheets Style)

- [ ] Real-time field locking/indication
- [ ] Show who's editing which field
- [ ] Colored borders around active fields
- [ ] User avatars next to fields being edited

### Advanced Features

- [ ] Offline queue for changes (save locally, sync when reconnected)
- [ ] Undo/redo with real-time sync
- [ ] Conflict resolution UI (manual merge interface)
- [ ] Activity feed showing all changes
- [ ] User audit trails
- [ ] Export/import sync state

---

## 📋 Checklist Before "Done"

Phase 5 (20-22) is complete when:

- [ ] All 10 multi-browser tests pass
- [ ] All entity types sync in real-time
- [ ] Connection status UI accurate
- [ ] Offline warnings work
- [ ] No race conditions or duplicate updates
- [ ] Performance < 100ms sync latency
- [ ] Documentation complete (rules + testing)
- [ ] Component integration done
- [ ] Final QA passed
- [ ] No critical bugs

---

## 🎓 Learning/Investigation

- [ ] Review WebSocket scalability
  - How many concurrent connections can Socket.io handle?
  - Load testing with many users
  
- [ ] Investigate Redis adapter for Socket.io
  - Multi-server deployment
  - Horizontal scaling

- [ ] Consider service workers for offline support
  - Background sync
  - Cache strategies

---

## Next Session Priority Order

1. **Execute multi-browser tests** (HIGHEST - validates Phase 5)
2. **Fix any bugs found in testing**
3. **Integrate sync hooks into UI components**
4. **Complete documentation** (rules + architecture)
5. **Final QA testing**
6. **Code cleanup and polish**

---

**Start here next time:** Open two browsers and run Test 2 (Checklist Item Sync) from MULTI_BROWSER_SYNC_TEST.md
