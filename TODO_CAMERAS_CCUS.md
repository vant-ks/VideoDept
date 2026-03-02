# TODO: Camera & CCU Feature Branch
**Branch:** `feature/cameras-ccus`  
**Base reference:** Computers page pattern (fully implemented)  
**Date opened:** 2026-02-28

---

## Overview

Cameras and CCUs already have API routes and WebSocket broadcasts wired up, but several layers of the implementation are incomplete or broken relative to the Computers/Sources reference pattern. The work below is ordered from foundational (data layer) to polish (UX).

---

## Phase 1 — Fix Broken API Call Signatures (CCUs) ✅

The `CCUs.tsx` page is calling `useCCUsAPI` hooks with the **wrong number of arguments**, passing `productionId` as an extra leading arg that doesn't exist in the hook signatures. This silently mis-routes data.

- [x] **`CCUs.tsx` — Fix `createCCU` call**
  - Was: `ccusAPI.createCCU(productionId!, ccuData)`
  - Fixed: explicit field list with `productionId: productionId!`
- [x] **`CCUs.tsx` — Fix `updateCCU` call**
  - Was: `ccusAPI.updateCCU(productionId!, editingCCU.id, formData)`
  - Fixed: `ccusAPI.updateCCU(editingCCU.id, { ...formData, productionId })`
- [x] **`CCUs.tsx` — Fix `deleteCCU` call**
  - Was: `ccusAPI.deleteCCU(productionId!, id)`
  - Fixed: `ccusAPI.deleteCCU(id)`
- [x] **Test:** Save a CCU and confirm it persists in DB (not just Zustand)

---

## Phase 2 — Expand `useCCUsAPI` Input Types ✅

`CreateCCUInput` only has `name` and `note`. The DB `ccus` table has many more fields that the form already collects but can't persist.

- [x] **`useCCUsAPI.ts` — Expand `CreateCCUInput`** to include:
  - `id?: string`
  - `manufacturer?: string`
  - `model?: string`
  - `formatMode?: string`
  - `fiberInput?: string`
  - `referenceInput?: string`
  - `outputs?: any[]`
  - `equipmentUuid?: string`
- [x] **`useCCUsAPI.ts` — Update `createCCU` requestData** to pass all new fields through to the API
- [x] **`useCCUsAPI.ts` — Update `updateCCU` requestData** to include all new fields

---

## Phase 3 — Fetch From API on Mount (Both Pages) ✅

Both Camera and CCU pages currently rely on the Zustand store for initial data. They should load directly from the DB on mount (like the Computers page does with `fetchSources(productionId)`).

- [x] **`Cameras.tsx` — Add fetch on mount**
- [x] **`CCUs.tsx` — Add fetch on mount**

---

## Phase 4 — Remove Double State Updates (Cameras) ✅

After saving, `Cameras.tsx` calls both the API AND manually calls `addCamera(newCamera)` / `updateCamera(result.id, result)`. This causes a race condition with the WebSocket event that also updates state.

- [x] **`Cameras.tsx` — After `createCamera()`: replaced `addCamera(newCamera)` with `setLocalCameras(prev => ...)` optimistic update**
- [x] **`Cameras.tsx` — After `updateCamera()`: removed `updateCamera(result.id, result)` call — WebSocket handles state**
- [x] **Verify:** WebSocket events update `localCameras` state correctly without duplication

---

## Phase 5 — Equipment Spec Picker (Camera Form) ✅

The `cameras` table has an `equipment_uuid` FK to `equipment_specs`. The Camera form now captures the equipment spec UUID when a model is selected.

- [x] **`Cameras.tsx` form — When model is selected, store `equipmentUuid` from matching spec (`spec.id`)**
  - Model select onChange now calls `cameraSpecs.find(s => s.manufacturer === ... && s.model === ...)` and stores `spec.id` as `equipmentUuid`
  - Manufacturer onChange now clears `equipmentUuid` when manufacturer changes
- [x] **`useCamerasAPI.ts` — Added `equipmentUuid?: string` to `CreateCameraInput`**
- [x] **`useCamerasAPI.ts` — Pass `equipmentUuid` through in both `createCamera` and `updateCamera` requestData**
- [x] **`types/index.ts` — Added `equipmentUuid?: string` to `Camera` interface**
- [ ] **Test:** Select a camera body from equipment list, save, confirm `equipment_uuid` is in DB

---

## Phase 6 — Equipment Spec Picker (CCU Form) ✅

Same pattern as Phase 5 but for CCUs.

- [x] **`CCUs.tsx` — local `CCUFormFields` interface** replaces `Partial<CCU>` for form state
- [x] **`CCUs.tsx` — `handleModelChange`** now stores `equipmentUuid` (spec.id) and `formatMode` (spec.deviceFormats[0])
- [x] **`CCUs.tsx` — Manufacturer onChange** clears `equipmentUuid`, `formatMode`, `outputs` on change
- [x] **`CCUs.tsx` — `handleEdit`** populates all form fields explicitly from the CCU record
- [x] **`CCUs.tsx` — `handleSave`** cleaned up — no more `(formData as any)` casts; updateCCU uses explicit fields
- [x] **`CCUs.tsx` — Modal form** now includes Format Mode select and Notes textarea
- [x] **`CCUs.tsx` — memoized** `ccuSpecs`, `CCU_MANUFACTURERS`, `CCU_MODELS_BY_MANUFACTURER` with `useMemo`
- [x] **`equipmentUuid` already passes through `useCCUsAPI`** (Phase 2)

---

## Phase 7 — Camera ↔ CCU Relationship UI ✅

- [x] **`cameras.ts` POST** — after `toSnakeCase`, looks up matching CCU by `ccu_id` and writes its `uuid` to `ccu_uuid` column
- [x] **`cameras.ts` PUT** — same lookup; also clears `ccu_uuid` when `ccu_id` is explicitly set to null/empty
- [x] **`CCUs.tsx`** — fetches cameras from API on mount; each CCU card shows a linked camera count badge
- [x] **`Cameras.tsx`** — imports `useCCUsAPI`, fetches CCUs from API into `localCCUs`; form dropdown and `getCCUName` use `localCCUs` instead of `oldStore.ccus`

---

## Phase 8 — Delete Handlers (Verify WebSocket State Sync) ✅

- [x] **`Cameras.tsx` `handleDelete`** — removed `deleteCamera(id)` store call; state now handled exclusively by WebSocket `entity:deleted` event
- [x] **`CCUs.tsx` `handleDelete`** — was already clean (only `ccusAPI.deleteCCU(id)`)
- [x] **`cameras.ts` route DELETE** — confirmed emits `entity:deleted` (line 278) ✅
- [x] **`ccus.ts` route DELETE** — added `entity:deleted` broadcast (was missing!)

---

## ⚠️ Add `sort_order` to CCUs (DO NOT use `migrate dev`)

**Status:** Unresolved — needs dedicated session

**What happened (2026-03-01):** A previous session attempted `prisma migrate dev --name add_sort_order_to_ccus`. Prisma detected schema drift and prompted to reset the entire `public` schema (destroying all data). Session was killed before confirming. **`migrate dev` is banned — it crashes VS Code (Exit Code 137) and risks data loss.**

**Current state:**
- `sort_order` was removed from `schema.prisma` (reverted to match DB)
- The `ccus` table does NOT have a `sort_order` column

**To add `sort_order` to ccus safely (use `db push` only):**
1. Add `sort_order Int @default(0)` to `ccus` model in `api/prisma/schema.prisma`
2. Run `npx prisma validate` to check syntax
3. Run `npm run db:push` — applies schema change without migration files, no data loss risk
4. Restart the API dev server to reload Prisma Client
5. Verify `sort_order` is present and functional on CCUs

---

## Phase 9 — `apiClient.ts` Camera/CCU Methods (Optional Cleanup)

Currently Camera/CCU use API hooks (`useCamerasAPI`, `useCCUsAPI`) rather than `apiClient` direct methods. This is fine functionally, but for consistency with how Equipment works:

- [ ] (Optional) Add `createCamera`, `updateCamera`, `deleteCamera`, `createCCU`, `updateCCU`, `deleteCCU` to `apiClient.ts`
- Alternatively: keep as hooks — this is acceptable since they handle conflict detection and error state

---

## 🐛 Bug Fixes Applied (2026-03-01)

### Bug 1 — 500 on CCU Create/Duplicate
**Root cause:** `ccus.ts` POST handler spread `ccuData` (camelCase) directly into Prisma without `toSnakeCase()`. Fields like `equipmentUuid`, `formatMode`, `fiberInput` are unknown to Prisma in camelCase → 500.
**Fix:** Added `toSnakeCase(ccuData)` + empty-string-to-null loop in POST handler (matching cameras.ts pattern).

### Bug 2 — Edit/Delete CCU Fails (Wrong Identifier)
**Root cause:** `updateCCU(editingCCU.id, ...)` and `deleteCCU(ccu.id)` pass the display ID ("CCU 1") to the route which does `findUnique({ where: { uuid: ... } })` — display ID is not the PK.
**Fix:** `CCUs.tsx` now passes `(editingCCU as any).uuid` to `updateCCU` and `(ccu as any).uuid || ccu.id` to `deleteCCU`.
**Also fixed proactively in Cameras.tsx** — same pattern (camera editing/deletion also passed display ID).

---

## Phase 10 — Integration Testing Checklist

- [ ] Add a Camera → it appears in the list and persists after page refresh
- [ ] Add a Camera in Browser A → it appears in Browser B within ~1 second (WebSocket)
- [ ] Edit a Camera → changes persist after page refresh
- [ ] Delete a Camera → disappears in all browsers
- [ ] Select an equipment spec when creating Camera → manufacturer/model auto-filled, `equipment_uuid` saved in DB
- [ ] Assign a CCU to a Camera → `ccu_id` and `ccu_uuid` saved in DB
- [ ] Camera inherits CCU's format mode when CCU is assigned ✅ (already implemented)
- [ ] Add a CCU → persists in DB
- [ ] Edit a CCU → persists in DB
- [ ] Delete a CCU → disappears in all browsers
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
