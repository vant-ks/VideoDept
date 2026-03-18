# TODO — Next Session

_Last updated: 2026-03-17_
_Detailed backlog: `docs/BACKLOG.md`_

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
