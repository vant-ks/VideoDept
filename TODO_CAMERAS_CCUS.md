# TODO: Camera & CCU Feature Branch
**Branch:** `feature/cameras-ccus`  
**Base reference:** Computers page pattern (fully implemented)  
**Date opened:** 2026-02-28

---

## Overview

Cameras and CCUs already have API routes and WebSocket broadcasts wired up, but several layers of the implementation are incomplete or broken relative to the Computers/Sources reference pattern. The work below is ordered from foundational (data layer) to polish (UX).

---

## Phase 1 — Fix Broken API Call Signatures (CCUs)

The `CCUs.tsx` page is calling `useCCUsAPI` hooks with the **wrong number of arguments**, passing `productionId` as an extra leading arg that doesn't exist in the hook signatures. This silently mis-routes data.

- [ ] **`CCUs.tsx` — Fix `createCCU` call**
  - Current: `ccusAPI.createCCU(productionId!, ccuData)`
  - Fix: `ccusAPI.createCCU({ ...ccuData, productionId })`
- [ ] **`CCUs.tsx` — Fix `updateCCU` call**
  - Current: `ccusAPI.updateCCU(productionId!, editingCCU.id, formData)`
  - Fix: `ccusAPI.updateCCU(editingCCU.id, { ...formData, productionId })`
- [ ] **`CCUs.tsx` — Fix `deleteCCU` call**
  - Current: `ccusAPI.deleteCCU(productionId!, id)`
  - Fix: `ccusAPI.deleteCCU(id)`
- [ ] **Test:** Save a CCU and confirm it persists in DB (not just Zustand)

---

## Phase 2 — Expand `useCCUsAPI` Input Types

`CreateCCUInput` only has `name` and `note`. The DB `ccus` table has many more fields that the form already collects but can't persist.

- [ ] **`useCCUsAPI.ts` — Expand `CreateCCUInput`** to include:
  - `manufacturer?: string`
  - `model?: string`
  - `formatMode?: string`
  - `fiberInput?: string`
  - `referenceInput?: string`
  - `outputs?: any[]`
  - `equipmentUuid?: string`
- [ ] **`useCCUsAPI.ts` — Update `createCCU` requestData** to pass all new fields through to the API
- [ ] **`useCCUsAPI.ts` — Update `updateCCU` requestData** to include all new fields

---

## Phase 3 — Fetch From API on Mount (Both Pages)

Both Camera and CCU pages currently rely on the Zustand store for initial data. They should load directly from the DB on mount (like the Computers page does with `fetchSources(productionId)`).

- [ ] **`Cameras.tsx` — Add fetch on mount**
  ```tsx
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      camerasAPI.fetchCameras(productionId)
        .then(data => setLocalCameras(data))
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);
  ```
- [ ] **`CCUs.tsx` — Add fetch on mount**
  ```tsx
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      ccusAPI.fetchCCUs(productionId)
        .then(data => setLocalCCUs(data))
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);
  ```

---

## Phase 4 — Remove Double State Updates (Cameras)

After saving, `Cameras.tsx` calls both the API AND manually calls `addCamera(newCamera)` / `updateCamera(result.id, result)`. This causes a race condition with the WebSocket event that also updates state. The WebSocket duplicate-detection code catches *some* of this, but it's fragile.

- [ ] **`Cameras.tsx` — After `createCamera()`: remove `addCamera(newCamera)` call**
  - Use optimistic local state update (`setLocalCameras(prev => [...prev, newCamera])`) OR let WebSocket handle it exclusively (Computers pattern)
- [ ] **`Cameras.tsx` — After `updateCamera()`: remove `updateCamera(result.id, result)` call**
  - Let WebSocket `entity:updated` event handle the state update
- [ ] **Verify:** WebSocket events update `localCameras` state correctly without duplication

---

## Phase 5 — Equipment Spec Picker (Camera Form)

The `cameras` table has an `equipment_uuid` FK to `equipment_specs`. The Camera form should let users pick a camera body from the equipment library, auto-populating manufacturer/model.

Reference: How `SourceFormModal` selects a computer type from `equipmentSpecs` filtered to `category === 'COMPUTER'`.

- [ ] **`Cameras.tsx` form — Add Equipment Spec dropdown**
  - Filter `equipmentSpecs` where `category === 'CAMERA'`
  - On select: auto-fill `manufacturer`, `model` from the spec
  - Store `equipmentUuid` in formData
- [ ] **`useCamerasAPI.ts` — Add `equipmentUuid?: string` to `CreateCameraInput`**
- [ ] **`useCamerasAPI.ts` — Pass `equipment_uuid` through in requestData** (camelCase → snake_case conversion already handles this if named correctly)
- [ ] **Test:** Select a camera body from equipment list, save, confirm `equipment_uuid` is in DB

---

## Phase 6 — Equipment Spec Picker (CCU Form)

Same pattern as Phase 5 but for CCUs.

- [ ] **`CCUs.tsx` form — Add Equipment Spec dropdown**
  - Filter `equipmentSpecs` where `category === 'CCU'`
  - On select: auto-fill `manufacturer`, `model`, `outputs`, `formatMode` from the spec
  - Store `equipmentUuid` in formData
- [ ] **Pass `equipmentUuid` through `useCCUsAPI` to the API** (covered in Phase 2)
- [ ] **Test:** Select a CCU body from equipment list, save, confirm `equipment_uuid` is in DB

---

## Phase 7 — Camera ↔ CCU Relationship UI

`cameras` has `ccu_id` and `ccu_uuid` FKs pointing to `ccus`. The Camera form already collects `ccuId` but needs verification that this is correctly persisted and reflected.

- [ ] **Verify `ccuId` is passed to `camerasAPI.createCamera/updateCamera`**
  - Check that the handler maps `ccuId` to `ccu_id` / `ccu_uuid` properly in the API route
- [ ] **`cameras.ts` API route — Map `ccuId` to both `ccu_id` and `ccu_uuid`**
  - When saving a camera with a CCU, look up the CCU's `uuid` from its `id` and save both fields
- [ ] **CCUs page — Show linked camera count per CCU**
  - In the CCU card, display a badge like `3 cameras` by counting `localCameras` where `ccuId === ccu.id`
  - This requires Cameras page to also fetch/share camera data, OR CCUs page fetches cameras separately
- [ ] **Cameras page — CCU dropdown shows only CCUs from current production**
  - Currently reads from `oldStore.ccus` — should use `localCCUs` fetched from API (Phase 3)

---

## Phase 8 — Delete Handlers (Verify WebSocket State Sync)

Both pages have delete handlers that call the API. Verify they don't manually update state afterward (should let the WebSocket `entity:deleted` event handle it).

- [ ] **`Cameras.tsx` `handleDelete`** — Confirm it only calls `camerasAPI.deleteCamera(id)` and no manual `setLocalCameras` / store update
- [ ] **`CCUs.tsx` `handleDelete`** — Same check  
- [ ] **`cameras.ts` route DELETE** — Confirm it emits `entity:deleted` (currently does ✅, just verify)
- [ ] **`ccus.ts` route DELETE** — Confirm it emits `entity:deleted`

---

## Phase 9 — `apiClient.ts` Camera/CCU Methods (Optional Cleanup)

Currently Camera/CCU use API hooks (`useCamerasAPI`, `useCCUsAPI`) rather than `apiClient` direct methods. This is fine functionally, but for consistency with how Equipment works:

- [ ] (Optional) Add `createCamera`, `updateCamera`, `deleteCamera`, `createCCU`, `updateCCU`, `deleteCCU` to `apiClient.ts`
- Alternatively: keep as hooks — this is acceptable since they handle conflict detection and error state

---

## Phase 10 — Integration Testing Checklist

- [ ] Add a Camera → it appears in the list and persists after page refresh
- [ ] Add a Camera in Browser A → it appears in Browser B within ~1 second (WebSocket)
- [ ] Edit a Camera → changes persist after page refresh
- [ ] Delete a Camera → disappears in all browsers
- [ ] Select an equipment spec when creating Camera → manufacturer/model auto-filled, `equipment_uuid` saved in DB
- [ ] Assign a CCU to a Camera → `ccu_id` and `ccu_uuid` saved in DB
- [ ] Camera inherits CCU's format mode when CCU is assigned ✅ (already implemented)
- [ ] Add a CCU → persists in DB (Phase 1 fix verification)
- [ ] Edit a CCU → persists in DB 
- [ ] Select an equipment spec when creating CCU → auto-fills fields
- [ ] CCU card shows count of linked cameras
- [ ] All tests pass in both local dev AND production (Railway)

---

## Implementation Order Summary

| Phase | Area | Priority | Effort |
|-------|------|----------|--------|
| 1 | Fix CCU API call signatures | 🔴 Critical | Small |
| 2 | Expand `useCCUsAPI` input types | 🔴 Critical | Small |
| 3 | Fetch from DB on mount | 🟠 High | Small |
| 4 | Remove double state updates (Cameras) | 🟠 High | Small |
| 5 | Equipment picker — Camera form | 🟡 Medium | Medium |
| 6 | Equipment picker — CCU form | 🟡 Medium | Medium |
| 7 | Camera ↔ CCU relationship UI | 🟡 Medium | Medium |
| 8 | Delete handler verification | 🟢 Low | Tiny |
| 9 | apiClient.ts cleanup | ⚪ Optional | Small |
| 10 | Integration testing | 🔴 Critical | Medium |

**Start with Phases 1-4** (all fixable within one session, no new UI needed).  
**Phases 5-7** build new UI pieces analogous to what SourceFormModal does for Computers.

---

## Reference Files

| Purpose | File |
|---------|------|
| Reference implementation (full pattern) | `src/pages/Computers.tsx` |
| Reference modal | `src/components/SourceFormModal.tsx` |
| Camera API hook | `src/hooks/useCamerasAPI.ts` |
| CCU API hook | `src/hooks/useCCUsAPI.ts` |
| Camera page | `src/pages/Cameras.tsx` |
| CCU page | `src/pages/CCUs.tsx` |
| Camera DB route | `api/src/routes/cameras.ts` |
| CCU DB route | `api/src/routes/ccus.ts` |
| Equipment library | `src/hooks/useEquipmentLibrary.ts` |
| Prisma schema | `api/prisma/schema.prisma` (models: `cameras`, `ccus`) |
