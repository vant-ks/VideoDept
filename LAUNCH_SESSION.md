


CURRENT BRANCH : v0.2.2_sends-subcategory




# LAUNCH SESSION — VideoDept
**Project:** Video Production Manager  
**Repository:** https://github.com/vant-ks/VideoDept  
**Last Updated:** March 11, 2026

---

## ⏸ Last Session Checkpoint — March 11, 2026

**Branch:** `v0.2.2_sends-subcategory` — working tree clean, 7 commits ahead of `v0.2`

**Last thing completed:** Equipment data curation + connector type expansion

Commits this session (newest first):
- `92234f5` — feat(settings): expand connector types, hide frame rate / resolution panels
- `a974178` — chore: clean up equipment update helper scripts
- `b9952c2` — feat(equipment): add streaming encoders (STREAM_ENCODER category)
- `ab295e7` — chore(equipment): remove Atomos recorders + duplicate/old HyperDeck entries, add HyperDeck Extreme 4K HDR
- `64cd867` — chore(equipment): remove Flanders XM311K and small Lilliput monitors
- `34e58e0` — chore(equipment): replace LG monitors with UA7100 series, add BMD Video Assist 3G + SmartView 4K G3, add Lilliput Q series 17"+
- `d51804e` — fix(OtherPages): replace useNavigate with setActiveTab

**Connector types now in DB (24 total):**
`HDMI 1.4`, `HDMI 2.0`, `HDMI 2.1`, `3G-SDI`, `6G-SDI`, `12G-SDI`, `BNC REF`, `DP 1.1`, `DP 1.2`, `DP 1.4`, `NDI`, `USB-C`, `NETWORK (RJ45)`, `OPTICON DUO`, `OPTICON QUAD`, `SMPTE FIBER`, `LC - FIBER (SM)`, `ST - FIBER (SM)`, `SC - FIBER (SM)`, `LC - FIBER (MM)`, `ST - FIBER (MM)`, `SC - FIBER (MM)`, `XLR`, `DMX`

**Settings UI:** Frame Rates and Resolutions sections removed (deviceFormats per-spec instead)

**equipment-data.json:** 219 entries. IO port `type` strings in the JSON are still legacy values (e.g. `HDMI`, `SDI`, `3G-SDI`) — will be updated on a per-item basis as equipment is touched.

**Spreadsheet tool:** `api/prisma/gen-equipment-spreadsheet.py` → `equipment-io-spec.xlsx` (20 port slots, type dropdowns). Run `python3 gen-equipment-spreadsheet.py` to regenerate.

**Pick up from:** Primary branch feature work — Sends entity subcategory implementation (no work started yet on this feature despite the branch name).

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
