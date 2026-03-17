# TODO — Next Session

_Last updated: 2026-03-16_
_Detailed backlog: `docs/BACKLOG.md`_

---

## 🔴 Bugs

**Media Servers: Card collapses on output add/edit (reveal mode)**
- Expand state is local React state wiped by `loadProject` re-render
- Fix: hold `Set<uuid>` of expanded server UUIDs in `useRef` at page level

**Media Servers: Direct I/O section disabled when card-based output mode selected**
- Fix: remove whatever condition gates the enabled state on output mode — hide/show is correct, not enable/disable

---

## 🏗️ Design Decision Needed

**Media Servers: outputs_data vs. IOPortsPanel overlap**
- Remove Type / Resolution / FrameRate from `outputs_data` rows (now covered by `ioType` + `formatUuid` in IOPortsPanel)
- Keep Name + Role (still drives A/B backup logic)
- Future: add logical→physical linkage field (maps software output channel → `device_port` UUID)

---

## 🚀 Current Sprint

**Stage 2 — Blend Zones** (see `docs/STAGE_SESSION_PROMPTS.md`)
- Stage 1 ✅ complete (`4aac633` — category-specific spec panels in EquipmentFormModal)
- Stages 2–8 ready with full session init prompts
