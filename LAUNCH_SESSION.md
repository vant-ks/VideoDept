


CURRENT BRANCH : v0.2.5_projection-refinement




# LAUNCH SESSION — VideoDept
**Project:** Video Production Manager  
**Repository:** https://github.com/vant-ks/VideoDept  
**Last Updated:** March 17, 2026

---

## ⏸ Last Session Checkpoint — March 17, 2026

**Branch:** `v0.2.5_projection-refinement` — working tree clean, 3 commits ahead of `v0.2` base

**Last things completed:**
- `4e8f8f5` — fix(media-servers): useRef expand state — cards no longer collapse on save
- `d65eb83` — feat(projection): multi-view inspector panel, 4 view canvases, streams copy buttons, misc fixes
- `95c757e` — refactor(media-servers): retire outputs_data — device_ports is sole port model

**Media Servers bugs — all closed:**
- Card collapses on modal save → FIXED (`expandedPairsRef` / `expandedLayersRef`)
- Direct I/O disabled on card-based mode → FIXED (outputMode gate removed with outputs_data retirement)
- outputs_data vs IOPortsPanel overlap → FIXED (outputs_data retired)

**Projection components added (not yet wired into Projectors.tsx):**
- `src/components/projection/viewTypes.ts` — shared types
- `src/components/projection/InspectorPanel.tsx` — properties inspector
- `src/components/projection/MultiViewLayout.tsx` — 4-up view shell
- `src/components/projection/views/` — Top/Front/Side/BlendViewCanvas
- `src/components/projection/shared/` — objectRelations, useViewTransform

**Next step:** Wire `MultiViewLayout` + `InspectorPanel` into `Projectors.tsx` (replace or augment existing Layout tab). Design decision needed — see TODO_NEXT_SESSION.md.

---

## Session Kickoff Prompt

Paste this as the first message of every new AI session:

```
New session starting for VideoDept.

Before doing anything else, you are required to:

1. Review documentation using the grep-first protocol (full procedure in SESSION_START_PROTOCOL.md Phase 1):
   - grep_search DEVLOG.md for `✅ COMPLETE` / `IN PROGRESS` to orient quickly, then read last 60 lines
   - read_file PROJECT_RULES.md lines 1–70 (navigation TOC), then grep `<!-- tags:` to jump to relevant sections
   - grep_search SESSION_JOURNAL.md for latest `### Session` heading, then read ~60 lines from there
   - read_file TODO_NEXT_SESSION.md in full
   - read_file AI_AGENT_PROTOCOL.md lines 1–100 only

2. Start the dev servers (background):
   API:      cd "video-production-manager/api" && npm run dev    → http://localhost:3010
   Frontend: cd "video-production-manager" && npm run dev        → http://localhost:3011
   Verify HTTP 200 on http://localhost:3010/health

3. Verify git pipeline:
   git status
   git log --oneline -5

4. Verify Railway production:
   curl -s https://api-server-production-9aaf.up.railway.app/health

5. Report back with:
   - Dev servers: up/down + ports (3010 API, 3011 frontend)
   - Git: branch, clean/dirty, last commit
   - Railway: HTTP status
   - Last DEVLOG checkpoint (last ✅ COMPLETE task)
   - Any IN PROGRESS tasks found (these need to be re-verified before new work starts)
   - Top 3 priorities from TODO_NEXT_SESSION.md

You are now bound to the following rules for this entire session — no exceptions:

DEVLOG RULE: Before starting ANY task, add a checkpoint to video-production-manager/DEVLOG.md
marked "IN PROGRESS". After completing it, immediately update it to "✅ COMPLETE" with files
changed and a one-line summary. This applies to every task — small or large.

DOCS PATH RULE: Always reference protocol docs through video-production-manager/docs/ symlinks,
never through _Utilities directly.

COMMIT RULE: Use conventional commit format (feat:, fix:, docs:, refactor:, chore:).
WIP commits during work, squash before push.

DEPLOY RULE: Production deploys via git push origin main only.
Never use railway up unless the GitHub pipeline is broken.

SESSION JOURNAL RULE: Log every prompt in video-production-manager/docs/SESSION_JOURNAL.md
with request, actions taken, files changed, and outcome. Update in real-time, not at the end.

PROJECT RULES RULE: If you discover a new convention, pattern, or gotcha during this session,
add it to video-production-manager/docs/PROJECT_RULES.md before the session ends.

Confirm you have read all required files and are ready to proceed.
```

---

## Project Quick Reference

| Item | Value |
|------|-------|
| API server | http://localhost:3010 |
| Frontend | http://localhost:3011 |
| Health check | http://localhost:3010/health |
| Production frontend (Railway) | https://videodept-production.up.railway.app |
| Production API (Railway) | https://api-server-production-9aaf.up.railway.app |
| GitHub repo | https://github.com/vant-ks/VideoDept |
| Port block | 3010–3019 (see docs/SERVER_MAP.md) |

## Key Docs (via symlinks in video-production-manager/docs/)

| File | Purpose |
|------|---------|
| `AI_AGENT_PROTOCOL.md` | Universal AI agent rules |
| `SESSION_START_PROTOCOL.md` | Session initialization checklist |
| `SERVER_MAP.md` | All port assignments across projects |
| `MIGRATION_CRASH_PREVENTION_RULE.md` | DB migration safety rules |
| `MIGRATION_SAFETY_CHECKLIST.md` | Pre/post migration checklist |
| `RAILWAY_CLI_GUIDE.md` | Railway CLI commands reference |
| `LAUNCH_SESSION_TEMPLATE.md` | Template this file was based on |
| `PROJECT_RULES.md` | Project-specific conventions (local file) |
| `SESSION_JOURNAL.md` | Running session log (local file) |
