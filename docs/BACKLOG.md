# Backlog

_Deferred tasks, historical detail, and someday/maybe items._
_Moved here from TODO_NEXT_SESSION.md on 2026-03-16 to reduce startup context size._

---

## 🟠 Camera/CCU Integration Testing (Phase 10 verification)

All implementation done — these are the outstanding verification tests:

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

## 🟠 Railway: Switch to New GitHub Repo

Railway still connected to old repo `kashea24/VideoDept`, target is `vant-ks/VideoDept`.

- [ ] Update Railway project to connect to `vant-ks/VideoDept`
- [ ] Verify deployment triggers on `main` branch pushes
- [ ] Test production health endpoint after redeployment
- [ ] Update any docs with new Railway URL if it changed

---

## 🟠 Multi-Browser Sync Testing (Phase 5 — 10 scenarios)

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

## 🟡 Sync Hooks: Wire into Remaining Page Components

Pages still using manual state instead of sync hooks:

- [ ] `Checklist.tsx` → `useChecklistItemSync`
- [ ] `Cameras.tsx` → `useCameraSync`
- [ ] `CCUs.tsx` → `useCCUSync`
- [ ] `Computers.tsx` / Media Servers → `useSourceSync`
- [ ] Sends pages (LED, Projection) → `useSendSync`

---

## 🟡 Update Remaining API Routes with Sync Helpers

- [ ] `ip-addresses.ts` — add `broadcastEntityUpdate/Created` + `last_modified_by`
- [ ] Audit `sources.ts` — verify fully using sync-helpers

---

## 🟡 Documentation Tasks

- [ ] `SYNC_RULES.md` — WebSocket event naming, conflict strategy
- [ ] `ARCHITECTURE_SYNC.md` — data flow diagrams, component integration guide
- [ ] `DEVELOPER_TESTING_GUIDE.md` — how to add sync to new entity types

---

## 🟢 Optional / Future

- [ ] Equipment compatibility matrix — `equipment_compatibility` DB table (spec_uuid_a, spec_uuid_b, relationship_type, notes); "Compatible With" panel in Equipment Library UI
- [ ] Field-edit indicators (Google Sheets style — show who's editing which field)
- [ ] Offline change queue (save locally, sync on reconnect)
- [ ] Redis adapter for Socket.io (multi-server/horizontal scaling)
- [ ] Service workers for offline support (background sync, cache strategies)
- [ ] Production Checklist feature — activates 48hrs before load-in; separate from pre-production checklist

---

## 🗂️ Historical: Phase 5 QA Checklist (v0.1 era)

_These were the "done" criteria for Phase 5 sync work. Preserved for reference._

Phase 5 is complete when:
- [ ] All 10 multi-browser tests pass
- [ ] All entity types sync in real-time
- [ ] Connection status UI accurate
- [ ] Offline warnings work
- [ ] No race conditions or duplicate updates
- [ ] Performance < 100ms sync latency
- [ ] Documentation complete
- [ ] Component integration done
- [ ] Final QA passed
