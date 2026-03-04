# Session Start Protocol

**Purpose:** Standard procedure for AI agents when user says "Let's start a new session"  
**Last Updated:** February 9, 2026  
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

### Phase 1: Review Documentation (Parallel)

Read the following files to establish context:

1. **`video-production-manager/docs/SESSION_JOURNAL.md`** (last 100 lines)
   - Review most recent session
   - Check current status and active work
   - Note any in-progress tasks

2. **`video-production-manager/docs/AI_AGENT_PROTOCOL.md`** (lines 1-100)
   - Confirm protocol version
   - Review critical rules
   - Check for any recent updates

3. **`video-production-manager/docs/PROJECT_RULES.md`** (lines 1-100)
   - Review project-specific rules
   - Note deployment restrictions
   - Check port assignments (API: 3010, Frontend: 3011)

4. **`TODO_NEXT_SESSION.md`** (full file)
   - Read near-term priorities
   - Read far-term roadmap
   - Note completed items

5. **`video-production-manager/DEVLOG.md`** (last 50 lines)
   - Review recent changes
   - Check for known issues
   - Note last working state

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

## 🔧 Error Handling

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
