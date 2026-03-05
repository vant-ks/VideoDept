# Development Log - Video Production Manager

---

## March 5, 2026 — Migrate Media Servers to IOPortsPanel / device_ports (IN PROGRESS)

### Branch: `v0.1.5_source-touchups`
### Status: 🔄 IN PROGRESS

### Goal
Replace the legacy `outputs_data` (name/role/type/resolution/frameRate per output row) with the IOPortsPanel / `device_ports` table system. Equipment spec IO is the source of truth; user assigns portLabel + Format per port per production instance.

### Changes
- TBD on commit

---

## March 5, 2026 — Switch Railway deploy to db:push (remove migrate deploy)

### Branch: `v0.1.5_source-touchups`
### Status: ✅ COMPLETE
### Commit: TBD

### Changes
- **api/nixpacks.toml** — Changed start command from `npx prisma migrate deploy` → `npx prisma db push`; full cmd: `npx prisma db push && npm run seed:all:prod && npm run start`
- **docs/RAILWAY_DEPLOYMENT.md** — Updated deploy log line "Migrations deployed" → "Schema pushed (db:push)"; updated troubleshooting section to reference db:push instead of migrate

### Rule Enforced
Project always uses `prisma db push` — both locally and on Railway. `prisma migrate dev` / `prisma migrate deploy` are never used (causes crashes / Exit Code 137 on dev machine and is not the intended workflow).

---

## March 5, 2026 — Fix computerType not persisting on media server save

### Branch: `v0.1.5_source-touchups`
### Status: ✅ COMPLETE
### Commit: `50b298b`

### Root Cause
`computer_type` column did not exist in the `media_servers` table. Prisma silently drops unknown fields, so the value was never written to the DB.

### Changes
- **api/prisma/schema.prisma** — Added `computer_type String?` to `media_servers` model (between `platform` and `outputs_data`)
- **Dev DB** — `db:push` applied in 83ms; Prisma client regenerated
- **API server** — Restarted to pick up new Prisma client (tsx watch does not auto-restart on client regeneration)
- No route changes needed: PUT handler already uses `toSnakeCase(updates)` → `computer_type` is now recognised; `normalizeMediaServer` already uses `toCamelCase(server)` → `computerType` already returned in responses

---

### Branch: `v0.1.5_source-touchups`
### Status: ✅ COMPLETE
### Commit: `5cf3631`

### Changes
- **api/prisma/equipment-data.json** — Added 11 COMPUTER category entries recovered from `seed-computers.mjs` in commit `036ae3f`: `Laptop - PC MISC`, `Laptop - PC GFX`, `Laptop - PC WIDE`, `Laptop - Mac MISC`, `Laptop - Mac GFX`, `Desktop - PC MISC`, `Desktop - PC GFX`, `Desktop - PC SERVER`, `Desktop - Mac MISC`, `Desktop - Mac GFX`, `Desktop - Mac SERVER`
- **api/prisma/seed-equipment.ts** — Added `'computer': EquipmentCategory.COMPUTER` to `categoryMap` (was missing — all `category: "computer"` entries in the JSON were being skipped with `undefined` category and not inserted)
- **Dev DB** — Re-seeded: 230 total specs, COMPUTER: 11 models confirmed

---

### Branch: `v0.1.5_source-touchups`
### Status: ✅ COMPLETE
### Commit: `d002f87`

### Changes
- **MediaServers.tsx** — Fixed card disappearing after edit-save: `onSave` and `onSaveAndDuplicate` now wrap both `updateMediaServer` calls in `Promise.all().then(() => loadProject())` to force a DB re-sync after save — eliminates WS stale-closure race that dropped the card from the rendered list
- **MediaServers.tsx** — Fixed empty Computer Type dropdown: changed `spec.category === 'COMPUTER'` → `spec.category === 'computer'` (equipment library normalises categories to lowercase via `toLowerCase()`)
- **MediaServers.tsx** — Removed "Server ID: N (Drag to reorder servers)" subtitle from edit modal header
- **MediaServers.tsx** — Card col 1: output count appended in parens after platform (`Resolume (2 outputs)`); Card col 2: now shows note text instead of output count

---

### Branch: `v0.1.5_source-touchups`
### Status: ✅ COMPLETE
### Commit: `0fd54bb`

### Changes
- **MediaServers.tsx** — Fixed strip regex in `useState` initializer: `/\s+[AB]\s*\([^)]*\)$/` → `/\s+[AB]\s*(\([^)]*\))?$/` — `?` makes role optional, preventing suffix accumulation on repeated edit cycles (bug: `"MEDIA 1"` → `"MEDIA 1 A"` → `"MEDIA 1 A A"`)
- **MediaServers.tsx** — Fixed `stripABSuffix` helper to use the corrected regex (handles both `" A"` and `" A (Role)"`)
- **MediaServers.tsx** — Updated `appendASuffix` signature to accept optional `role` param; replaced inline ternary template literal in `handleSubmit` with `appendASuffix(o.name, o.role || undefined)`
- **MediaServers.tsx** — Extracted duplicated `outputsWithB` map into `makeBackupOutputs(mainOutputs, backupId)` helper; called from both `onSave` and `onSaveAndDuplicate`
- **MediaServers.tsx** — Added comment block above helpers documenting the three-site transform pattern (STRIP → APPEND → A→B)

---

## March 5, 2026 — CCU card: single-click reveal/collapse + chevron moved to left of ID

### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE

### Changes
- **CCUs.tsx** — Moved `ChevronDown`/`ChevronUp` indicator from the right-side action button group to the **left column**, between the drag handle and the CCU ID text.
- **CCUs.tsx** — Made the grid row (`div.grid`) the click target for reveal/collapse. A single click anywhere on the card row toggles the I/O reveal panel. Guard: `isDragInProgress.current` prevents drag operations from triggering a toggle.
- **CCUs.tsx** — Removed the dedicated standalone reveal button from the right side (now redundant).
- **CCUs.tsx** — Added `onClick={(e) => e.stopPropagation()}` to the action buttons wrapper (`Edit`, `Copy`, `Delete`) so those clicks don't also fire the card-level reveal toggle.
- **CCUs.tsx** — Added `onClick={(e) => e.stopPropagation()}` to the `GripVertical` drag handle as well, since clicking the grip (without dragging) should not toggle reveal.

---



### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE

### Root Cause
API server had been running for 14+ hours (started previous session). During that session, `db:push` was run to add new columns (`focal_length`, `has_heavy_tripod`, `has_medium_tripod`, `has_steadicam`, `has_magic_arm`). `db:push` regenerates the Prisma client in `node_modules/.prisma/client`, but `tsx watch` only watches `.ts` source files — it does NOT restart when the Prisma client is regenerated. So the running server held a stale Prisma schema definition that didn't match the DB columns, causing all camera endpoints to 500.

### Symptoms
- `GET /api/cameras/production/:id` → 500 "Failed to fetch cameras"
- `POST /api/cameras` → 500 "Failed to create camera"

### Fix
Killed all server processes and restarted via VS Code Tasks. No code changes required.

### Rule (see PROJECT_RULES.md)
After any `npm run db:push`, always restart the API server. `tsx watch` does NOT auto-restart on Prisma client regeneration.

---

## March 4, 2026 (Session 3) — Fix PTZ seeding: map ptz → CAMERA enum, re-export equipment-data.json

### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE
### Commit: `606d6c8`

### Changes
- **api/scripts/seed-equipment.ts** — Changed `category: 'ptz'` → `category: 'CAMERA'` for all PTZ camera entries in seed script so they match the Prisma `EquipmentCategory` enum. DB was re-seeded: 219 equipment specs including 7 PTZ cameras now present.
- **api/src/data/equipment-data.json** — Re-exported (was missing from last push). Ensures seed script data and exported JSON are in sync.

---

## March 4, 2026 (Session 3) — Fix: add 'ptz' to EquipmentSpec category union; zoom lens UX improvements

### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE
### Commit: `62ade27`

### Changes
- **src/types/equipment.ts** (or shared types) — Added `'ptz'` to the `EquipmentSpec.category` union type so TypeScript no longer errors when the API returns ptz items.
- **Cameras.tsx** — Lens configuration UX improvements: zoom lens fields (`minFocalLength`, `maxFocalLength`) only show when lens type is `zoom`; prime shows single `focalLength` field. Prevents confusing empty fields.

---

## March 4, 2026 (Session 3) — Focal length field, 8" target calc, PTZ camera models

### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE
### Commit: `6374bb4`

### Changes
- **Equipment seed / EquipmentFormModal** — Added `focalLength` field to equipment spec form (prime lenses).
- **Cameras.tsx** — Added "8-inch target distance" calculator: given sensor size + focal length, calculates approximate working distance for an 8" wide subject. Helper for camera operators.
- **api/scripts/seed-equipment.ts** — Added PTZ camera model entries: Sony BRC-X400, Sony BRC-H800, Panasonic AW-UE150, Canon CR-X500, PTZOptics 30X-SDI, Marshall CV630-BI, Bolin Technology BC-9.

---

## March 4, 2026 (Session 3) — Add Heavy/Medium Duty Tripod; rename Tripod → Light Duty Tripod

### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE
### Commit: `0bbfa9e`

### Changes
- **api/scripts/seed-equipment.ts** — Added "Heavy Duty Tripod" and "Medium Duty Tripod" as separate equipment specs in the support category.
- **api/scripts/seed-equipment.ts** — Renamed existing generic "Tripod" entry to "Light Duty Tripod" for clarity and to distinguish from the new additions.

---

## March 4, 2026 (Session 3) — Add Steadicam, Magic Arm, SuperClamp support equipment

### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE
### Commit: `7d172c1`

### Changes
- **api/scripts/seed-equipment.ts** — Added Steadicam (support), Magic Arm (support), and SuperClamp (support) as equipment spec entries to the camera support gear section of the seed data.

---

## March 4, 2026 (Session 2) — Camera card UX polish

### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE

### Changes
- **Cameras.tsx** — Removed Format Mode column from camera cards (col 6 of 7 grid → 6-col grid)
- **Cameras.tsx** — Double-click on a camera card opens the edit modal
- **Cameras.tsx** — SMPTE Fiber Cable Length field moved into right column of CCU Connection section (removed standalone "CCU Connection Details" section below Support Equipment)

---

## March 4, 2026 (Session 2) — CamSwitcher type alias + Cameras CCU availability indicator

### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE

### Changes Committed
- **CamSwitcher.tsx** — Fixed name collision between `CamSwitcher` component and `CamSwitcher` imported type. Aliased import as `CamSwitcherEntity`.
- **Cameras.tsx** — Two fixes:
  1. Category filter `'CAMERA'` → `'camera'` (matches `transformApiEquipment` lowercase contract)
  2. CCU dropdown now shows availability: `⚠ taken — CamId` vs `✓ available` for each option

---

## March 4, 2026 — Camera/CCU Integration Testing (Phase 10)

### Branch: `v0.1.4_signal-flow`
### Status: ✅ COMPLETE (API layer)

### API Tests — All Passed
| Test | Result |
|------|--------|
| GET /cameras/production/:id — list cameras | ✅ |
| POST /cameras — create camera | ✅ |
| PUT /cameras/:uuid — edit camera, version increments | ✅ |
| GET /cameras/:uuid — persists after edit | ✅ |
| DELETE /cameras/:uuid — soft-delete, returns 404 on re-fetch | ✅ |
| POST /cameras with ccuId — saves ccu_id + ccu_uuid (both FK columns) | ✅ |
| GET /ccus/production/:id — list CCUs | ✅ |
| POST /ccus — create CCU | ✅ |
| PUT /ccus/:uuid — edit CCU, version increments | ✅ |
| DELETE /ccus/:uuid | ✅ |
| CCU camera count badge — computed client-side in CCUs.tsx (by design, no API field needed) | ✅ |

### Remaining (manual browser tests)
- [ ] Cross-browser WebSocket sync (Camera appears in Browser B within ~1s)
- [ ] equipment_uuid saved when spec selected on Camera
- [ ] All operations on Railway production (blocked by Priority 3 — repo not connected)

---

## March 3, 2026 (Session 3) — Signal-flow: Routers, CamSwitcher, Monitors migrated to device_ports + IOPortsPanel

### Branch: `v0.1.4_signal-flow`
### Commits: `703f03d`, `5ad3937`, `c3c7816`, `72734f3`

### Overview
Completed the connection management standardisation for Routers, CamSwitchers, and
Monitors. All three pages now use the same `device_ports` + `IOPortsPanel` architecture
already established for CCUs, Computers, and Media Servers. Also added a category
filter dropdown to Formats.tsx and a `displayFormatId` helper throughout all port views.

---

### 1. Formats page — category filter dropdown (`703f03d`)

Added a `<select>` dropdown next to the search bar on Formats.tsx. Options:

> All categories / Standard / Custom / SD / HD / UHD / 4K

Applied before the text search in `filteredFormats` useMemo. The category filter
maps to flags already on each format record (`is_system`, `standard`).

---

### 2. `displayFormatId` rollout to IOPortsPanel and CCU reveal panel (`5ad3937`)

`displayFormatId(id)` is exported from `FormatFormModal.tsx`. Applies short-form
display to IDs in port format dropdowns and card reveal tables:
`2398 → 23.98`, `2997 → 29.97`, `5994 → 59.94`, inserts `_` before `RB`.

Applied to:
- **`IOPortsPanel.tsx`** — both INPUT and OUTPUT format `<select>` `<option>` labels
- **`CCUs.tsx`** reveal panel — `fmtName` now calls `displayFormatId(formats.find(...)?.id ?? port.formatUuid)`

---

### 3. Hook interface expansions

**`useRouterAPI.ts`** — `Router` interface expanded with `manufacturer?`, `model?`,
`equipmentUuid?`, `note?`. `RouterInput` expanded with same optional fields.

**`useCamSwitcherAPI.ts`** — `CamSwitcher` interface now has `uuid: string` (was
missing entirely), plus `manufacturer?`, `model?`, `equipmentUuid?`, `note?`.
`CamSwitcherInput` expanded with same fields.

---

### 4. Routers.tsx — full rewrite (`c3c7816`)

**Before:** Name-only stub. Cards showed ID + name only. Modal had a single Name
input. No equipment association. No port management.

**After:**
- Equipment library (manufacturer → model cascade dropdowns) scoped to `category === 'router'`
- `buildPortDrafts(spec)` — handles both `equipment_io_ports` (API shape) and
  legacy `spec.inputs/outputs` (local shape)
- Collapsible I/O table per card (chevron toggle, `expandedUuid` state). Shows
  IN/OUT badge, ioType, portLabel, formatted format ID, note
- `IOPortsPanel` in add/edit modal with `onCreateCustomFormat` wired
- `device_ports` synced on save via `/device-ports/device/:uuid/sync`
- `cardPorts` state fetched per router on load and after save
- Full WebSocket sync (`onEntityCreated/Updated/Deleted`)

---

### 5. CamSwitcher.tsx — full rewrite (`c3c7816`)

**Before:** Read from `oldStore.videoSwitchers[0]` (legacy Zustand store). Showed
a single static card with inputs/outputs arrays from the store. No per-item edit
or delete. No equipment association.

**After:** Complete replacement following the Routers pattern:
- DB-backed list via `useCamSwitcherAPI.getCamSwitchers(productionId)`
- Equipment library scoped to `category === 'cam-switcher'`
- Collapsible I/O table per card, same port summary pattern as Routers
- Full add/edit/delete per item with `IOPortsPanel` in modal
- `device_ports` sync on save
- WebSocket entity type: `'camSwitcher'`

---

### 6. Monitors.tsx — surgical refactor (`c3c7816`)

**Removed:**
- `ConnectorRouting` interface + `initConnectorRouting()` + `parseConnectorRouting()` helpers
- `outputConnector` JSON blob in save payload
- `useSourcesAPI` import + `localSources` / `sourceOptions` state
- `secondaryDevices as SECONDARY_DEVICES` import from sampleData
- `updateConnectorRouting()` helper
- `ConnectorRow` inner component with its source-signal select and secondary-device toggle

**Added:**
- `IOPortsPanel` + `DevicePortDraft` — replaces `ConnectorRow` entirely in the modal
- `formats` state + fetch useEffect + `displayFormatId` import
- `cardPorts: Record<string, any[]>` state — fetched per-monitor on load
- `devicePorts: DevicePortDraft[]` state (separate from formData)
- `portsLoading` + `isCreateFormatOpen` + `<FormatFormModal>` at render root
- `device_ports` sync in `handleSave`; ports fetched into `cardPorts` after save
- Port summary on cards: reads from `cardPorts[uuid]` — shows IN/OUT badge, portLabel, note

**Preserved (unchanged):**
- Drag-to-reorder (GripVertical + renumber logic)
- `MONITOR_TYPES` constant and type-code radio grid in modal
- `sortedMonitors` useMemo (sorted by MONITOR_TYPES order then number)
- Equipment spec loading + manufacturer/model cascade
- Real-time WebSocket (`onEntityCreated/Updated/Deleted` for `'send'` type)
- `handleDelete` + `Save & Add Another` button

**Note on `sourceSignal`:** The old `sourceSignal` field (which signal feeds a
port) is now entered as the `note` field on each `DevicePortDraft`. The IOPortsPanel
already labels these "← Connected from" (inputs) and "→ Destination" (outputs).

---

### 7. Bugfix — literal `\n` in Routers.tsx comment (`72734f3`)

The `replace_string_in_file` tool wrote a literal `\` + `n` (two characters) into
a `//` comment separator line. Since `//` comments extend to the physical end of
line, the `const handleAdd = () => {` declaration that followed the `\n` was
consumed by the comment. The next `};` closed the component function, leaving
`return (` at module scope — Babel error: "return outside of function". Fixed by
writing the actual newline character.

---

### Architecture note

All six equipment entity pages now follow the same connection management policy:

| Entity | Port storage | Modal UI |
|---|---|---|
| Computers | `device_ports` via `/sync` | `IOPortsPanel` |
| Media Servers | `device_ports` via `/sync` | `IOPortsPanel` |
| CCUs | `device_ports` via `/sync` | `IOPortsPanel` |
| Routers | `device_ports` via `/sync` | `IOPortsPanel` |
| CamSwitchers | `device_ports` via `/sync` | `IOPortsPanel` |
| Monitors | `device_ports` via `/sync` | `IOPortsPanel` |

Snakes deferred by decision — to be done in a future session.

---

### Files Changed
- `src/pages/Formats.tsx` — category filter dropdown
- `src/components/IOPortsPanel.tsx` — `displayFormatId` in format option labels
- `src/pages/CCUs.tsx` — `displayFormatId` in reveal panel
- `src/hooks/useRouterAPI.ts` — Router/RouterInput interface expansion
- `src/hooks/useCamSwitcherAPI.ts` — CamSwitcher uuid + interface expansion
- `src/pages/Routers.tsx` — full rewrite + literal `\n` fix
- `src/pages/CamSwitcher.tsx` — full rewrite
- `src/pages/Monitors.tsx` — surgical refactor

---

## March 3, 2026 (Session 2) — Formats page overhaul (modal, search, scan rates, columns, double-click edit)

### Branch: `v0.1.4_signal-flow`
### Commits: `06956f8`

### Overview
All 7 quality-of-life improvements to the Formats system requested this session:
modal-based create/edit, search, canonical scan-rate registry, column rename,
unified table, double-click-to-edit, and admin-gated system format editing.

---

### 1. New `FormatFormModal` component (`src/components/FormatFormModal.tsx`)

Extracted the "add custom format" inline card form into a standalone reusable modal
so it can be triggered from both the Formats page and any `IOPortsPanel` dropdown.

**Key exports:**
- `FormatFormModal` — the modal itself. Props: `isOpen`, `onClose`, `onSaved`, `editingFormat?`, `readOnly?`
- `SCAN_RATES` — canonical registry of all supported frame rates:

  | value  | label  | idSuffix |
  |--------|--------|----------|
  | 23.976 | 23.98  | 2398     |
  | 24     | 24     | 24       |
  | 29.97  | 29.97  | 29       |
  | 30     | 30     | 30       |
  | 48     | 48     | 48       |
  | 59.94  | 59.94  | 59       |
  | 60     | 60     | 60       |
  | 120    | 120    | 120      |
  | 240    | 240    | 240      |

- `displayRate(frameRate, isInterlaced)` — returns just the numeric label; appends
  `i` suffix only for interlaced (e.g. `29.97i`). No `p` suffix ever — progressive
  is the assumed default.

- `suggestFormatId(hRes, vRes, frameRate, isInterlaced)` — builds the auto-suggested
  format ID string using short suffixes (29.97 → `29`, 59.94 → `59`, 23.976 → `2398`).
  Examples: `1080p59`, `1080i29`, `4Kp24`, `720p30`.

**Modal behaviour:**
- **Create mode** (`editingFormat` is null/undefined): Format ID auto-suggested
  as specs change, but user can override. ID is editable in create mode, immutable
  in edit mode (it's the unique key).
- **Edit mode** (`editingFormat` set): Pre-populates all fields; sends `PUT /formats/:uuid`.
  ID field is disabled — can't rename a format after creation.
- **Read-only mode** (`readOnly=true`): All fields disabled; "Close" button only;
  shown for system formats opened by non-admin users.

---

### 2. Formats.tsx — complete rewrite

**Before:** Inline expand/collapse card form for new custom formats. Two separate
tables (System Presets section + Custom Formats section). Columns: ID | Standard |
Resolution | Scan/Rate | Blanking | Type. No search. No double-click. No edit.

**After:**

- **"Add Custom Format" button** opens `FormatFormModal` in create mode — clean,
  no inline DOM toggle.

- **Search bar** (`/Search` icon, `max-w-sm`) at top of page. Filters by:
  - Format ID (e.g. `1080p59`)
  - Resolution string (e.g. `1920x1080`)
  - Rate label (e.g. `29.97`, `59`)
  - Standard name (HD, UHD, 4K, SD)
  - Blanking value (RBv1, RBv2, etc.)
  Case-insensitive, updates live.

- **Single unified table** — system and custom rows together in the same table.
  The API already returns `is_system` DESC then v_res DESC so system presets rise
  to the top naturally.

- **Column order**: **Format | Resolution | Rate | Blanking | Standard** + actions
  (was: ID | Standard | Resolution | Scan/Rate | Blanking | Type)

- **Rate column** uses `displayRate()` — `59.94`, `29.97i`, `23.98`, etc.
  No "p" suffix on progressive formats.

- **Standard column** — coloured text (HD → `av-accent`, UHD/4K → `av-warning`,
  SD → muted) instead of a `<Badge>` component.

- **"Type" column removed** from UI entirely. `isSystem` is still stored in DB
  and drives the lock/edit gating logic, but is never shown to the user.

- **Double-click to edit**: every row has `onDoubleClick → openEdit(fmt)`.
  - Custom format → opens edit modal (all fields editable except ID)
  - System format + non-admin → opens read-only view modal
  - System format + admin (`userRole === 'admin'`) → opens fully editable modal
    (calls `PUT /formats/:uuid`, which the API permits for admins)

- **Delete** behaviour unchanged: custom formats only; confirm inline.

**State summary:**
```typescript
const isAdmin = userRole === 'admin';
const [formats, setFormats]             = useState<Format[]>([]);
const [search, setSearch]               = useState('');
const [isModalOpen, setIsModalOpen]     = useState(false);
const [editingFormat, setEditingFormat] = useState<Format | null>(null);
const [modalReadOnly, setModalReadOnly] = useState(false);
const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
```

---

### 3. IOPortsPanel — `onCreateCustomFormat` prop

Added optional `onCreateCustomFormat?: () => void` prop to `IOPortsPanelProps`.

When supplied, both the INPUT and OUTPUT format `<select>` dropdowns gain a
separator `<option disabled>` followed by `<option value="__create__">+ Create custom format…</option>` at the bottom of the list.

Selecting `__create__` calls `onCreateCustomFormat()` and does **not** change
`port.formatUuid` — the current selection is preserved while the user creates
the new format in the overlay modal.

---

### 4. Modal-over-modal wiring (IOPortsPanel → FormatFormModal)

Three components that host IOPortsPanel now support "Create custom format…" directly
without leaving the current modal:

| Component | File |
|-----------|------|
| `SourceFormModal` | `src/components/SourceFormModal.tsx` |
| CCU edit modal | `src/pages/CCUs.tsx` |
| `ServerPairModal` | `src/pages/MediaServers.tsx` |

**Pattern applied to each:**
```tsx
import { FormatFormModal } from '@/components/FormatFormModal';
// ...
const [isCreateFormatOpen, setIsCreateFormatOpen] = useState(false);
// ...
<IOPortsPanel
  ...
  onCreateCustomFormat={() => setIsCreateFormatOpen(true)}
/>
// At the end of the parent modal:
<FormatFormModal
  isOpen={isCreateFormatOpen}
  onClose={() => setIsCreateFormatOpen(false)}
  onSaved={(fmt) => { setFormats(prev => [...prev, fmt]); setIsCreateFormatOpen(false); }}
/>
```
`onSaved` immediately appends the new format to the local `formats` array so it
appears in the dropdown without a page reload or refetch.

---

### Files Changed
- `src/components/FormatFormModal.tsx` *(new)*
- `src/pages/Formats.tsx` *(complete rewrite)*
- `src/components/IOPortsPanel.tsx` *(new prop)*
- `src/components/SourceFormModal.tsx` *(FormatFormModal wired)*
- `src/pages/CCUs.tsx` *(FormatFormModal wired)*
- `src/pages/MediaServers.tsx` *(FormatFormModal wired in ServerPairModal)*

---

## March 3, 2026 (Session 1) — Signal-flow: device_ports sync fixes, backfill scripts, reveal views

### Branch: `v0.1.4_signal-flow`
### Commits: `9ace8f3` (sync fixes + backfill scripts + reveal views)

### Overview
Completed the `device_ports` signal-flow layer across Computers and Media Servers:
fixed a broken sync payload, created idempotent backfill scripts to migrate legacy
data, and added expand-toggle reveal panels on Computer cards and Media Server
pair cards — matching the CCU card reveal pattern from the previous session.

---

### Bug Fix — Sync calls missing `productionId` (Computers + MediaServers)

**Symptom:** Saving a Computer or Media Server with ports configured would silently
do nothing — no ports were stored. No visible error in the UI.

**Root Cause:** The sync endpoint `POST /api/device-ports/device/:uuid/sync` requires
the body `{ productionId, deviceDisplayId?, ports[] }`. The frontend calls in
`Computers.tsx` and `MediaServers.tsx` were only sending `{ ports: devicePorts }`,
missing the required `productionId` field. The API returned `400 Bad Request`
("productionId and ports[] are required") which was caught and logged as non-fatal
(`console.warn`), so the user never saw it.

**Fix — Computers.tsx (`handleSave`):**
```typescript
await apiClient.post(`/device-ports/device/${savedUuid}/sync`, {
  productionId,
  deviceDisplayId: source.id,
  ports: devicePorts,
});
```

**Fix — MediaServers.tsx (`ServerPairModal`):**
- Added `productionId?: string` to `ServerPairModalProps` interface
- Destructured in function signature
- Updated sync call:
```typescript
if (mainUuid && devicePorts.length > 0 && productionId) {
  apiClient.post(`/device-ports/device/${mainUuid}/sync`, {
    productionId,
    deviceDisplayId: editingServer?.id,
    ports: devicePorts,
  });
}
```
- Passed `productionId={productionId}` at `<ServerPairModal>` render site in
  the parent.

---

### Backfill Scripts (two new files in `api/scripts/`)

Both scripts are idempotent — safe to re-run; skip any device that already has
`device_ports` rows.

#### `backfill-computer-ports.ts`
Migrates existing `source_outputs` rows → `device_ports` for all Computers.

Logic per computer:
1. Find all non-deleted sources with `category = 'COMPUTER'` that have
   `source_outputs` rows but zero `device_ports` rows.
2. For each `source_output`, create one `device_ports` row:
   - `direction = 'OUTPUT'`
   - `io_type = source_output.connector`
   - `port_label = source_output.connector`
   - `id = "{computer.id}_out_{n}"`

Run: `npx tsx api/scripts/backfill-computer-ports.ts`

#### `backfill-media-server-ports.ts`
Migrates `outputs_data` JSON field → `device_ports` for all Media Servers (main servers only).

Logic per server:
1. Find all non-deleted media servers with `is_backup = false` that have
   non-empty `outputs_data` JSON but zero `device_ports` rows.
2. For each entry in `outputs_data`, create one `device_ports` row:
   - `direction = 'OUTPUT'`
   - `io_type = output.type` (e.g. `'DP'`, `'SDI'`)
   - `port_label = output.name`
   - `note = output.role`
   - `id = "{server.id}_out_{n}"`

Run: `npx tsx api/scripts/backfill-media-server-ports.ts`

---

### Reveal Views — Computer cards

Added an expand-toggle button and port reveal panel to each Computer card in
`src/pages/Computers.tsx`, replicating the CCU card reveal pattern exactly.

**State added:**
```typescript
const [expandedSources, setExpandedSources]         = useState<Set<string>>(new Set());
const [cardPorts, setCardPorts]                     = useState<Record<string, DevicePortDraft[]>>({});
const [cardPortsLoading, setCardPortsLoading]       = useState<Set<string>>(new Set());
const [formats, setFormats]                         = useState<Format[]>([]);
```

**`toggleReveal(uuid)` callback:** Sets the expand set, then lazy-fetches
`GET /device-ports/device/:uuid` on first expand only. Maps API response to
`DevicePortDraft[]` and caches in `cardPorts[uuid]`. Error path stores `[]`
to prevent re-fetching on subsequent expands.

**UI changes per card:**
- ChevronDown/Up button added to the BUTTONS column (before Duplicate/Delete)
- Reveal panel appended at the bottom of each Card, inside the card boundary
- Panel shows: loading state → empty message → port table
- Port table columns: **Dir** (IN/OUT badge) | **Type** (mono) | **Label** | **Format** | **Route / Note**
- Inputs sorted before outputs; format resolved as `formats.find(f => f.uuid === port.formatUuid)?.id`

---

### Reveal Views — Media Server pair cards

Same pattern applied to `src/pages/MediaServers.tsx`. Ports are fetched for
`pair.main.uuid` only (backup server mirrors main).

**State added (inside `ServerPairModal` is NOT where this lives — it's in the
`MediaServers` component itself):**
```typescript
const [expandedPairs, setExpandedPairs]             = useState<Set<string>>(new Set());
const [pairCardPorts, setPairCardPorts]             = useState<Record<string, DevicePortDraft[]>>({});
const [pairCardPortsLoading, setPairCardPortsLoading] = useState<Set<string>>(new Set());
const [formats, setFormats]                         = useState<Format[]>([]);
```

Reveal toggle button placed in the pair header action row (after Delete).
Reveal panel placed after the note block, before `</Card>`.

---

### Files Changed
- `src/pages/Computers.tsx` — sync payload fix + reveal view
- `src/pages/MediaServers.tsx` — sync payload fix + reveal view + formats state
- `api/scripts/backfill-computer-ports.ts` *(new)*
- `api/scripts/backfill-media-server-ports.ts` *(new)*

---



### Branch: `v0.1.1_sends-monitors` → merged to `main`
### Commits: `8bbaf9c`, `cb4e4ec`, `4a091a9`

### Overview
Fixed the full equipment-port → monitor pipeline: ports added/edited in the Equipment
page now save correctly to the DB, and all open Monitors pages update in real-time
without a refresh.

---

### Bug 1 — Equipment edits silently failing (category enum mismatch)
**Symptom:** Adding/editing a port in the Equipment modal appeared to save (UI updated)
but the change was gone after any page refresh.

**Root Cause:** `transformApiEquipment` in `useEquipmentLibrary.ts` lowercases
the `category` field (`'MONITOR' → 'monitor'`) for frontend use. `EquipmentFormModal`
initialized `formData.category` directly from the editing spec, so it sent
lowercase back to the API. Prisma's `EquipmentCategory` enum requires uppercase;
the update threw a 500. The catch block silently fell back to Zustand-only state,
making the UI look saved while the DB was never touched.

**Fixes:**
- `api/src/routes/equipment.ts`: added `toEquipmentCategoryEnum()` (`.toUpperCase()`)
  applied in both POST and PUT handlers, same pattern as existing `toIoArchitectureEnum`
- `src/components/EquipmentFormModal.tsx`: uppercase category on init so the
  category dropdown shows the correct option when editing existing equipment

---

### Bug 2 — New ports not appearing in Monitors edit modal
**Symptom:** After adding a port to a monitor's equipment spec, opening the monitor's
edit modal still showed the old port list.

**Root Cause (a):** `parseConnectorRouting` returned saved JSON verbatim — it never
consulted the current spec. New/removed ports were completely ignored.

**Fix:** Rewrote `parseConnectorRouting` to always start from `initConnectorRouting(spec)`
(current spec as source of truth) and then carry over only `sourceSignal` /
`hasSecondaryDevice` / `secondaryDevice` for ports that still exist. New ports appear
empty; removed ports are dropped automatically.

**Root Cause (b):** Equipment specs were fetched on mount only if `length === 0`,
so a cached stale spec was used for the rest of the session.

**Fix:** Removed the length guard — `fetchFromAPI()` now runs unconditionally on mount.

---

### Bug 3 — Port changes require manual refresh in other tabs
**Symptom:** After editing a port in tab A, tab B needed a full page refresh before
the Monitor edit modal reflected the change.

**Root Cause:** The API already broadcast `equipment:updated` on every PUT/POST/DELETE.
Monitors.tsx never subscribed to that event; only Equipment.tsx did.

**Fix:** Added the same `equipment:updated` socket listener to Monitors.tsx (shared
singleton socket pattern from Equipment.tsx). Any equipment change in any tab triggers
`fetchFromAPI()` on all connected Monitors pages immediately.

---

### Files Changed
- `video-production-manager/api/src/routes/equipment.ts`
- `video-production-manager/src/components/EquipmentFormModal.tsx`
- `video-production-manager/src/pages/Monitors.tsx`

---

## March 1, 2026 (Session 2) - Crash Recovery: Revert schema drift + commit staged fixes

### Branch: `feature/cameras-ccus`

### What Happened
Previous session added `sort_order Int @default(0)` to the `ccus` model and attempted `prisma migrate dev --name add_sort_order_to_ccus`. Prisma detected schema drift (indexes/FKs in the DB not recorded in migration history) and prompted to **reset the entire public schema** (destroy all data). Session was killed before confirming.

### Recovery Actions
1. **Reverted** `sort_order` from `schema.prisma` — schema now matches DB again
2. **Committed** the CCU/Camera bug fixes that were ready but unstaged at crash time:
   - `CCUs.tsx`: removed faulty store-sync `useEffect`, added version-conflict error handling, added optimistic state update after successful edit
   - `Cameras.tsx`: fixed stale ID bug in duplicate flow (include new camera's ID in the existing-ID set before generating the duplicate ID)
3. **Documented** schema drift issue in `TODO_CAMERAS_CCUS.md` with resolution steps

### Known Issue: Schema Drift
The `ccus` table is missing `sort_order`. Before adding it:
- Investigate drift with `prisma migrate status`
- Get explicit user approval before any `migrate dev` or `db push`
- See `TODO_CAMERAS_CCUS.md` → "Schema Drift Issue" section

---

## March 1, 2026 - Cameras & CCUs Feature Branch (Phases 1–8 + Bug Fixes)

### Branch: `feature/cameras-ccus`
### Commits: `10e92ac`, `f181573`, `582719b`

### Overview
Implemented full Cameras and CCUs CRUD pages with API integration, WebSocket sync, and form overhauls. Fixed two recurring systemic bugs (documented in PROJECT_RULES.md Rules #1 and #10).

---

### Implementation Phases

**Phase 1 — Fix CCU API Call Signatures**
- `useCCUsAPI.ts` was calling hooks with wrong argument counts (positional mismatch)
- Fixed all create/update/delete hook call sites

**Phase 2 — Expand `CreateCCUInput` Type**
- `CreateCCUInput` was minimal; added all DB fields: `id`, `manufacturer`, `model`, `formatMode`, `fiberInput`, `referenceInput`, `outputs`, `equipmentUuid`
- Corresponding fields added to create/update requestData

**Phase 3 — Fetch on Mount (Both Pages)**
- `CCUs.tsx` and `Cameras.tsx` were showing empty state on load
- Added `useEffect` fetch calls to `useCCUsAPI.fetchCCUs()` and `useCamerasAPI.fetchCameras()` on mount

**Phase 4 — Remove Double State Updates (Cameras)**
- `Cameras.tsx` was calling both the API hook AND a Zustand store update
- Removed store calls; WebSocket broadcast is the single source of truth for state

**Phase 5 — `equipmentUuid` Tracking in Camera Form**
- Camera form model selection now resolves and stores `equipmentUuid` from selected Equipment record
- `Camera` interface in `types/index.ts` updated with `equipmentUuid?: string`

**Phase 6 — CCU Form Overhaul**
- Added `CCUFormFields` local interface to CCUs.tsx
- Equipment model select resolves `equipmentUuid` on change
- Added `formatMode` selector (HD/4K/Other) and `notes` textarea to modal form

**Phase 7 — CCU FK Resolution + Camera Count Badges**
- `cameras.ts` POST/PUT: Lookup `ccu_uuid` from user-provided `ccu_id` via DB query (cameras reference CCUs by ID in the form but routes need UUID)
- CCUs page fetches cameras on mount and shows count badge on each CCU card
- `Cameras.tsx` uses `localCCUs` state from API (not Zustand store) for CCU dropdown

**Phase 8 — WebSocket Completeness for CCUs DELETE**
- `ccus.ts` DELETE route was missing `broadcastEntity('entity:deleted', ...)` — deleted CCUs weren't syncing across tabs
- Removed redundant `deleteCCU(id)` Zustand store call from `Cameras.tsx`

---

### Bug Fixes (Post-Phase Deployment)

#### Bug 1: 500 Error on CCU Create/Duplicate

**Symptom:** `POST /api/ccus` → 500 Internal Server Error, `Failed to create CCU`

**Root Cause:** `ccus.ts` POST handler passed `ccuData` (camelCase, e.g. `formatMode`, `equipmentUuid`) directly into `prisma.ccus.create({ data: ccuData })`. Prisma only accepts snake_case field names (e.g. `format_mode`, `equipment_uuid`).

**Fix:** Added `const snakeCaseData = toSnakeCase(ccuData)` before Prisma call. Added null-coalescing loop to convert empty strings to `null`.

**Why It Happened:** Rule #1 (TRANSFORMS ARE TRUTH) existed but didn't explicitly mandate that **route handlers** call `toSnakeCase` on input before Prisma. `cameras.ts` was the correct reference implementation but new routes don't inherently follow it.

**Rule Updated:** PROJECT_RULES.md Rule #1 now has explicit bullet: "⛔ API ROUTE HANDLERS: Every POST/PUT handler MUST call `toSnakeCase(inputData)` BEFORE Prisma."

---

#### Bug 2: Edit/Delete Fails for CCUs (404/Not Found)

**Symptom:** `handleEdit` and `handleDelete` on CCUs page silently failed or returned 404.

**Root Cause:** `CCUs.tsx` called `updateCCU(editingCCU.id, ...)` passing the display ID (e.g. `"CCU 1"`). The API route does `prisma.ccus.findUnique({ where: { uuid: ... } })` — it looks up by UUID, not by display ID. Passing the display string never matches.

**Background:** A "large-scale UUID changeover" was done in late February 2026, establishing that all entities have `uuid` (immutable DB primary key) AND `id` (user-editable display label). API routes use `/:uuid`. This pattern was implemented in routes but **not documented** in PROJECT_RULES.md, so it wasn't followed when new page components were written.

**Fix:** Changed all `update*(entity.id, ...)` and `delete*(entity.id)` calls in `CCUs.tsx` and `Cameras.tsx` to use `(entity as any).uuid`.

**Why It Happened:** Rule #10 (UUID AS PRIMARY KEY, ID AS DISPLAY) covered WebSocket and FK usage, but omitted the explicit mandate for page components calling API hooks.

**Rule Updated:** PROJECT_RULES.md Rule #10 now has explicit bullet: "⛔ PAGE COMPONENTS: When calling update*()/delete*() API hooks, ALWAYS pass `entity.uuid` (NOT `entity.id`)."

---

### Architectural Notes

**Dual-Key Entity System (Established Feb 22, 2026):**
- Every entity has `uuid` (DB `@id`, auto-generated, immutable) and `id` (display label, user-editable)
- DB routes: `PUT /api/entities/:uuid`, `DELETE /api/entities/:uuid`
- Frontend: `(entity as any).uuid` required in update/delete hook calls
- WebSocket broadcasts use `uuid` as `entityId` (immune to `.id` renames)

**toSnakeCase Route Handler Contract (Established March 1, 2026):**
- All API POST/PUT handlers must call `toSnakeCase(inputData)` before any `prisma.*.create/update`
- Reference implementation: `api/src/routes/cameras.ts` POST handler
- Failure mode: 500 "Invalid invocation" — Prisma rejects camelCase field names

---

### Fix equipmentUuid FK (spec.id → spec.uuid) — ✅ COMPLETE
**Cause:** Both `CCUs.tsx` `handleModelChange` and `Cameras.tsx` model select were setting `equipmentUuid: spec?.id` (the user-editable display ID) instead of `spec?.uuid` (the actual FK primary key). Prisma's FK constraint on `equipment_uuid` references `equipment_specs.uuid`, so passing a display ID caused a FK constraint violation → 500 on every create/save when a model was selected from the dropdown.  
**Files:** `src/pages/CCUs.tsx` line 186, `src/pages/Cameras.tsx` line 569  
**Fix:** `spec?.id` → `spec?.uuid` in both locations.

---

### ✅ Audit & Fix Sends + Signal Flow Routes/Pages — COMPLETE

**Scope:** sends, records, streams, led-screens, projection-screens, routers, vision-switchers, cam-switchers, cable-snakes — routes + hooks + pages

**All Fixed:**

**Routes - POST `productionId` → `production_id` (5 routes):**
- vision-switchers.ts, streams.ts, records.ts, led-screens.ts, projection-screens.ts ✅

**Routes - POST `validateProductionExists` guard (8 routes):**
- routers, vision-switchers, cam-switchers, cable-snakes, streams, records, led-screens, projection-screens ✅

**Routes - PUT `toSnakeCase(updates)` + `updated_at: new Date()` + `toCamelCase` response/WS (6 routes):**
- routers, vision-switchers, streams, records, led-screens, projection-screens ✅

**Routes - sends.ts PUT double-response dead code removed:** ✅

**Routes - cam-switchers.ts, cable-snakes.ts PUT `updated_at: new Date()` added:** ✅

**Hook interfaces - `uuid: string` added to Router, CableSnake, Stream:** ✅

**Pages - Routers.tsx UUID fix + WebSocket subscription:** ✅
- `editingId` → `editingUuid`, delete/update pass `.uuid` not `.id`, `key={router.uuid}`

**Pages - Snakes.tsx full API wiring:** ✅
- Replaced local-only state with `useCableSnakeAPI` + `useProductionEvents`

**Pages - Streams.tsx old-store source replaced:** ✅
- Replaced `oldStore.sends.filter(type=STREAM)` with `streamsAPI.fetchStreams(productionId)` + `useProductionEvents`

---

## February 27, 2026 - Media Servers: Drag-to-Reorder + No-Optimistic-Update Architecture

### Feature Overview
Implemented drag-and-drop reordering for media server pairs with a no-optimistic-update pattern to prevent race conditions and ensure database consistency.

### Requirements
1. **Drag-to-Reorder**: Users can drag server pair cards to reorder them
2. **Sequential Numbering**: First listed pair is always #1, second is always #2, etc.
3. **Single Source of Truth**: Database determines order, UI reflects database state

### Implementation Path

**Phase 1: HTML5 Drag API**
- Component: [MediaServers.tsx](video-production-manager/src/pages/MediaServers.tsx)
- Implementation:
  - Added `draggable={true}` to server pair cards
  - Handlers: `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`
  - `draggedPairNumber` state tracks which pair is being dragged
  - `onDrop`: Updates pairNumber for both main + backup servers via API
  - API: `PUT /api/media-servers/:id` with `{ pairNumber }` payload

**Phase 2: No-Optimistic-Update Pattern**
- **Decision**: Avoid optimistic UI updates to prevent race conditions
- **Pattern**: Database refetch after every mutation
- **Why**: With WebSocket sync + concurrent editing, optimistic updates can create inconsistencies
- **Implementation**:
  - After drag-drop mutation: `await fetchMediaServers()`
  - WebSocket broadcasts trigger same refetch in other tabs
  - Result: All clients stay in sync with database as single source of truth

**Phase 3: WebSocket Race Condition Protection**
- **Problem**: Drag operation triggers WebSocket update → refetch → disrupts ongoing drag
- **Solution**: Added `isDragInProgress` state
  - Set `true` in `onDragStart`, `false` in `onDragEnd`
  - WebSocket handlers check: `if (isDragInProgress) return;`
  - Prevents external updates from interfering with user's drag operation
  - Once drag completes, normal WebSocket sync resumes

### Bug Discovery: Pair Numbering Mismatch

**Initial Bug**
- Created 4th server pair
- Modal showed "Add Server 5 Pair" (expected behavior)
- After creation, modal showed "Add Server Pair #5" for next pair (incorrect - only 4 pairs exist)

**First Fix Attempt** 
- Changed pair calculation from `Math.max(pairNumbers) + 1` to counting complete pairs
- Logic: Count pairs with exactly 2 servers (main + backup)
- **Result**: Made it worse - modal now showed "Pair #2" when 4 pairs visible

**Debug Investigation**
- Added console.log to both main page and modal
- Main page: `12 total servers, 4 serverPairs displayed, pairNumbers: [1,2,3,4]`
- Modal: `12 total servers, allPairNumbers: [1,3,4,4,2,2,3,3,1,1,2,2], completePairsCount: 1`

**Root Cause: Duplicate Servers**
- Expected: 8 servers (4 pairs × 2 servers)
- Actual: 12 servers (duplicates from development testing)
- Distribution:
  - Pair 1: 3 servers (1 extra)
  - Pair 2: 4 servers (2 extra)
  - Pair 3: 3 servers (1 extra)
  - Pair 4: 2 servers (correct)
- Main page's grouping logic handled duplicates (overwrites with last server for each role)
- Modal's counting logic failed (only Pair 4 had exactly 2 servers → calculated "next = 2")

### Final Solution: Prop Passing Over Recalculation

**The Fix**
- **Main page** calculates `serverPairs.length + 1` from filtered complete pairs
- **Modal** receives this value as `nextPairNumber` prop
- **No recalculation** in modal - uses prop directly: `editingServer?.pairNumber || nextPairNumber || 1`

**Code Changes**
1. Interface: Added `nextPairNumber?: number` to `ServerPairModalProps`
2. Invocation: `<ServerPairModal nextPairNumber={serverPairs.length + 1} />`
3. Modal: Uses prop instead of recalculating from raw `mediaServers`

**Result**: Single source of truth for pair numbering calculation

### Cleanup: Duplicate Server Removal

**Created**: [scripts/cleanup-duplicate-servers.ts](video-production-manager/scripts/cleanup-duplicate-servers.ts)

**Strategy**:
- Group servers by `pairNumber` and `role` (main/backup)
- Keep most recent server (by `updatedAt`) for each role
- Delete older duplicates
- Verification: Ensures each pair has exactly 1 main + 1 backup

**Expected Result**: 12 servers → 8 servers (4 clean pairs)

### Architectural Learnings

**1. No-Optimistic-Update Pattern**
- **When to use**: WebSocket-synced entities with concurrent editing
- **Benefits**: 
  - Prevents race conditions between optimistic update and WebSocket broadcast
  - Database is always single source of truth
  - All clients guaranteed consistent state
- **Trade-off**: Slightly slower UI (wait for database response)
- **Implementation**: Refetch after mutations, let database determine state

**2. Prop Passing for Calculated Values**
- **Problem**: Two components calculating same value from different data can get different results
- **Cause**: Data inconsistencies (duplicates, race conditions, stale state)
- **Solution**: Calculate once where data is cleanest, pass as prop
- **Example**: Main page's `serverPairs` filters duplicates → modal receives clean count

**3. WebSocket + Drag-and-Drop Pattern**
- **Challenge**: External updates during user interaction
- **Solution**: Add interaction state lock (`isDragInProgress`)
- **Implementation**: WebSocket handlers check lock before applying updates
- **Result**: User interaction completes without interference, then sync resumes

**4. HTML5 Drag API Best Practices**
- Use semantic state: `draggedPairNumber` not generic `draggedItem`
- Track interaction lifecycle: `onDragStart` → `onDragEnd` (clears state even if drop fails)
- Prevent default on `onDragOver` to allow drop
- Update database in `onDrop`, not in drag handlers

### Files Modified
- [video-production-manager/src/pages/MediaServers.tsx](video-production-manager/src/pages/MediaServers.tsx): Drag implementation + prop passing fix
- [video-production-manager/scripts/cleanup-duplicate-servers.ts](video-production-manager/scripts/cleanup-duplicate-servers.ts): Duplicate removal script

### Testing Checklist
- ✅ Drag-and-drop reordering works
- ✅ Sequential numbering maintained after reorder
- ✅ No-optimistic-update pattern prevents race conditions
- ✅ WebSocket lock prevents interference during drag
- ✅ Modal shows correct next pair number
- ⏳ Cleanup script ready to execute
- ⏳ Post-cleanup testing needed

### Development Notes
- Duplicate servers accumulated during migration and early development
- With no-optimistic-update pattern, duplicates won't happen in production
- Each mutation refetches from database → consistency guaranteed
- User confirmed: will never have unpaired servers (always create in pairs)

---

## February 27, 2026 - Media Servers: Real-time Sync + UX Improvements

### Problem Path
1. **Initial Issue**: Media server creation crash - `outputs.length` on null
2. **Root Cause**: Field name mismatch (`outputs_data` vs `outputs`)
3. **After Fix**: New pairs didn't appear in other browser tabs until refresh
4. **Additional Issues**: React key prop warning, non-editable names, inconsistent output naming

### Investigation & Solutions

**Issue 1: Field Name Mismatch (Outputs Crash)**
- Database stores: `outputs_data` (Json) → API camelCase → `outputsData`
- TypeScript expects: `outputs` (Output[])
- **Solution**: Added `normalizeMediaServer()` helper in API routes
  - Transforms `outputs_data` → `outputs` on all responses
  - Ensures `outputs` defaults to `[]` (never null)
  - Applied to GET, POST, PUT routes + WebSocket broadcasts

**Issue 2: No Real-time Updates Between Browsers**
- **Root Cause**: [MediaServers.tsx](video-production-manager/src/pages/MediaServers.tsx) didn't subscribe to WebSocket events
- Other entity pages (Computers, Cameras, CCUs) use `useProductionEvents` hook
- **Solution**: 
  1. Added `'mediaServer'` to EntityEvent type in [useProductionEvents.ts](video-production-manager/src/hooks/useProductionEvents.ts)
  2. Imported and configured WebSocket handlers in MediaServers component
  3. Added handlers for `entity:created`, `entity:updated`, `entity:deleted`
  4. Updates flow directly to Zustand store → all tabs sync instantly

**Issue 3: React Key Prop Warning**
- **Location**: Layer output assignments map used `key={idx}` (array index)
- **Problem**: Indices aren't stable when list changes → React warnings
- **Solution**: Changed to `key={${assignment.serverId}-${assignment.outputId}}` (stable unique identifier)

**Issue 4: Non-Editable Server Names**
- **User Request**: "Make the name of the server pair editable but preloaded automatically"
- **Default Formula**: `MEDIA [1, 2, 3...]` progressively numbered
- **Solution**:
  - Added `name` field to ServerPairModal with default `MEDIA ${nextPairNumber}`
  - User can customize before saving or keep default
  - Updated `addMediaServerPair()` signature: `(name, platform, outputs, note)`
  - Names applied as: `${name} A` / `${name} B` for main/backup

**Issue 5: Output Naming Convention**
- **User Request**: "Append 'A' or 'B' respectively to the names of the outputs"
- **Previous**: Outputs named `MEDIA 1A.1`, `MEDIA 1B.1` (hardcoded pattern)
- **Solution**: 
  - Outputs now use user's custom name: `${name} A.1`, `${name} B.1`
  - Automatically updated when user changes name field
  - Applied in `handleAddOutput()`, `handleDuplicateOutput()`, and initial state

### Testing Performed
✅ Created server pair - appears instantly in all open browser tabs  
✅ Updated server pair - changes sync immediately  
✅ Deleted server pair - removal syncs across tabs  
✅ Custom names work correctly (e.g., "SERVER X" → "SERVER X A", "SERVER X B")  
✅ Output names follow custom base name + A/B suffix  
✅ No React key warnings in console  
✅ `outputs` field always array, never null

### Code Changes Summary
- [media-servers.ts](video-production-manager/api/src/routes/media-servers.ts): Added field normalization helper
- [useProductionEvents.ts](video-production-manager/src/hooks/useProductionEvents.ts): Added 'mediaServer' to event types
- [MediaServers.tsx](video-production-manager/src/pages/MediaServers.tsx): 
  - Added WebSocket event handlers
  - Fixed React key prop (index → unique ID)
  - Added editable name field to modal
  - Updated output naming convention
- [useProjectStore.ts](video-production-manager/src/hooks/useProjectStore.ts): Updated `addMediaServerPair()` to accept name parameter

---

## February 27, 2026 - Media Server Frontend Crash Fix (Field Name Mismatch)

### Problem
Frontend crashed on browser refresh with error:
```
MediaServers.tsx:213 Uncaught TypeError: Cannot read properties of null (reading 'length')
at pair.main.outputs.length
```

### Root Cause
Field name mismatch between database schema and TypeScript interface:
- Database field: `outputs_data` (Json) → camelCased to `outputsData`  
- TypeScript interface: expects `outputs` (Output[])
- Frontend code accessed `pair.main.outputs.length` but received `outputsData` from API

### Solution
Added field normalization in [media-servers.ts](api/src/routes/media-servers.ts):

```typescript
// Helper function transforms database → frontend format
function normalizeMediaServer(server: any) {
  const camelCased = toCamelCase(server);
  return {
    ...camelCased,
    outputs: camelCased.outputsData || [], // Ensure always array
    outputsData: undefined // Remove database field name
  };
}
```

Applied normalization to all routes:
- GET `/production/:productionId` → `.map(normalizeMediaServer)`
- POST `/` → `normalizeMediaServer(mediaServer)` 
- PUT `/:uuid` → `normalizeMediaServer(mediaServer)`
- WebSocket broadcasts → `normalizeMediaServer(mediaServer)`

### Testing
✅ API returns `outputs` field (not `outputsData`)  
✅ Default value: empty array `[]` (never null)  
✅ Frontend can safely access `.outputs.length`

---

## February 27, 2026 - Media Server UUID Fix (500 Error Resolution)

### Problem
Media server creation failed with 500 Internal Server Error. API logs showed:
```
❌ Error creating mediaServer: PrismaClientValidationError: 
Argument `uuid` is missing.
```

### Root Cause
During schema drift cleanup (to prevent migration crashes), the `@default(dbgenerated("gen_random_uuid()"))` directive was accidentally removed from `media_servers.uuid` field.

**Schema Comparison:**
```prisma
// ❌ BROKEN (media_servers)
uuid String @id

// ✅ CORRECT (all other entities)
uuid String @id @default(dbgenerated("gen_random_uuid()"))
```

### Solution
1. Added `@default(dbgenerated("gen_random_uuid()"))` to media_servers.uuid
2. Ran `npx prisma db push` to apply to database
3. Restarted API server to load new Prisma client

### Testing
✅ Created automated test: `api/scripts/test-media-servers.sh`  
✅ Manual API tests: 201 Created with auto-generated UUIDs  
✅ Servers persist in database correctly

### Documentation
Created `/docs/ENTITY_IMPLEMENTATION_FORMULA.md` - Complete repeatable pattern for adding new entity pages.

---

## February 26, 2026 - Media Server Creation Fix (Spread Operator Bug)

### Root Cause Discovery 🔍

**Context**: Media servers were appearing briefly in UI then immediately disappearing. API returned 500 error on creation. Identical pattern to "computers disappearing" bug previously fixed.

**Research Findings**:
- Searched git history: commit `908983a` fixed computers bug with array type checking
- Searched DEVLOG: media servers worked before API migration (commit `daf68ff`)
- Compared working entities (cameras, ccus, sources) vs broken (media servers)

**Key Discovery - Rule #6 Violation**:
```typescript
// ❌ BROKEN (media servers) - lines 1518-1522 in useProjectStore.ts
await apiClient.post('/media-servers', {
  ...mainServer,  // SPREADING entire object
  productionId: activeProject.production.id,
  userId,
  userName
});

// ✅ WORKING (cameras) - from useCamerasAPI.ts
const requestData = {
  id: input.id,
  productionId: input.productionId,
  name: input.name,
  model: input.model,
  // ... all fields explicitly listed
  userId,
  userName,
};
await apiClient.post<Camera>('/cameras', requestData);
```

**Why Spread Operators Fail**:
- When transformation goes wrong, strings iterate character-by-character
- Results in: `{0:'M', 1:'e', 2:'d', 3:'i', 4:'a'...}` instead of proper fields
- Prisma rejects with "Invalid invocation" showing numeric keys
- Violates PROJECT_RULES.md Rule #6: "NO SPREAD OPERATORS ON INPUT"

**Fix Strategy**:
- Replace `...mainServer` and `...backupServer` with explicit field lists
- Match pattern from working entities (cameras, sources, ccus)
- Ensure all JSONB fields (outputs) are properly structured

### Implementation

**Files Modified**:
- `video-production-manager/src/hooks/useProjectStore.ts` (lines 1518-1532)

**Changes Applied**:
```typescript
// BEFORE (broken):
const savedMainServer = await apiClient.post('/media-servers', {
  ...mainServer,  // ❌ String iteration risk
  productionId: activeProject.production.id,
  userId,
  userName
});

// AFTER (fixed):
const savedMainServer = await apiClient.post('/media-servers', {
  id: mainServer.id,
  name: mainServer.name,
  pairNumber: mainServer.pairNumber,
  isBackup: mainServer.isBackup,
  platform: mainServer.platform,
  outputs: mainServer.outputs,
  note: mainServer.note,
  productionId: activeProject.production.id,
  userId,
  userName
});
```

**Testing**: Ready to verify media server creation works correctly.

### Testing Plan
1. Open Media Servers page
2. Click "Add Media Server Pair"
3. Configure platform and outputs
4. Save and verify both A and B servers persist
5. Refresh page and confirm servers still present
6. Check database for proper uuid and outputs_data storage

### Results ✅

**Fix Committed**: `75f7ea0` - "fix: Remove spread operators from media server creation (Rule #6)"  
**Pushed to GitHub**: main branch  
**Status**: Implementation complete, ready for user testing

**What Changed**:
- Frontend explicitly lists all fields instead of spreading objects
- Prevents string iteration bug that caused `{0:'M', 1:'e'...}` errors
- Aligns with working pattern from cameras, sources, ccus entities
- Maintains proper JSONB handling for outputs field

**Next Steps for User**:
1. Test media server creation in UI
2. Verify persistence after refresh
3. Confirm no 500 errors in console
4. Report any issues

**Lesson Reinforced**: Rule #6 (No Spread Operators) is critical for API stability. Always explicitly list fields when sending data to API endpoints.

---

## February 25, 2026 - Checklist API Migration & Full Functionality (v0.0.3)

### Checklist Page Modernization - Complete ✅

**Context**: Completed comprehensive migration of Checklist page from Zustand store pattern to modern API-first architecture with real-time WebSocket synchronization. This brings checklists to feature parity with other entities (Sources, Cameras, etc.).

**Decision Path**:
- Previous sessions had checklists working but using old Zustand store pattern (local state only)
- Other entities (Sources, Cameras, Sends, CCUs) already migrated to API-first pattern in Phase 5
- Need consistency: all entities should use same architecture pattern (API + WebSocket)
- Goal: Checklists should sync in real-time across browsers like other entities

**Implementation**:

1. **Created `useChecklistAPI.ts` Hook** (New File)
   - Mirrors pattern from `useCamerasAPI`, `useSourcesAPI`, etc.
   - Implements CRUD operations:
     - `fetchChecklistItems()` - Get all items for production
     - `createChecklistItem()` - Add new item
     - `updateChecklistItem()` - Edit existing item with version conflict detection
     - `deleteChecklistItem()` - Remove item
     - `toggleChecklistItem()` - Quick complete/incomplete toggle
   - Includes user context (userId, userName) for all mutations
   - Returns `ConflictError` type for version mismatch handling

2. **Migrated Checklist.tsx to API Pattern**
   - **Removed**: Direct Zustand store access (`useProductionStore().checklist`)
   - **Added**: Local React state + API hook + WebSocket subscriptions
   - **Fetch on Mount**: Calls `fetchChecklistItems()` when production loads
   - **Real-time Sync**: `useProductionEvents` for `entity:created`, `entity:updated`, `entity:deleted`
   - **Optimistic Updates**: UI updates immediately, WebSocket confirms
   - **Conflict Resolution**: Detects version mismatches, alerts user, refetches data

3. **Fixed Data Structures** (Array Handling)
   - **Issue**: `moreInfo` and `completionNote` fields are JSONB arrays in DB
   - **Fix**: Ensured frontend always sends/receives arrays (not strings)
   - **Safety Checks**: `Array.isArray()` checks before array operations
   - **Append Pattern**: New entries append to existing arrays (don't replace)
   - Structure: `[{ id, text, timestamp, type }]`

4. **Enhanced Notes UI**
   - **Expand/Collapse**: Long notes (>80 chars) show "..." with click to expand
   - **Type Badges**: Color-coded "Info" (blue) vs "Completion" (green) notes
   - **Timestamp**: Human-readable format (e.g., "Feb 25, 3:45 PM")
   - **Delete Button**: Per-note deletion with immediate update
   - **Scrollable History**: Max height with overflow for long histories

5. **UUID Matching Throughout**
   - Changed all item lookups from `.id` to `.uuid` (PRIMARY KEY)
   - Field `.id` remains user-editable identifier (e.g., "chk-1234567890")
   - WebSocket events match by `uuid` for reliability
   - Prevents duplicate entries and ensures proper sync

6. **Added Debug Logging** (checklist-items.ts API routes)
   - Logs data types at each transformation stage:
     - Raw from database (snake_case JSONB)
     - After `toCamelCase()` transformation
     - Sent in response
   - Helps diagnose array vs string issues
   - Can be removed in future cleanup if no longer needed

**Files Modified**:
- `video-production-manager/src/hooks/useChecklistAPI.ts` - NEW FILE (145 lines)
- `video-production-manager/src/pages/Checklist.tsx` - Complete rewrite (1,100+ lines)
- `video-production-manager/api/src/routes/checklist-items.ts` - Added debug logging

**Testing Status**: READY FOR TESTING
- [ ] Test 2 from MULTI_BROWSER_SYNC_TEST.md needs re-run
- [ ] Verify: Create checklist item in Browser A → appears in Browser B
- [ ] Verify: Edit notes appends correctly, shows in both browsers
- [ ] Verify: Toggle complete/incomplete syncs instantly
- [ ] Verify: Delete syncs immediately
- [ ] Verify: Version conflict detection shows alert

**Version**: v0.0.3

---

## February 25, 2026 - Media Servers Migration Started

### Schema Design for Playback Pairs

**Context**: Beginning API migration for media_servers table. Adding fields to support paired playback server architecture (primary + backup pairs).

**Schema Updates** (WIP):
- `pair_number` - INT: Identifies which pair (e.g., Pair 1, Pair 2)
- `is_backup` - BOOLEAN: True for backup server, false for primary
- `platform` - STRING: e.g., "Disguise", "Resolume", "Watchout"
- `outputs_data` - JSONB: Structured output configuration per server
- Added composite index: `(production_id, pair_number)`

**Status**: Schema defined, not yet migrated. Code updates pending.

**Next Steps**:
1. Generate Prisma migration
2. Apply to local database
3. Update media-servers.ts routes
4. Update MediaServers.tsx frontend
5. Update useMediaServersAPI hook
6. Test locally, then deploy

---

## February 22, 2026 - UUID Architecture Migration

### ID vs UUID Conflict Resolution

**Context**: Investigation revealed architectural conflict - `id` field is user-editable (can rename "SRC 1" → "SRC A") but was being used as PRIMARY KEY, causing sync issues and preventing ID changes.

**Root Cause Analysis**:
- **Feb 10, 2026**: UUID migration attempted but rolled back due to crashes
- **Feb 21, 2026**: ENTITY_DATA_FLOW_STANDARD.md created saying "use id as PRIMARY KEY"
- **Feb 21, 2026**: Sources.tsx updated to use `.id` for matching (assumes immutable)
- **Conflict**: User requirement is that ID is editable, but PRIMARY KEY must be immutable

**Historical Context** (from UUID_MIGRATION_RECOVERY.md):
- Original design: UUID as PRIMARY KEY, id as user-friendly display field
- Migration crashed: Code expected uuid, database didn't have it
- Rolled back: Used id as PRIMARY KEY (violated design intent)
- User confirmed: IDs should be editable, need proper UUID implementation

**Approved Solution** (Standard Industry Pattern):
- **uuid**: Auto-generated PRIMARY KEY by Postgres (@default(uuid()))
- **id**: User-editable display field (unique within production)
- **WebSocket**: Uses uuid for reliable matching (immutable)
- **Frontend**: Creates without uuid, receives it from database

**Reference Documentation**: [UUID_ARCHITECTURE_SOLUTION_2026-02-22.md](../../docs/incident-reports/UUID_ARCHITECTURE_SOLUTION_2026-02-22.md)

---

### Migration Progress Tracker

**Status**: � IN PROGRESS - sources Table Migration Underway

**Phase 1: sources Table (Pilot)**

| Step | Status | Description | Started | Completed |
|------|--------|-------------|---------|-----------|
| 1.1 | ✅ Complete | Add uuid column (nullable) | Feb 22, 2026 05:10 | Feb 22, 2026 05:10 |
| 1.2 | ✅ Complete | Populate uuid for existing rows | Feb 22, 2026 05:12 | Feb 22, 2026 05:12 |
| 1.3 | ✅ Complete | Add source_uuid columns to FKs | Feb 22, 2026 05:13 | Feb 22, 2026 05:14 |
| 1.4 | ✅ Complete | Populate source_uuid references | Feb 22, 2026 05:14 | Feb 22, 2026 05:14 |
| 1.5 | ✅ Complete | Make uuid PRIMARY KEY, update FKs | Feb 22, 2026 05:15 | Feb 22, 2026 05:15 |
| 1.5 | ⬜ Not Started | Update sources.ts routes | - | - |
| 1.6 | ⬜ Not Started | Update Sources.tsx frontend | - | - |
| 1.7 | ⬜ Not Started | Update useSourcesAPI hook | - | - |
| 1.8 | ⬜ Not Started | Update TypeScript types | - | - |
| 1.9 | ⬜ Not Started | Test locally (6 test cases) | - | - |
| 1.10 | ⬜ Not Started | Deploy to Railway | - | - |
| 1.11 | ⬜ Not Started | Monitor 24 hours | - | - |

**Safety Lessons from Feb 10 Crash**:
- ✅ ONE table at a time (not all at once)
- ✅ Document each step before executing
- ✅ Test locally with production data copy
- ✅ Verify Railway deploy before next table
- ✅ Track progress to prevent partial completions
- ✅ Can pause/rollback at any step

**Remaining Tables** (after sources verified):
- ⬜ sends
- ⬜ ccus
- ⬜ cameras
- ⬜ connections
- ⬜ checklist_items
- ⬜ cable_snakes
- ⬜ routers
- ⬜ ... (all other entity tables)

**Migration Log** (detailed step-by-step tracking):

```
[Timestamp] [Step] [Status] [Details]
-------------------------------------------------------------------------
[2026-02-22 05:10] [1.1] [STARTED] Adding nullable uuid column to sources table
[2026-02-22 05:10] [1.1] [SUCCESS] Migration 20260222051017_add_uuid_column_to_sources created and applied
                                     SQL: ALTER TABLE "sources" ADD COLUMN "uuid" TEXT;
                                     Database and schema now in sync
[2026-02-22 05:12] [1.2] [STARTED] Populating uuid for all existing sources
[2026-02-22 05:12] [1.2] [SUCCESS] Migration 20260222051203_populate_source_uuids applied
                                     SQL: UPDATE sources SET uuid = gen_random_uuid() WHERE uuid IS NULL;
                                     All existing sources now have UUIDs
[2026-02-22 05:13] [1.3] [STARTED] Adding source_uuid columns to connections and source_outputs
[2026-02-22 05:13] [1.3] [SUCCESS] Migration 20260222051352_add_source_uuid_to_referencing_tables applied
                                     SQL: ALTER TABLE "connections" ADD COLUMN "source_uuid" TEXT;
                                          ALTER TABLE "source_outputs" ADD COLUMN "source_uuid" TEXT;
[2026-02-22 05:14] [1.4] [STARTED] Populating source_uuid in referencing tables
[2026-02-22 05:14] [1.4] [SUCCESS] Migration 20260222051408_populate_source_uuid_references applied
                                     Joined with sources table to copy uuid values
[2026-02-22 05:15] [1.5] [STARTED] CRITICAL: Making uuid PRIMARY KEY on sources, updating all FK constraints
[2026-02-22 05:15] [1.5] [SUCCESS] Migration 20260222051530_make_uuid_primary_key_on_sources applied
                                     - Made sources.uuid NOT NULL
                                     - Made source_outputs.source_uuid NOT NULL
                                     - Dropped old FK constraints
                                     - Changed PRIMARY KEY from id to uuid
                                     - Added UNIQUE constraint on (production_id, id)
                                     - Created new FK constraints pointing to uuid
                                     - Updated indices
                                     DATABASE MIGRATION PHASE COMPLETE ✅
[2026-02-22 05:24] [BUG FIX] Found missing DEFAULT constraint on uuid column
                              Error 23502 (NOT NULL violation) when creating sources
                              Migration 20260222052400_add_uuid_default_constraint applied
                              Added: ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()
                              uuid now auto-generates on INSERT ✅
```

---

## February 21, 2026 - Systematic Entity Data Flow Standardization

### Test 4 Source Sync - Revealed Systemic Pattern Violations

**Context**: Started Test 4 (Source Sync) and immediately hit 500 errors. Investigation revealed the camera sync fix from Feb 12 was never propagated to other entities, causing circular recurring bugs.

**Root Cause Analysis**:
- **Immediate Issue**: sync-helpers.ts emitted entity-specific events (`source:created`, `send:created`) but frontend listens for generic events (`entity:created`)
- **Systemic Issue**: Pattern violations recurring despite documentation in PROJECT_RULES.md
- **Historical Pattern**: Identical bug was fixed for cameras Feb 12 (Bug 3.2) but pattern wasn't enforced for new/existing entities
- **Affected Routes**: 6 routes using sync-helpers.ts (sources, sends, ccus, connections, checklist-items, ip-addresses)

**Systematic Solution Implemented**:

1. **Fixed sync-helpers.ts** - Changed from entity-specific to generic events:
   ```typescript
   // BEFORE (WRONG):
   const event = `${entityType}:created`;  // Creates "source:created"
   io.to(room).emit(event, data);
   
   // AFTER (CORRECT):
   const event = 'entity:created';  // Generic event
   io.to(room).emit(event, {
     entityType,
     entityId,
     entity: data
   });
   ```

2. **Fixed Sources.tsx** - Replaced `.uuid` references with `.id`:
   - Line 77: Changed duplicate check from `s.uuid` to `s.id` (PRIMARY KEY)
   - Line 89: Changed update matching from `s.uuid` to `s.id`
   - Line 96: Changed delete filtering from `s.uuid` to `s.id`
   - Removed all console.log references to uuid field

3. **Created Enforcement Mechanisms**:
   - **Validation Script**: `scripts/validate-entity-pattern.sh` checks:
     - ✅ WebSocket events use generic pattern (`entity:*` not `source:*`)
     - ✅ Frontend doesn't use `.uuid` field
     - ✅ sync-helpers.ts emits correct event names
     - ⚠️ API routes use toCamelCase (tracked as technical debt)
   - **Documentation**: Created [ENTITY_DATA_FLOW_STANDARD.md](../../docs/ENTITY_DATA_FLOW_STANDARD.md) with:
     - Complete 4-layer pattern (Database → API → Hooks → Pages)
     - Copy-paste templates for all layers
     - 22-point checklist for new entities
     - Migration plan for existing violations
   - **PROJECT_RULES.md**: Added Pillar #9 referencing standard and validation script

**Pattern Audit Results** (83 broadcast calls):
- ✅ **9 routes correct**: cameras, routers, cable-snakes, projection-screens, streams, records, media-servers, led-screens, vision-switchers
- ❌ **6 routes fixed**: sources, sends, ccus, connections, checklist-items, ip-addresses (via sync-helpers fix)
- ✅ **2 domain-specific**: productions (production:*), settings (settings:*) - correctly different

**Files Modified**:
- `video-production-manager/api/src/utils/sync-helpers.ts` - Fixed all 3 broadcast functions to emit generic events
- `video-production-manager/src/pages/Sources.tsx` - Changed .uuid to .id throughout
- `video-production-manager/docs/PROJECT_RULES.md` - Added Pillar #9, updated date to Feb 21, 2026
- `scripts/validate-entity-pattern.sh` - New validation script (executable)
- `docs/ENTITY_DATA_FLOW_STANDARD.md` - Complete reference implementation and checklist

**Success Criteria Met**:
- ✅ All 6 affected routes now use correct pattern
- ✅ Validation script passes all checks
- ✅ Pattern documented in 3 places (STANDARD, PROJECT_RULES, DEVLOG)
- ✅ Enforcement mechanism prevents future violations

**Next Steps**:
- Run Test 4 (Source Sync) to verify fix works end-to-end
- Continue Phase 5 multi-browser testing (Tests 5-10)
- Track toCamelCase technical debt for future cleanup session

---

## February 12, 2026 (Late Evening Session)

### Test 3: Camera Sync Complete ✅

**Context**: Completed Test 3 of Phase 5 multi-browser testing. Fixed two critical camera sync bugs.

**Issues Fixed**:

1. **Camera Delete Not Persisting** (Bug 3.1):
   - **Problem**: Camera deleted in Browser A reappeared after refresh
   - **Root Cause**: `handleDelete` only updated local state, didn't call API
   - **Fix**: Updated `handleDelete` to `async` function that calls `camerasAPI.deleteCamera()` before updating local state
   - **Commit**: 5d54e6e - "Fix camera delete to call API before updating local state"

2. **Real-Time Sync Not Working** (Bug 3.2):
   - **Problem**: Camera CRUD operations only visible after manual refresh
   - **Root Cause**: Camera API routes emitted specific `camera:created/updated/deleted` events, but frontend listened for generic `entity:created/updated/deleted` events
   - **Pattern Mismatch**: Sources, Sends, CCUs all use generic events; cameras was inconsistent
   - **Fix**: Updated cameras.ts routes to emit generic entity events matching pattern:
     - Changed: `broadcastEntityCreated()` → `io.to().emit('entity:created', {entityType: 'camera', ...})`
     - Changed: `broadcastEntityUpdate()` → `io.to().emit('entity:updated', {entityType: 'camera', ...})`
     - Changed: `broadcastEntityDeleted()` → `io.to().emit('entity:deleted', {entityType: 'camera', ...})`
   - **Commit**: c3b747f - "Fix camera WebSocket sync by using generic entity events"

**Test Results**: ✅ ALL PASSING
- ✅ Camera creation syncs instantly across browsers
- ✅ Camera edits sync in real-time without refresh
- ✅ Camera deletions sync immediately and persist through refresh
- ✅ No duplicates, no orphaned data
- ✅ Version conflicts detected properly

**Files Modified**:
- `video-production-manager/src/pages/Cameras.tsx` - Fixed handleDelete to call API
- `video-production-manager/api/src/routes/cameras.ts` - Standardized WebSocket events
- `docs/testing/MULTI_BROWSER_TESTING_PROCEDURES.md` - Documented bugs and fixes

**Next Steps**: Proceed to Test 4 (Source Sync) in next session

---

## February 12, 2026 (Evening Session)

### Multi-Browser Sync Testing - Test 2 Complete, Test 3 Camera Sync Fix ✅

**Context**: Continued Phase 5 multi-browser testing suite. Test 2 (Checklist sync) passed after bug fixes. Test 3 (Camera sync) revealed cameras weren't syncing across browsers.

**Test 2 (Checklist) - PASSING** ✅:
- Fixed 3 bugs from initial test:
  - Bug 2.1: Navigation issue (shows Media Servers instead of Dashboard) - Added `setActiveTab('dashboard')` on show open
  - Bug 2.2: Preference conflict warnings - Removed project-specific UI preferences, use global usePreferencesStore only  
  - Bug 2.3: Edit sync missing API call - Made updateChecklistItem async, added WebSocket broadcast
  - Bug 2.3b: Field name mismatch - Changed `item` to `title` in update payload
  - Bug 2.3c: Notes data format - Database columns already JSONB, fixed frontend to send JSON arrays instead of strings
- All checklist operations now sync correctly: add, delete, complete/incomplete, reveal/collapse, edit (title, assignTo, days, notes)
- Regenerated Prisma Client after schema was updated to recognize JSON columns

**Test 3 (Camera) - Fixed** ✅:
- **Issue**: Camera created in Browser A didn't sync to Browser B; refresh on A deleted the camera
- **Root Cause**: Cameras page wasn't using `useCamerasAPI` hook - only updating local state, no API call/WebSocket broadcast
- **Analysis**: Same pattern previously solved for Sources, Sends, CCUs - some entities weren't migrated to new API architecture
- **Solution Implemented**:
  1. Integrated `useCamerasAPI` hook into Cameras page
  2. Updated `handleSave` to:
     - Call `camerasAPI.createCamera()` for new cameras (properly saves to database)
     - Call `camerasAPI.updateCamera()` for edits (with version conflict detection)
     - Perform optimistic updates to local state for responsive UI
  3. Added `useProductionEvents` WebSocket listener:
     - `onEntityCreated`: Add camera to local state when created by other users
     - `onEntityUpdated`: Update camera when edited by other users
     - `onEntityDeleted`: Remove camera when deleted by other users
  4. Updated `useCamerasAPI` interface to support:
     - Custom IDs (e.g., "CAM 1", "CAM 2") - added `id?` optional field
     - Model field from equipment specs - added `model?` field
  5. Switched component to use `localCameras` state that syncs via WebSocket instead of direct store access

**UI Improvements** ✨:
1. **Search Bar Clear Buttons**: Added X icon to all search fields across app to clear search and release filters
   - Files modified: Checklist, Equipment, Logs, IPManagement, Sources, Sends (both search bars)
   - Pattern: Relative container with absolute positioned X button (only shows when text entered)
   
2. **Checklist Page Redesign**:
   - Added search bar below summary card (searches: title, notes, assignedTo)
   - Converted category quick-select buttons to dropdown list (cleaner, matches Equipment page)
   - Integrated completion counters into group titles (e.g., "Screens (3/5)")
   - Repositioned Add Item button to far right of group headers (larger, more prominent)
   - Moved progress bar between counter and Add button

**Files Modified**:
- `src/pages/Cameras.tsx`: Integrated useCamerasAPI and useProductionEvents for sync
- `src/hooks/useCamerasAPI.ts`: Added `id?` and `model?` fields to CreateCameraInput interface
- `src/pages/Checklist.tsx`: Search bar, dropdown, UI layout improvements
- `src/pages/Equipment.tsx`: Added search clear button
- `src/pages/Logs.tsx`: Added search clear button (with X import)
- `src/pages/IPManagement.tsx`: Added search clear button (with X import)
- `src/pages/Sources.tsx`: Added search clear button (with X import)
- `src/pages/Sends.tsx`: Added search clear buttons (2 locations - sends and projection screens, with X import)

**Git Commits**:
- `48bf9d3` - Fix checklist notes data format - send JSON arrays to API instead of raw strings
- `66efaae` - Improve checklist UI: add search bar, convert category buttons to dropdown, integrate counters into group titles
- `96e877a` - Add X clear button to all search fields across application
- `6b06d5e` - Fix Camera sync: integrate useCamerasAPI and useProductionEvents for proper database save and WebSocket broadcast

**Testing Status**:
- ✅ Test 2: Checklist Sync - PASSING (all features work, notes now display correctly)
- ✅ Test 3: Camera Sync - READY FOR RETEST (API integration complete, needs user verification)
- ⏭️ Tests 4-10: Pending (Source, Send, CCU, Connections, Offline, Conflicts, Rapid Updates)

**Key Architectural Pattern Confirmed**:
- **Preference vs Data Sync**:
  - UI preferences (collapse/expand, theme, tabs) → `usePreferencesStore` (localStorage, user-specific, NOT synced)
  - Production data (entities, settings) → `useProjectStore`/`useProductionStore` (database, WebSocket synced)
  - Pattern applies to all current and future components

**Next Session**:
- Verify Test 3 camera sync works across browsers
- Continue with Tests 4-10 from MULTI_BROWSER_TESTING_PROCEDURES.md
- Monitor for any other entities missing API integration pattern

---

## February 12, 2026 (Morning Session)

### VS Code Crash - Zombie Process Migration Failure ❌
- **Context**: VS Code crashed (SIGKILL exit code 137) during database migration attempt
  - Pattern: Recurring crash issue documented in CRASH_AUDIT_2026-01-30.md
  - Exit code 137 = SIGKILL = forced termination due to memory pressure
  - **Root cause**: 6+ zombie Prisma processes from previous sessions consuming resources

- **Investigation Process** (Protocol-Driven):
  1. Reviewed AI_AGENT_PROTOCOL.md crash prevention guidelines
  2. Reviewed CRASH_AUDIT_2026-01-30.md and DB_DEVELOPMENT_LESSONS.md
  3. Checked running processes: `ps aux | grep -E '(prisma|tsx|vite|node)'`
  4. Discovered critical evidence:
     - PID 26833: schema-engine running since **Monday 7PM** (40+ hours!) consuming **103.7% CPU**
     - PID 48424: Prisma Studio running from terminal (**protocol violation**)
     - PID 50257, 40782, 33997, 32601, 58205: Five **hung migration processes**
     - Total: 6+ zombie processes + active dev servers

- **Root Cause Analysis**:
  - **Primary**: No pre-migration cleanup - zombie processes accumulated over multiple sessions
  - **Secondary**: Prisma Studio running from terminal (explicitly forbidden by existing protocol)
  - **Tertiary**: Multiple concurrent migration attempts (each hung, never terminated)
  - **Result**: New migration spawned while 6 others hung → memory exhaustion → SIGKILL
  
- **Protocol Violation Assessment**:
  - Existing documentation **was available** in 3 files:
    - [CRASH_AUDIT_2026-01-30.md](../docs/CRASH_AUDIT_2026-01-30.md#L56): "Never run Prisma Studio from terminal"
    - [DB_DEVELOPMENT_LESSONS.md](../docs/DB_DEVELOPMENT_LESSONS.md#L142): "Check memory before operations"
    - [AI_AGENT_PROTOCOL.md](../_Utilities/AI_AGENT_PROTOCOL.md#L454): "Sequential operations only"
  - **Problem**: Documentation alone insufficient - protocols not being executed as checklists
  - **Solution**: Automated enforcement required

- **Solutions Implemented**:
  
  1. **Immediate Remediation**:
     - Killed all zombie processes: `pkill -9 -f 'prisma migrate|prisma studio|schema-engine'`
     - Verified cleanup: `ps aux | grep -E '(prisma|schema-engine)' | grep -v grep` → 0 processes
  
  2. **Created Pre-Migration Safety Script**:
     - File: [api/scripts/pre-migration-check.sh](api/scripts/pre-migration-check.sh)
     - Automated 6-step pre-flight checklist:
       1. ✅ Detect and terminate zombie Prisma processes
       2. ✅ Validate Prisma schema
       3. ✅ Test database connection
       4. ✅ Check available system memory (requires 500MB+)
       5. ✅ Warn about concurrent heavy processes
       6. ✅ Verify migrations directory exists
     - **Usage**: `./scripts/pre-migration-check.sh && npx prisma migrate dev --name migration_name`
     - Made executable: `chmod +x`
  
  3. **Enhanced AI_AGENT_PROTOCOL.md**:
     - Added comprehensive "Database Migration Safety Protocol" section
     - **Pre-Migration Mandatory Checklist** with explicit commands
     - **Migration Execution Rules** (❌ NEVER / ✅ ALWAYS lists)
     - **Common Migration Crash Scenarios** with prevention/recovery steps
     - **Post-Migration Verification** procedures
     - Integration point: After "Process Management" section (line ~480)
  
  4. **Updated DB_DEVELOPMENT_LESSONS.md**:
     - Added "CRITICAL: February 12, 2026 - Zombie Process Migration Crash" section
     - Documented all 7 zombie processes with PIDs and start times
     - Listed specific protocol violations with file references
     - Explained why protocols weren't followed (lack of automation)
     - Detailed new mandatory protocol for all migrations
     - Added testing verification commands
  
  5. **New Mandatory Workflow**:
     ```bash
     # BEFORE every migration
     ./scripts/pre-migration-check.sh
     
     # DURING migration
     # Monitor for completion, no other heavy operations
     
     # AFTER migration
     ps aux | grep -E '(prisma|schema-engine)' | grep -v grep
     # Must return 0 processes
     ```

- **Key Lessons**:
  - **Documentation ≠ Execution**: Even with detailed protocols, manual checklists get skipped
  - **Automation Required**: Crash-prone operations need automated pre-flight checks
  - **Zombie Detection**: Processes can hang for days silently consuming resources
  - **Exit Code 137**: Always means SIGKILL from memory pressure - check for resource hogs first
  - **Protocol Consolidation**: Migration rules now centralized in AI_AGENT_PROTOCOL with mandatory script

- **Files Modified**:
  - Created: [api/scripts/pre-migration-check.sh](api/scripts/pre-migration-check.sh) (new automated safety check)
  - Updated: [_Utilities/AI_AGENT_PROTOCOL.md](../_Utilities/AI_AGENT_PROTOCOL.md) (new Database Migration Safety Protocol section)
  - Updated: [docs/DB_DEVELOPMENT_LESSONS.md](../docs/DB_DEVELOPMENT_LESSONS.md) (February 12 incident documentation)
  - Updated: [DEVLOG.md](DEVLOG.md) (this entry)

- **Prevention Going Forward**:
  - ✅ Run `./scripts/pre-migration-check.sh` before EVERY migration (mandatory)
  - ✅ AI agents must execute automated checks, not just read protocols
  - ✅ Never run Prisma Studio from integrated terminal (use VS Code extension)
  - ✅ Always verify 0 zombie processes after any Prisma operation
  - ✅ Treat exit code 137 as "check for zombie processes" signal

- **System Status**:
  - ✅ All zombie processes terminated
  - ✅ Pre-migration safety script created and tested
  - ✅ Protocols updated with mandatory automation
  - ✅ Dev servers running cleanly (API: 3010, Frontend: 3011)
  - ⚠️  Database migration that triggered crash NOT completed - needs retry with safety script

- **Next Steps**:
  - If migration still needed: Run `./scripts/pre-migration-check.sh` first
  - Test automated safety script in next migration workflow
  - Consider adding pre-commit hook to catch hung processes
  - Monitor for protocol compliance in future sessions

---

## February 10, 2026

### Railway Deployment Crash Fix - Seed Process Issue
- **Context**: VS Code hung and crashed during previous session; Railway API deployment returning 502 Bad Gateway
  - API server not responding: `{"status":"error","code":502,"message":"Application failed to respond"}`
  - Last commits were error handlers for unhandled rejections/exceptions
  - TypeScript compilation clean locally (0 errors)

- **Investigation Process** (Protocol-Driven):
  1. Linked Railway CLI to VideoDept-API service
  2. Verified environment variables: DATABASE_URL, ENABLE_MDNS=false, NODE_ENV=production ✅
  3. Confirmed Prisma migrations exist (6 migrations including signal flow models from Feb 9) ✅
  4. Reviewed nixpacks.toml start command ✅
  5. Identified local build passes cleanly ✅

- **Root Cause Discovered**:
  - Nixpacks start command: `npx prisma migrate deploy && npm run seed:all && npm run start`
  - `seed:all` script runs `seed:equipment` which first calls `equipment:export`
  - `equipment:export` attempts to read from database BEFORE seeding
  - Fails on fresh Railway deployments where no data exists yet
  - Process crashes, server never starts, returns 502

- **Solution Implemented**:
  - Changed nixpacks.toml start command to use `seed:all:prod` instead of `seed:all`
  - `seed:all:prod` skips export step and seeds directly from equipment-data.json
  - Proper sequence: migrate → seed from JSON → start server

- **Fix Applied**:
  ```toml
  [start]
  cmd = 'npx prisma migrate deploy && npm run seed:all:prod && npm run start'
  ```
  - Committed: `b110a35` - "fix: use seed:all:prod to avoid export step in Railway deployment"
  - Pushed to trigger automatic Railway redeployment

- **Key Lessons**:
  - Production seed scripts must not depend on existing database data
  - Railway deployments are ephemeral - always seed from static files
  - 502 errors indicate app crash during startup, not build failure
  - Protocol-driven investigation (link CLI → check vars → verify migrations → review config) efficiently identified issue

---

### Complete baseEntity Signal Flow Architecture - TypeScript Compilation Fixed
- **Context**: Railway deployment failing due to TypeScript build errors (exit code 2)
  - Initial symptom: 72 TypeScript compilation errors blocking production deployment
  - Root cause investigation revealed: Prisma client naming mismatch, not missing models
  - Discovery: All 9 signal flow models already existed in schema, only route files needed alignment

- **Investigation & Analysis**:
  - Identified 54 errors from unused route files (incorrect Prisma client references)
  - Identified 18 errors from active routes (field name mismatches, type casting issues)
  - Verified all 9 baseEntity models present in schema: cable_snakes, cam_switchers, vision_switchers, led_screens, media_servers, projection_screens, records, routers, streams
  - Verified all EventType enum values already exist (CAM_SWITCHER, VISION_SWITCHER, RECORD, STREAM)
  - Confirmed transform utilities (toCamelCase/toSnakeCase) properly established

- **Implemented Fixes** (following sources.ts pattern):
  1. **Prisma Client References** - Fixed all 9 route files
     - `prisma.cableSnake` → `prisma.cable_snakes`
     - `prisma.camSwitcher` → `prisma.cam_switchers`
     - `prisma.mediaServer` → `prisma.media_servers`
     - `prisma.visionSwitcher` → `prisma.vision_switchers`
     - `prisma.ledScreen` → `prisma.led_screens`
     - `prisma.projectionScreen` → `prisma.projection_screens`
     - `prisma.record` → `prisma.records`
     - `prisma.router` → `prisma.routers`
     - `prisma.stream` → `prisma.streams`
  
  2. **Database Field Names** - WHERE/ORDER BY clauses updated to snake_case
     - `productionId` → `production_id`
     - `isDeleted` → `is_deleted`
     - `createdAt` → `created_at`
     - Applied to all query constructions across 9 route files
  
  3. **Property Access Fixes** - Post-query entity object references
     - `entity.productionId` → `entity.production_id` in recordEvent() calls
     - Fixed in led-screens.ts, projection-screens.ts, records.ts
     - Ensures proper access to Prisma-returned snake_case fields
  
  4. **Active Route Corrections**:
     - [validation-helpers.ts:47](api/src/utils/validation-helpers.ts) - sources query uses `uuid` not `id` (sources table special case)
     - [settings.ts:510](api/src/routes/settings.ts) - added required `id`, `updated_at` fields to upsert, added crypto import
     - [equipment.ts](api/src/routes/equipment.ts) - fixed relation name `equipment_card_io` (was equipment_io_ports), added required fields
     - [admin.ts:184](api/src/routes/admin.ts) - FieldVersions type casting with `as unknown` intermediate, currentData declared as `any`
     - [productions.ts:232](api/src/routes/productions.ts) - FieldVersions type casting fix
  
  5. **Server Configuration**:
     - [server.ts:258-266](api/src/server.ts) - Uncommented all 9 route imports
     - [server.ts:281-289](api/src/server.ts) - Enabled all 9 route registrations
     - All signal flow endpoints now active: /api/cable-snakes, /api/cam-switchers, etc.
  
  6. **Build Configuration Cleanup**:
     - [package.json:8](api/package.json) - Restored clean build script: `"build": "tsc"`
     - [tsconfig.json](api/tsconfig.json) - Removed temporary `"noEmitOnError": false` workaround
     - TypeScript now properly enforces type safety during build

- **Validation Results**:
  - ✅ TypeScript compilation: **0 errors**, exit code 0
  - ✅ Build produces clean dist/ folder with all route files
  - ✅ All 9 signal flow routes enabled and registered
  - ✅ Transform pipeline intact: API (camelCase) ↔ Database (snake_case)
  - ✅ baseEntity pattern complete: id, production_id, created_at, updated_at, version, is_deleted, last_modified_by, synced_at

- **Architecture Pattern Confirmed**:
  ```typescript
  // Example: led-screens route
  const ledScreen = await prisma.led_screens.findUnique({
    where: { id, is_deleted: false }
  });
  await recordEvent({
    productionId: ledScreen.production_id, // ← snake_case from DB
    eventType: EventType.LED_SCREEN
  });
  io.emit('entity:created', {
    entity: toCamelCase(ledScreen) // ← Transform before sending to frontend
  });
  ```

- **Key Lessons**:
  - Prisma client property names mirror table names exactly (snake_case from schema)
  - Database returns snake_case fields, must be accessed with snake_case in TypeScript
  - Transform utilities convert at API boundary, not within route logic
  - Systematic sed/perl replacements effective for bulk fixes, multi_replace for precision
  - Protocol-driven investigation prevented premature implementation of unnecessary features

- **Ready for Deployment**:
  - All TypeScript errors resolved
  - Build configuration clean (no workarounds)
  - All 9 signal flow entity types operational
  - Ready to test on Railway production environment

---

## February 9, 2026

### Session Initialization & Protocol Review
- **Context**: New session start after gap since Feb 3
  - Database migrations verified: 6 migrations applied, schema up to date
  - Ports cleared (3010 API, 3011 Frontend)
  - Previous migration attempt (`add_signal_flow_models`) encountered error but database is now in sync
  
- **Protocol Review**: Reviewed all standardized procedures
  1. **SESSION_START_PROTOCOL.md** - 5-phase startup checklist for session initialization
  2. **AI_AGENT_PROTOCOL.md** - Universal development protocol (v2.0, database workflows, session tracking)
  3. **PROTOCOL.md** - Project-specific rules (logging standards, browser tab management, port config)
  4. **SESSION_JOURNAL.md** - Historical work tracking system with prompt IDs, milestones, and crash recovery
  
- **Key Protocols Confirmed**:
  - ✅ Structured logging (DEBUG, INFO, WARN, ERROR, CRITICAL) for UI log viewers
  - ✅ No auto-opening browser tabs
  - ✅ Auto-restart servers after major updates
  - ✅ Fixed ports: API:3010, Frontend:3011
  - ✅ Session tracking with unique IDs, milestones, and detailed action logs
  - ✅ Database-first workflow with migrations and seeds
  
- **Current System State**:
  - Last active work: Feb 3 - Phase 5 multi-browser sync testing (IN_PROGRESS)
  - Phase 3 complete: Field-level versioning (16/16 tests passing)
  - Infinite render loop bug previously resolved (Feb 1)
  - Ready for: Multi-browser sync testing execution (10 test scenarios)

### Next Steps
- Start development servers (API + Frontend)
- Execute Phase 5 multi-browser sync testing from [MULTI_BROWSER_SYNC_TEST.md](../MULTI_BROWSER_SYNC_TEST.md)
- Document test results
- Continue with Production Checklist feature (new priority from TODO list)

---

## February 1, 2026

### Bug Fixes - Infinite Render Loop Resolution
- **Fixed** Critical infinite render loop in Settings page (Maximum update depth exceeded)
  - **Root cause:** ServerConnection renderStatus callback creating dependency cycle
  - renderStatus was inline arrow function → new reference on every Settings render
  - ServerConnection useEffect had renderStatus in deps → triggered on every change
  - Created loop: render → new callback → useEffect → setState → render
  
- **Solution:** Applied Option C (architectural improvements)
  1. Memoized renderStatus callback with useCallback in Settings.tsx
  2. Removed renderStatus from ServerConnection useEffect dependency array
  - Follows React best practices
  - Prevents similar issues in the future
  
- **Commits:**
  - c6f5bcb: Fix infinite render loop in Settings page
  - 5d17dde: Remove troubleshooting debug logs from Settings.tsx

### Field-Level Versioning - Phase 3 Complete ✅
- **Fixed** Conflict resolution force save bug
  - Variable scoping issue: updatedProject out of scope in catch block
  - Fixed by reconstructing project object from activeProject
  - Added proper error handling with try/catch and user feedback
  - Added IndexedDB sync for force saves

- **Enhanced** Conflict resolution dialog
  - Upgraded from confirm() (2 options) to prompt() (3 options)
  - Option 1: Retry - reload fresh data and manually merge
  - Option 2: Keep Yours - force save, overwrite their changes
  - Option 3: Keep Theirs - discard your changes, load their version
  
- **Testing Results:** All Phase 3 tests passing
  - ✅ Test 1: Single browser field edits working
  - ✅ Test 2: Two browsers different fields - auto-merge successful
  - ✅ Test 3: Two browsers same field - conflict detected, retry option works
  
- **Settings Page:** Production info form with 7 editable fields (showName, client, venue, room, loadIn, loadOut, showInfoUrl)
- **Dashboard:** Added pencil edit button that navigates to Settings
- **Architecture:** Database-first with dual-path API (field-level + record-level fallback)
  - 16/16 backend tests passing
  - 14 tracked fields with JSONB field_versions column
  - Automatic conflict detection and resolution
  - Manual refresh required until Phase 4 WebSocket implementation

---

## January 18, 2026

### Bug Fixes & UX Improvements
- **Fixed** Settings page blank screen - added missing frameRates and resolutions initialization
- **Fixed** Source edit modal blank screen - added safety checks for undefined arrays
- **Disabled** auto-open browser on server restart
- **Improved** Settings UX: All sections now collapsed by default
- **Added** Settings section state persistence to localStorage (remembers user's expand/collapse preferences)

### Version Control & Logging System
- **Established** automatic git commit and push protocol for code changes
- **Created** DEVLOG.md for human-readable development history
- **Implemented** LogService for tracking application changes
  - Stores up to 1000 log entries in localStorage
  - Tracks settings additions, updates, deletions, and reordering
  - Tracks equipment additions, updates, deletions with change details
  - Includes timestamps, categories, and detailed change tracking
  
- **Created** Activity Logs page
  - Filter by category (all, settings, equipment, general)
  - Expandable entries showing field-level changes
  - Export logs as JSON
  - Clear logs functionality
  - Color-coded badges for categories and actions

### Centralized Settings Management
- **Removed** `secondaryDevices` from Settings - replaced with connector types from equipment converters
- **Added** Connector Types section to Settings
  - Initialized with: HDMI, SDI, DP, FIBER, NDI, USB-C
  - Drag-and-drop reordering with GripVertical handles
  - Add/remove capabilities with validation
  
- **Added** Frame Rates section to Settings
  - Initialized with: 60, 59.94, 50, 30, 29.97, 25, 24, 23.98
  - Drag-and-drop reordering
  - Add/remove capabilities
  
- **Added** Resolutions section to Settings
  - Initialized with: 1080i, 1080p, 720p, 4K, 8K, SD
  - Drag-and-drop reordering
  - Add/remove capabilities

### Site-Wide Integration
- Updated all dropdown references to use centralized settings
- Equipment FORMAT_OPTIONS now dynamically built from resolutions × frameRates
- SourceFormModal uses centralized connectorTypes
- EquipmentFormModal uses centralized resolutions and frameRates
- Added safety checks for undefined arrays
- All changes automatically logged via LogService

### Bug Fixes
- Fixed blank window issue (Cameras page was de-referenced)
- Restored Cameras page with all original customizations intact
- Added cache clearing guidance

### Infrastructure
- **Protocol**: Automatically commit and push after code changes (unless user says "don't push")
- **Protocol**: Server restart after large alterations
- All 4 settings lists (Source Types, Connector Types, Frame Rates, Resolutions) support drag-and-drop reordering
- Changes in Settings automatically propagate throughout application
- All changes tracked in Activity Logs

---

## Previous Work

### Equipment Management System
- 10 equipment categories with modal-based CRUD operations
- Card-based architecture with direct I/O specifications
- Multi-output source support
- Equipment modal redesign with format assignment
- Simplified card model (removed manufacturer/model fields)

### Core Features
- Production planning and management
- Source and send tracking
- LED screen configuration
- IP address management
- Checklist system
- Video switcher integration
- Media server allocation
- CCU and camera management
