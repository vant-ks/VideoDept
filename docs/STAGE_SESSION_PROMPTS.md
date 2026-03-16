# Stage Session Prompts — LED + Blend Integration Plan
> Generated: 2026-03-15  
> Branch context: `v0.2.4_graphical-ui` → these stages follow that branch  
> Full architecture decisions in this file's git history / session notes

---

## Stage 1 — Equipment Form: Category-Specific Spec Panels

```
SESSION START — VideoDept v0.2.x_equip-specs

### Project
Video Production Manager — React/TypeScript/Vite/Tailwind frontend + Node/Express/Prisma/PostgreSQL API.
Monorepo: `/Users/kevin/GJS MEDIA Dropbox/Kevin Shea/Development/VideoDept/VideoDept/`
Frontend: `http://localhost:3011` | API: `http://localhost:3010`

### Goal for this session
Add category-aware spec field panels to `EquipmentFormModal.tsx` for three equipment categories:
LED_TILE, LED_PROCESSOR, and PROJECTOR. When one of these categories is selected in the form,
a structured set of labeled input fields appears for that category's known spec properties.

### Spec field definitions

LED_TILE specs (stored in equipment_specs.specs: Json):
  pixelPitch (number, mm), panelWidthMm (number), panelHeightMm (number),
  pixelsH (number), pixelsV (number), weightKg (number), powerMaxW (number),
  powerAvgW (number), maxChainLength (number),
  refreshRateHz? (number), brightnessNits? (number), scanType? (string),
  ipRating? (string), cabinetDepthMm? (number), isCurved? (boolean),
  curveRadiusMm? (number), mountingSystem? (string)

LED_PROCESSOR specs:
  maxPixels (number), ethernetOutputs (number), maxPixelsPerPort (number),
  maxWidth (number), maxHeight (number), hasGenlock (boolean), supportsHdr (boolean)

PROJECTOR additions (merges with any existing spec fields):
  lumens (number), nativeW (number), nativeH (number),
  throwRatioMin? (number), throwRatioMax? (number),
  lensShiftVPct? (number), lensShiftHPct? (number)

### Implementation approach
- Structured individual labeled inputs per spec property (not a freeform JSON editor)
- Each category block is a collapsible section inside the modal: "LED Tile Specs", etc.
- Fields read/write to the existing `specs: Json` column — no Prisma migration needed
- For categories other than these three, the existing freeform spec handling remains unchanged

### Files to read before starting
- `src/components/EquipmentFormModal.tsx` — understand current modal structure
- `video-production-manager/api/prisma/schema.prisma` — confirm equipment_specs.specs column and EquipmentCategory enum values (LED_TILE, LED_PROCESSOR, PROJECTOR already exist)
```

---

## Stage 2 — Blend Engine + Auto-Calc in Projectors Screens Tab

```
SESSION START — VideoDept v0.2.x_blend-engine

### Project
Video Production Manager — React/TypeScript/Vite/Tailwind frontend + Node/Express/Prisma/PostgreSQL API.
Monorepo: `/Users/kevin/GJS MEDIA Dropbox/Kevin Shea/Development/VideoDept/VideoDept/`
Frontend: `http://localhost:3011` | API: `http://localhost:3010`

### Goal for this session
Extract the blend math from `imports/_unpack/screen_calc/WidescreenBlendCalculator.jsx` into a
pure TypeScript engine at `src/components/blend/blendEngine.ts`. Then embed this engine into the
Projectors Screens tab — each ProjectionSurface card gets a collapsible "Projection Analysis"
section that auto-computes single vs. multi-projector status with no manual activation.

### Auto-activation logic
For each surface:
  - 0 projector positions → show "Assign a projector to calculate"
  - 1 position, spec has nativeW + throwRatio, throw distance known:
      projCoverage = throwDist / throwRatio
      if projCoverage >= screenWidth → SINGLE (show cone geometry only)
      else → BLEND REQUIRED: auto-compute nProj = ceil(screenWidth / (projCoverage × 0.95))
  - 1+ positions already assigned → BLEND (use stored overlapPct or default 15%)
  - MIN_OVERLAP_PCT = 5% hard minimum — never auto-propose fewer projectors than this floor

### Blend parameters storage
- overlapPct override and per-position throw overrides stored in projection_surfaces.projector_assignments Json
  (no schema migration needed — just enriching the existing Json column)
- blendConfig: { overlapPct: number } added alongside projector_assignments on the surface record

### Components to create
- `src/components/blend/blendEngine.ts` — pure TS math (calcBlend, calcCones functions)
- `src/components/blend/BlendDiagram.tsx` — SVG top-down blend zone diagram
- `src/components/blend/ConeView.tsx` — front/top/side cone SVG (3 views)

### Files to read before starting
- `imports/_unpack/screen_calc/WidescreenBlendCalculator.jsx` — source math to port
- `src/pages/Projectors.tsx` — Screens tab card structure (lines ~1314–1460)
- `src/hooks/useProjectionSurfaceAPI.ts` — ProjectionSurface type and projector_assignments shape
- `src/hooks/useEquipmentLibrary.ts` — how to pull projector specs (nativeW, throwRatio, lumens)
```

---

## Stage 3 — Projector Stacking: Upgraded projector_assignments + Screens Tab UI

```
SESSION START — VideoDept v0.2.x_proj-stacking

### Project
Video Production Manager — React/TypeScript/Vite/Tailwind frontend + Node/Express/Prisma/PostgreSQL API.
Monorepo: `/Users/kevin/GJS MEDIA Dropbox/Kevin Shea/Development/VideoDept/VideoDept/`
Frontend: `http://localhost:3011` | API: `http://localhost:3010`

### Goal for this session
Upgrade the ProjectionSurface projector_assignments data model to support stacked projectors
(multiple physical units at one rigging position) and multiple positions at different throw
distances for blends. No Prisma migration needed — the column is already Json.

### New projector_assignments model
Replace flat [{projectorUuid, throwDistM, lensUuid, horizOffsetM, vertOffsetM}] with:

interface ProjectorPosition {
  id: string;                    // local UUID
  label: string;                 // "P1", "P2", etc.
  horizOffsetM: number;          // offset from screen centerline
  throwDistM?: number;           // independent per-position
  vertOffsetM?: number;
  lensUuid?: string;
  stackedUnits: { projectorUuid: string; note?: string; }[];  // 1+ physical units
  blendZoneIndex?: number;       // order in blend (0-based)
}

### Backward compatibility shim
In useProjectionSurfaceAPI.ts, add a normalizeAssignments() function that detects the
old flat shape (no stackedUnits field) and wraps it: { id: uuid(), label: 'P1',
horizOffsetM: old.horizOffsetM ?? 0, throwDistM: old.throwDistM, lensUuid: old.lensUuid,
stackedUnits: [{ projectorUuid: old.projectorUuid }] }

### UI changes in Projectors Screens tab
Each surface card gets a "Projection Positions" sub-section showing:
  - List of ProjectorPosition rows: label, throw dist, stack unit count, horizontal offset
  - "Add Position" button → inline form
  - Per-position: "Add unit to stack" → adds another projectorUuid to stackedUnits
  - Per-position edit: throw dist, horizontal offset, lens assignment
  - Blend calc (Stage 2) driven by positions count and per-position throwDistM

### Files to read before starting
- `src/hooks/useProjectionSurfaceAPI.ts` — current ProjectorAssignment interface
- `src/pages/Projectors.tsx` — Screens tab card structure
- `src/components/blend/blendEngine.ts` — should exist from Stage 2, consumes ProjectorPosition[]
```

---

## Stage 4 — LED Wall: Prisma Migration + useLEDScreenAPI Upgrade

```
SESSION START — VideoDept v0.2.x_led-schema

### Project
Video Production Manager — React/TypeScript/Vite/Tailwind frontend + Node/Express/Prisma/PostgreSQL API.
Monorepo: `/Users/kevin/GJS MEDIA Dropbox/Kevin Shea/Development/VideoDept/VideoDept/`
Frontend: `http://localhost:3011` | API: `http://localhost:3010`

### Goal for this session
Migrate the `led_screens` database table from its current projection-screen-like shape
(manufacturer, model, h_res, v_res, rate) to a proper LED wall schema. Then upgrade
`useLEDScreenAPI.ts` to match.

### New led_screens Prisma model (replace old columns)
REMOVE: manufacturer, model, h_res, v_res, rate
ADD:
  sort_order       Int      @default(0)      -- 0–11, supports 12 walls per show
  processor_uuid   String?                   -- → equipment_specs (LED_PROCESSOR)
  pos_ds_x_m       Float?                    -- room position X (for Layout canvas)
  pos_ds_y_m       Float?                    -- room position Y
  rotation_deg     Float?   @default(0)
  tile_grid        Json?                     -- TileGrid structure (see below)
  equipment_uuid   String?  -- KEEP — repurposed as primary/dominant tile spec UUID

### TileGrid JSON structure (stored in tile_grid column)
interface TileGrid {
  cols: number;
  rows: number;
  cells: TileCell[][];    // [row][col], row 0 = bottom of wall
}
interface TileCell {
  type: 'TILE' | 'VOID';
  tileSpecUuid?: string;  // equipment_specs UUID (LED_TILE category)
  variant?: 'STANDARD' | 'R_CORNER' | 'L_CORNER' | 'HALF_H' | 'HALF_V' | 'QUARTER';
  rotation?: 0 | 90 | 180 | 270;
  chainId?: number | null;      // reserved for future wiring diagram tool
  chainOrder?: number | null;
  portId?: number | null;
}

### Migration approach
Check DB for existing led_screen records before migrating. If none (or only test data),
use `prisma migrate dev --name led-wall-schema` to drop/add cleanly.
If real data exists, use additive migration: add new columns nullable, backfill, then drop old.

### Files to read before starting
- `video-production-manager/api/prisma/schema.prisma` — current led_screens model
- `src/hooks/useLEDScreenAPI.ts` — current API hook (needs full type upgrade)
- `video-production-manager/api/src/routes/` — find led-screens route handler to update
```

---

## Stage 5 — LED Walls Tab: 12-Slot Card List + CRUD

```
SESSION START — VideoDept v0.2.x_led-walls-tab

### Project
Video Production Manager — React/TypeScript/Vite/Tailwind frontend + Node/Express/Prisma/PostgreSQL API.
Monorepo: `/Users/kevin/GJS MEDIA Dropbox/Kevin Shea/Development/VideoDept/VideoDept/`
Frontend: `http://localhost:3011` | API: `http://localhost:3010`

### Goal for this session
Build the LED page (`src/pages/LED.tsx`) Walls tab — the data view card list showing all LED walls
for the active production, with 12 pre-shown slots (empty or populated), full CRUD.

### Page structure
LED page has two sub-tabs:
  [Walls]   ← this session
  [Planner] ← Stage 6

### Walls tab behavior
- Always shows 12 slots in a grid (4 cols × 3 rows recommended)
- Empty slots show an "+ Add Wall" placeholder card (dashed border)
- Populated slots show: wall name, dominant tile spec label, cols×rows grid size,
  total panel count, processor name, total resolution (computed from tile_grid),
  total weight estimate, total power estimate
- Card actions: Edit (name, processor, room position, sort_order), Open Planner, Delete
- Add Wall modal: name, processor (equipment library LED_PROCESSOR dropdown), optional
  starting grid size (cols × rows), sort_order auto-assigns next available 0–11 slot

### Computed stats from tile_grid
totalPanels = cells where type === 'TILE' (count)
totalPixels = sum of (tileSpec.pixelsH × tileSpec.pixelsV) per TILE cell
totalWeightKg = sum of tileSpec.weightKg per TILE cell
totalPowerMaxW = sum of tileSpec.powerMaxW per TILE cell
dominantResolution = most common pixelsH × pixelsV among TILE cells

### Files to read before starting
- `src/hooks/useLEDScreenAPI.ts` — should be upgraded from Stage 4
- `src/pages/Projectors.tsx` — copy card list pattern (card grid, modals, CRUD)
- `src/App.tsx` — add `case 'led': return <LED />`
- `src/components/Layout.tsx` — confirm nav item `{ id: 'led', label: 'LED', icon: Grid }`
  currently routes to Projectors (placeholder) — fix to LED page
```

---

## Stage 6 — LED Planner Tab: Tile Grid Canvas + Tile Picker

```
SESSION START — VideoDept v0.2.x_led-planner

### Project
Video Production Manager — React/TypeScript/Vite/Tailwind frontend + Node/Express/Prisma/PostgreSQL API.
Monorepo: `/Users/kevin/GJS MEDIA Dropbox/Kevin Shea/Development/VideoDept/VideoDept/`
Frontend: `http://localhost:3011` | API: `http://localhost:3010`

### Goal for this session
Build the Planner tab inside the LED page — the interactive tile grid canvas where users
assemble LED walls cell by cell using tiles from the equipment library.

### Canvas behavior
- Wall selector: dropdown at top — which of the 12 walls to edit
- Grid canvas: SVG cells sized proportionally to the tile's physical mm dimensions
  (a 500×1000 tile renders twice as tall as a 500×500 tile)
- Click cell → opens tile picker (equipment library LED_TILE dropdown + variant selector)
- Void toggle: clicking an occupied cell with Void mode ON clears it (type = 'VOID')
- Grid resize: +/- col/row buttons add/remove columns and rows
- Drag to resize: drag bottom-right corner to add rows/cols (optional, do if clean)

### Tile picker
- Source: useLedEquipment hook (src/hooks/useLedEquipment.ts — create this file)
  Priority: equipment library LED_TILE items first, then BUILTIN_PANELS as fallback
  BUILTIN_PANELS from imports/_unpack/led_visualizer/LedWallPlanner.jsx
- Variant: STANDARD / R_CORNER / L_CORNER / HALF_H / HALF_V / QUARTER
  Corner variants display a notched SVG path instead of a full rectangle

### Right panel stats (live, computed from tile_grid)
- Total panels / VOID count
- Total pixels (W × H)
- Processor loading % (totalPixels / processor.specs.maxPixels × 100)
- Estimated data chains needed (ceil(totalPanels / tile.maxChainLength))
- Total weight kg / lbs
- Total power max W / avg W / circuit count (at 15A/120V)

### Chain routing overlay (read-only at this stage)
Show chain coloring using routeChains() from LedWallPlanner.jsx math,
reading the tile_grid chainId/chainOrder fields populated by the engine.

### Files to read before starting
- `imports/_unpack/led_visualizer/LedWallPlanner.jsx` — source canvas + math to port
- `imports/_unpack/led_visualizer/useLedEquipment.ts` — equipment seam to port
- `imports/_unpack/led_visualizer/types.ts` — TypeScript interfaces to adopt
- `src/pages/LED.tsx` — Walls tab from Stage 5 (add Planner as second sub-tab)
- `src/hooks/useEquipmentLibrary.ts` — how to pull LED_TILE specs from inventory
```

---

## Stage 7 — Layout Tab: Projector Cone Overlays + LED Wall Rectangles

```
SESSION START — VideoDept v0.2.x_layout-overlays

### Project
Video Production Manager — React/TypeScript/Vite/Tailwind frontend + Node/Express/Prisma/PostgreSQL API.
Monorepo: `/Users/kevin/GJS MEDIA Dropbox/Kevin Shea/Development/VideoDept/VideoDept/`
Frontend: `http://localhost:3011` | API: `http://localhost:3010`

### Goal for this session
Enhance the Projectors Layout tab so it shows three layers on the top-down canvas:
(1) stage decks (already read-only), (2) projection surfaces with projector cone
triangles driven by real throw geometry, (3) LED walls as colored rectangles.

### Projector cone upgrade
Current: throw cones use a hardcoded triangle from projector position to screen edges.
New: use blendEngine.calcCones() (from Stage 2) fed with real ProjectorPosition data
(from Stage 3 stacking model) and projector specs (nativeW, throwRatio from equipment_uuid).
Show individual projector dot markers per stackedUnit within a position.
On hover: tooltip showing projector name, throw distance, coverage %, stack count.

### LED wall rectangles
- Read LED walls for current production via useLEDScreenAPI
- For each wall with pos_ds_x_m / pos_ds_y_m set:
    width = cols × (dominant tile panelWidthMm / 1000)  [meters]
    height = rows × (dominant tile panelHeightMm / 1000)
    render as a teal/emerald filled rectangle (distinct color from projection surfaces)
- Click → highlight, show tooltip: name, grid size, total res
- Drag → update pos_ds_x_m / pos_ds_y_m (same API-save pattern as projection surfaces)

### Files to read before starting
- `src/pages/Projectors.tsx` — LayoutTab component (lines ~75–445)
- `src/components/VenueCanvasUtils.tsx` — DimLine, snap helpers
- `src/components/blend/blendEngine.ts` — calcCones() (from Stage 2)
- `src/hooks/useLEDScreenAPI.ts` — fetch walls per production (from Stage 4)
- `src/hooks/useProjectionSurfaceAPI.ts` — ProjectorPosition type (from Stage 3)
```

---

## Stage 8 — Bidirectional Navigation: Layout ↔ Projectors Tab + Layout ↔ Screens Tab

```
SESSION START — VideoDept v0.2.x_bidirectional-nav

### Project
Video Production Manager — React/TypeScript/Vite/Tailwind frontend + Node/Express/Prisma/PostgreSQL API.
Monorepo: `/Users/kevin/GJS MEDIA Dropbox/Kevin Shea/Development/VideoDept/VideoDept/`
Frontend: `http://localhost:3011` | API: `http://localhost:3010`

### Goal for this session
Complete bidirectional navigation between the Projectors page sub-tabs so that:
  - Clicking a projector marker on the Layout canvas → jumps to Projectors tab, scrolls to that projector's card
  - Clicking a surface rectangle on the Layout canvas → jumps to Screens tab, scrolls to that surface's card
  - Each projector card in the Projectors tab has a "View on Layout" button → switches to Layout tab, highlights that projector
  - Each surface card in the Screens tab has a "View on Layout" button → switches to Layout tab, highlights that surface
  - LED wall rectangles on Layout canvas → jump to LED page Walls tab (cross-page navigation)

### Current state (what already works)
- Canvas → Screens tab: selecting a surface on the canvas already sets selectedSurfaceId
  and the Screens tab card highlights (orange ring). This pattern works and just needs extending.
- Screens tab → Layout canvas highlight: partially works via selectedSurfaceId already passed to LayoutTab.

### What needs building
1. `selectedProjectorUuid` state at Projectors() page level (parallel to selectedSurfaceId)
2. Pass to LayoutTab: `selectedProjectorUuid`, `onSelectProjector` props
3. Projector markers on Layout canvas: click sets selectedProjectorUuid + switches activeSubTab to 'projectors'
4. Projectors tab card: ring highlight when selectedProjectorUuid matches, "View on Layout" button
5. Scroll-to-card on tab switch: useRef on each card, scrollIntoView() when id matches after tab change
6. Cross-page LED navigation: setActiveTab('led') from Layout canvas click on LED rectangle

### Cross-page navigation pattern
The app uses setActiveTab() from usePreferencesStore to switch pages (already used in
Projectors.tsx line 1467: onGoToStaging={() => setActiveTab('staging')}). Same pattern
works for LED page navigation.

### Files to read before starting
- `src/pages/Projectors.tsx` — full file; focus on: selectedSurfaceId state (line ~476),
  LayoutTab props (line ~1458), Projectors tab card rendering (line ~938), Screens tab (line ~1314)
- `src/hooks/usePreferencesStore.ts` — setActiveTab pattern
- `src/components/VenueCanvasUtils.tsx` — no changes expected, just context
```

---

## Cross-cutting notes (read before any stage)

### Data model summary
- `projection_surfaces.projector_assignments: Json` — holds `ProjectorPosition[]` (Stage 3 model)
  each ProjectorPosition has `stackedUnits: {projectorUuid, note}[]` for multi-unit stacks
- `led_screens.tile_grid: Json` — holds `TileGrid` with `cells: TileCell[][]`
  each TileCell has `tileSpecUuid` pointing to `equipment_specs` (LED_TILE category)
- `equipment_specs.specs: Json` — typed spec fields per category (LED_TILE, LED_PROCESSOR, PROJECTOR)
- Blend minimum overlap: 5% (`MIN_OVERLAP_PCT = 0.05`) — hard floor before adding another projector

### Tech patterns
- Plain SVG + pointer events — NO react-konva/canvas library
- `useRef` for drag state (avoids re-render thrashing during drag)
- `setPointerCapture` on pointer-down for cross-element drag tracking
- Canvas coordinate convention: DSC = world origin (0,0), +X = stage right, +Y = upstage; SVG Y is flipped
- Staging: feet units; Projectors/Layout/LED: meters
- Tailwind tokens: `av-accent`, `av-bg`, `av-surface`, `av-text`, `av-border`
- `VenueCanvasUtils.tsx` → `DimLine`, `snapTo`, `formatMasImperial`, `SNAP_INCH_OPTIONS`

### Import files (unpacked to `imports/_unpack/`)
- `led_visualizer/LedWallPlanner.jsx` — LED canvas + chain routing math (1015 lines)
- `led_visualizer/useLedEquipment.ts` — equipment seam (191 lines)
- `led_visualizer/types.ts` — TypeScript interfaces (259 lines)
- `screen_calc/WidescreenBlendCalculator.jsx` — blend math + SVG components (482 lines)
