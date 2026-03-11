# Session Start Protocol

**Purpose:** Standard procedure for AI agents when user says "Let's start a new session"  
**Last Updated:** March 11, 2026  
**Maintained By:** Kevin @ GJS Media

---

## 🎯 Trigger Phrase

When the user says:
- **"Let's start a new session"**
- "Start a new session"
- "Begin session"
- "Session start"

Execute this protocol automatically.

---

## 📋 Session Start Checklist

### Phase 1: Review Documentation (Grep-First)

Use **targeted reading** — do NOT read large file sections wholesale. The tag system lets you navigate precisely.

**Step 1 — DEVLOG recent state:**
- `grep_search` for `"✅ COMPLETE|### Status"` in `video-production-manager/DEVLOG.md` (last 60 lines)
- Shows what was last completed and any in-progress tasks

**Step 2 — PROJECT_RULES.md navigation TOC:**
- `read_file` lines 1–70 of `video-production-manager/docs/PROJECT_RULES.md` (the `<!-- DOCUMENT NAVIGATION -->` block)
- The nav block contains exact line numbers and tags for all sections
- For task-specific rules: `grep_search "tags:.*<topic>"` then `read_file` only that range
- **Always read these critical sections** (check nav block for current line numbers):
  - `Entity Terminology & Naming` — naming rules + UUID contract (CRITICAL)
  - `Database Schema Changes` — migration safety (CRITICAL)
  - `Mission Statement / Pillars 1–13` + `Pre-Implementation Diagnostic Checklist`

**Step 3 — SESSION_JOURNAL most recent session:**
- `grep_search "^## Session 20"` in `SESSION_JOURNAL.md` to find the newest session heading line
- `read_file` ~60 lines from that line number

**Step 4 — TODO_NEXT_SESSION.md (full file — always small):**
- `read_file` full file — this file is always compact

**Step 5 — AI_AGENT_PROTOCOL.md (lines 1–100 only):**
- Check for protocol updates or critical rules that apply to this session

---

### Phase 2: Start Development Servers

Execute in sequence:

1. **Kill any existing server processes:**
   ```bash
   cd /Users/kevin/Dropbox\ \(Personal\)/Development/VideoDept/VideoDept
   pkill -9 -f 'tsx watch' && pkill -9 -f 'vite' && lsof -ti:3010 -ti:3011 | xargs kill -9 2>/dev/null
   ```

2. **Start API Server (Background):**
   ```bash
   cd video-production-manager/api && npm run dev
   ```
   - Set `isBackground: true`
   - Wait 3 seconds for startup
   - Verify port 3010 listening

3. **Start Frontend Server (Background):**
   ```bash
   cd video-production-manager && npm run dev
   ```
   - Set `isBackground: true`
   - Wait 3 seconds for startup
   - Verify port 3011 listening

4. **Verify Health:**
   - Check terminal output for errors
   - Verify both servers report "ready" status
   - Note any startup warnings

---

### Phase 3: Verify Git Pipeline

1. **Check git status:**
   ```bash
   git status
   ```
   
2. **Check current branch:**
   ```bash
   git branch --show-current
   ```

3. **Check recent commits:**
   ```bash
   git log --oneline -5
   ```

4. **Check remote sync status:**
   ```bash
   git fetch && git status
   ```

**Document:**
- Current branch
- Clean/dirty working tree
- Commits ahead/behind origin
- Any uncommitted changes

---

### Phase 4: Verify Railway Production Server

1. **Check Railway deployment status:**
   - Visit: `https://videodept-production.up.railway.app/health` (or current Railway URL)
   - OR curl the health endpoint:
   ```bash
   curl -s https://videodept-production.up.railway.app/health
   ```

2. **Expected response:**
   ```json
   {
     "status": "ok",
     "timestamp": "2026-02-09T...",
     "environment": "production",
     "database": "connected"
   }
   ```

**Document:**
- Railway server status (up/down)
- Response time
- Any error messages
- Current deployment version (if available)

---

### Phase 5: Report Session Status

Present a concise report to the user:

```
## 🟢 Session Started

### 📊 System Status

**Local Development:**
- ✅ API Server: Running on port 3010 (v[version])
- ✅ Frontend: Running on port 3011 (Vite v[version])
- Status: [Any warnings or issues]

**Git Pipeline:**
- Branch: [branch-name]
- Status: [clean/changes pending]
- Sync: [up to date/ahead X/behind Y]
- Last commit: [short hash] - [commit message]

**Production (Railway):**
- Status: [UP/DOWN]
- Health: [response status]
- URL: https://videodept-production.up.railway.app

### 📝 Current Work Context

**Last Session:** [Date from SESSION_JOURNAL.md]
- Status: [IN_PROGRESS/COMPLETED]
- Focus: [Brief description]

**Active Priorities (from TODO_NEXT_SESSION.md):**

**Near Term:**
1. [Top priority item]
2. [Second priority item]
3. [Third priority item]

**Far Term:**
- [Major upcoming feature/refactor]

**Recent Changes:**
- [Last 2-3 significant changes from DEVLOG.md]

### 🎯 Ready for Work

What would you like to work on?
```

---

## �️ Phase 6: Session Close Checklist

Before ending any session, complete these steps in order:

1. **DEVLOG** — ensure the last entry is ✅ COMPLETE (no IN PROGRESS entries left open)

2. **TODO_NEXT_SESSION.md** — update with:
   - Move completed items to a “Done this sprint” note or remove them
   - Add any new tasks discovered during the session
   - Add any blockers or gotchas to “Known Issues”

3. **SESSION_JOURNAL.md** — write the final prompt entry if not already done; update session **Status** from `IN_PROGRESS` to `COMPLETED`

4. **LAUNCH_SESSION.md** — update the “Last Session Checkpoint” block:
   - Current branch name
   - Last commit hash + one-line description
   - What was completed this session
   - “Pick up from:” — the specific next task

5. **Commit** — `git add -A && git commit -m "docs(session): update session journal, devlog, launch checkpoint"`

> **Why this matters:** The LAUNCH_SESSION.md checkpoint is the first thing read next session. If it’s stale, the next agent starts with wrong context.

---

## �🔧 Error Handling

### If Servers Fail to Start:

1. Check for port conflicts:
   ```bash
   lsof -i :3010 -i :3011
   ```

2. Review error logs in terminal output

3. Check for missing dependencies:
   ```bash
   cd video-production-manager/api && npm install
   cd ../.. && cd video-production-manager && npm install
   ```

4. Report error details to user with suggested fixes

### If Railway Server is Down:

1. Note in report: "⚠️ Railway production server not responding"
2. Check Railway dashboard URL (if available)
3. Ask user if they want to investigate deployment issues
4. Do NOT attempt to deploy automatically

### If Git Has Conflicts:

1. Report conflict status
2. Show affected files
3. Ask user for resolution preference
4. Do NOT auto-merge or force push

---

## 🚫 Critical Rules

1. **Never skip the documentation review** - Context is essential
2. **Always start servers in background** - Use `isBackground: true`
3. **Never auto-deploy to Railway** - Production deployment requires user approval
4. **Always report issues found** - Failed servers, git conflicts, etc.
5. **Keep report concise** - User wants quick status, not full logs

---

## 📚 Related Documents

**Universal Protocols (in _Utilities):**
- [`AI_AGENT_PROTOCOL.md`](AI_AGENT_PROTOCOL.md) - Universal AI agent protocols

**Project-Specific Documents (in project):**
- `PROJECT_RULES.md` - Project-specific rules
- `SESSION_JOURNAL.md` - Historical session tracking
- `TODO_NEXT_SESSION.md` - Work priorities
- `DEVLOG.md` - Development log

*Note: This protocol is universal and lives in `_Utilities`. Projects create symlinks to it.*

---

## 🔄 Version History

**v1.0** - February 9, 2026
- Initial protocol creation
- Defines standardized session start procedure
- Integrates with existing documentation ecosystem
