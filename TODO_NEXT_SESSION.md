# TODO — Next Session

_Last updated: 2026-03-17_
_Detailed backlog: `docs/BACKLOG.md`_

---

## ✅ `v0.2.5_projection-refinement` — MERGED to main (`b5def2e`)

**What shipped:**
- Multi-view 2×2 projection canvas layout (Top / Front / Side / Blend)
- Per-view zoom toolbar (zoom in/out/fit/maximize)
- Top toolbar with 8 alignment/distribute ops
- Rubber-band box-select in TopViewCanvas → additive multi-select
- Shift-click additive select across all 4 views
- Amber multi-select rings on surfaces/LED walls; teal for primary
- Inspector anchor point toggle (⊙ Center / ⌜ Left-edge)
- Classic view removed — Layout tab always uses MultiViewLayout

---

## 🏗️ Next Branch: `v0.2.6_projection-polish` (suggested)

See `LAUNCH_SESSION.md` for the full session-opening prompt.

### Known gaps to address first:
- [ ] `onMattePatch` not wired in `MultiViewLayout` / `Projectors.tsx` — Front view matte drag is a no-op
- [ ] `LEDWallInspector` doesn't adjust X for `top-left` anchor mode (toggle exists, handler missing)
- [ ] Box-select hit-test doesn't include projector dots
- [ ] Maximize single-view: `maximizedView` state not implemented in `MultiViewLayout`
- [ ] Distribute H/V should show disabled state when `< 3` items selected (currently silent no-op)

---

## 🚀 Current Branch: `v0.2.5_projection-refinement`

**In progress:** Projection refinement — multi-view inspector panel, view canvases (Top/Front/Side/Blend), Streams URL/key copy cards.

Open work committed `d65eb83`. No IN PROGRESS tasks remaining.

---

## 🏗️ Design Decision Needed

**Projection: InspectorPanel / view canvases need wiring into Projectors.tsx**
- `src/components/projection/` folder added — InspectorPanel, MultiViewLayout, 4 view canvases, viewTypes.ts, shared hooks
- Not yet imported/wired in Projectors.tsx — decide on integration point (replace or augment existing Layout tab?)

---

## Previously Resolved (do not re-raise)

- ~~Media Servers: Card collapses on output add/edit~~ — **FIXED** `4e8f8f5`: expandedPairsRef / expandedLayersRef (useRef, survives loadProject)
- ~~Media Servers: Direct I/O disabled when card-based mode selected~~ — **FIXED** by `95c757e`: outputs_data retirement removed the outputMode gate entirely
- ~~Media Servers: outputs_data vs. IOPortsPanel overlap~~ — **FIXED** by `95c757e`: outputs_data retired, device_ports is sole port model
- ~~Projection Stages 2–8~~ — **COMPLETE** (merged to main as `6b8ffa7`)
