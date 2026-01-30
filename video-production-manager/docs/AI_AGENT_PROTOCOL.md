# AI Agent Development Protocol

**Last Updated:** January 18, 2026  
**Maintained By:** Kevin @ GJS Media

This document outlines the required protocols and preferences for AI agents (GitHub Copilot, etc.) working on this codebase.

---

## 🚫 Critical Rules

### Railway Deployments
- **NEVER** automatically deploy to Railway
- Deployments to Railway must be **explicitly requested** by the user
- Wait for explicit instruction: "deploy to Railway" or similar

### Dev Server Management
- **ALWAYS** ensure the dev server is running while working
- Dev server must run on **port 3000** (configured with `strictPort: true`)
- **NEVER** show interactive prompts (h+enter, r+enter notifications)
- Use silent background execution: `nohup npm run dev > /dev/null 2>&1 &`
- After any file changes, verify the dev server is still running
- If server needs restart, use the silent method above

### Port Management
- Development server: **Port 3000 ONLY**
- If port 3000 is occupied, kill the process and restart on 3000
- Never auto-increment to 3001, 3002, etc.
- Command to clear ports: `lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null`

---

## 📁 File & Directory Standards

### Git & Version Control
- **Frequent local commits:** After each logical unit of work (WIP commits)
- **Format:** `wip: [description]` for in-progress work
- **Feature commits:** `feat: [description]` when feature is complete
- Use conventional commit format (see `docs/GIT_WORKFLOW.md`)
- **Squash WIP commits** before pushing to GitHub (keep clean remote history)
- **Push to GitHub** only at feature completion or when user requests
- **Session tracking:** All work logged in `docs/SESSION_JOURNAL.md`
- This protocol document (`AI_AGENT_PROTOCOL.md`) syncs to GitHub
- This document is for **development only** - see Railway ignore rules below

### Ignore Patterns
```
# Development-only files (ignore on Railway/production)
docs/AI_AGENT_PROTOCOL.md
.env.local
*.log
nohup.out

# User reference files (ignore everywhere)
*.ods
*.xlsx
Video Production Info*.ods
Video Production Info*.xlsx
```

---

## 🎨 UI/UX Preferences

### Typography
- **Monospace fonts ONLY in Logs page**
- All other pages use default sans-serif
- No `font-mono` class outside of `Logs.tsx`

### Statistics Cards
- Mini-dashboard statistics have been removed from:
  - Media Servers (Layers/Layer Map tabs)
  - Computers page
  - Cameras page
  - CCUs page
- Keep stats only on Dashboard and where explicitly requested

### Layout Structure
- Production info (show name, client) displays in **header top-left**
- User menu placeholder reserved in **header top-right** (40px circle)
- No "System Online" status indicators
- Sidebar focuses on navigation only

---

## 🛠️ Code Standards

### Component Styling
- Use card-based layouts for list views (Sources, Sends, etc.)
- Match styling consistency across similar pages
- Sources page styling is the reference for card layouts

### State Management
- Use Zustand with persist for all application state
- Log all CRUD operations via LogService
- Equipment changes: `LogService.logEquipmentChange()`
- Settings changes: `LogService.logSettingsChange()`

### TypeScript
- All new code must be fully typed
- No `any` types unless absolutely necessary
- Build must pass with 0 TypeScript errors

---

## 🔄 Development Workflow

### At Session Start (AI Agents)
1. Check and commit any uncommitted work from previous session
2. Log session start in `docs/SESSION_JOURNAL.md`
3. Create session entry with unique ID (format: YYYYMMDDHHMMSS)
4. Verify dev server is running

### Before Making Changes
1. Verify dev server is running
2. Check current file structure with relevant tools
3. Read existing code to understand patterns
4. Log prompt/request in SESSION_JOURNAL.md

### During Work
1. Update SESSION_JOURNAL.md milestones as you progress
2. Make frequent local WIP commits (every logical change)
3. Use commit format: `git commit -m "wip: [description]"`
4. Document major decisions or blockers in journal

### After Making Changes
1. Make a WIP commit with descriptive message
2. Update SESSION_JOURNAL.md with actions taken
3. Run `npm run build` to verify no errors
4. Check dev server is still running
5. Mark milestones as complete in journal

### At Session End (Normal Completion)
1. Make final commit (can be feature commit if complete)
2. Update SESSION_JOURNAL.md status to COMPLETED
3. List all files changed and commit hashes
4. Move session from "Active" to "Historical" section
5. **DO NOT** push to Railway automatically
6. Ask user if they want to push to GitHub

### At Session End (Crash/Incomplete)
1. Git will preserve uncommitted work automatically
2. Next session: commit with `recover: [description]`
3. Update SESSION_JOURNAL.md with crash notes
4. Document what was being attempted for continuity

### Testing
- Manual testing in browser at http://localhost:3000
- Verify all CRUD operations work
- Check calculations are accurate
- Ensure localStorage persistence works

---

## 📦 Deployment

### Railway (Production)
- Manual deployment ONLY
- User must explicitly request: "deploy to Railway" or "push to production"
- This protocol document should NOT deploy to Railway
- Railway should ignore development documentation

### GitHub
- All commits should push to GitHub (unless stated otherwise)
- Protocol document syncs to GitHub for use on other development machines
- Keep commit history clean and meaningful

---

## 🎯 Current Project Context

### Recent Major Features
- Layer Map visualization for Media Servers
- Projection Screens management with calculations
- Card-based layouts for Sources and Sends
- Header/sidebar reorganization

### Active Development Areas
- Sends/Destinations management
- Projection screen calculations
- LED screen management (future)

### Known Issues
- Computer source edit modal blank page bug (on todo list, not current priority)

---

## 💡 Best Practices

### Session Management
- **Always start session logging** at beginning of work
- **Update milestones** as work progresses
- **Document blockers** and decisions in real-time
- **Complete session log** before ending (even if interrupted)
- **Reference previous sessions** using Session IDs for continuity

### Communication
- Be concise but complete
- Confirm understanding of requirements before implementing
- Ask for clarification on ambiguous requests
- Provide progress updates for multi-step tasks
- Reference session IDs when discussing previous work

### Tool Usage
- Use `multi_replace_string_in_file` for multiple edits when possible
- Parallelize independent read operations
- Use semantic search when exact file location unknown
- Use grep for exact string matching

### Error Handling
- Always check build output for errors
- Verify dev server status after changes
- Test calculations and computed values
- Check localStorage for data integrity issues

### Git Workflow
- Commit frequently locally (every change)
- Use descriptive WIP commit messages
- Squash commits before pushing to GitHub
- Keep SESSION_JOURNAL.md in sync with commits
- See `docs/GIT_WORKFLOW.md` for detailed strategy

---

## 📋 Quick Reference Commands

```bash
# Session management
./scripts/session-log.sh start                    # Start new session
./scripts/session-log.sh milestone "description"  # Log milestone
./scripts/session-log.sh commit "message"         # Commit and log
./scripts/session-log.sh complete "notes"         # Complete session

# Kill processes on dev ports
lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null

# Start dev server (silent)
cd video-production-manager && (nohup npm run dev > /dev/null 2>&1 &)

# Build and check for errors
npm run build

# Git workflow (WIP commits)
git add -A && git commit -m "wip: [description]"

# Git workflow (Feature complete)
git add -A && git commit -m "feat: [description]"
git push origin main  # Only when feature is done

# Squash last 3 WIP commits into one
git reset --soft HEAD~3 && git commit -m "feat: [combined description]"

# Check commit history
git log --oneline -10

# View recent sessions
./scripts/session-log.sh show
```

---

## ⚠️ Safe Command Protocol (Anti-Crash Guidelines)

**Updated:** January 30, 2026 (after multiple VS Code crashes)

### Memory-Heavy Operations - CRITICAL RULES

#### 1. **NEVER Run Prisma Studio from VS Code Terminal**
- ❌ BAD: `npx prisma studio`
- ✅ GOOD: Tell user to run in separate terminal window OR use Prisma VS Code extension
- Reason: Loads entire DB into memory, keeps WebSocket connections open, frequently causes exit code 137 (SIGKILL)

#### 2. **Batch Operations Must Be Chunked**
- ❌ BAD: Generate/migrate/seed all entities at once
- ✅ GOOD: Process in batches of 3-5 with 1-2 second pauses between batches
```bash
# Example: Chunked entity generation
./generate-entity.sh Source; ./generate-entity.sh Send; ./generate-entity.sh Camera
sleep 2
./generate-entity.sh CCU; ./generate-entity.sh Connection
sleep 2
# etc...
```

#### 3. **Database Operations Must Be Sequential**
Never run migrations, generations, and seed scripts simultaneously:
```bash
# ✅ CORRECT: One at a time
npx prisma migrate dev --create-only --name add_entity
# Review the SQL
npx prisma migrate deploy
sleep 2
npx prisma generate
sleep 1
npm run seed:entity
```

#### 4. **Always Verify Before Heavy Commands**
Before running memory-intensive operations:
- Check if servers are already running (kill if needed)
- Verify database connection (local vs remote)
- Ensure no other heavy processes active
- Consider available system memory

#### 5. **Use Local Database for Development**
- ✅ Local PostgreSQL for schema work, migrations, and heavy operations
- ❌ Remote Railway database adds latency and timeout risk
```bash
# Development
export DATABASE_URL="postgresql://localhost:5432/viddept_dev"
npx prisma migrate dev

# Production sync (after local testing)
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

#### 6. **Process Management**
```bash
# Always clean up before starting servers
pkill -9 -f "tsx watch"
pkill -9 -f "vite"
lsof -ti:3010 -ti:3011 | xargs kill -9 2>/dev/null
sleep 2

# Then start (use tasks if available)
# From /api: npm run dev
# From /video-production-manager: npm run dev
```

#### 7. **Schema Management Protocol**
- Always backup schema before introspection: `cp prisma/schema.prisma prisma/schema.backup.$(date +%s).prisma`
- Use `prisma migrate` for schema changes, NOT manual `db pull`
- Keep PascalCase models with `@@map` to snake_case tables
- Never trust `prisma db pull` to maintain your schema structure

### Crash Introspection Protocol

**When crashes or hangs occur:**

1. **Document the Incident**
   - What command was running?
   - What was the exit code?
   - What else was running simultaneously?
   - How much memory was available?

2. **Analyze Root Cause**
   - Was it a batch operation?
   - Multiple heavy processes?
   - Remote database latency?
   - File watcher overload?

3. **Update This Protocol**
   - Add specific prevention rule
   - Create safe command template
   - Document the lesson learned

4. **Revise Future Approach**
   - Never repeat the same mistake
   - Chunk operations smaller
   - Add more verification steps
   - Increase pause durations

### Command Safety Checklist

Before running ANY of these commands, verify safe conditions:
- [ ] `npx prisma studio` - Use separate terminal or extension instead
- [ ] `npx prisma migrate dev` - Kill all servers first, use local DB
- [ ] `npx prisma db pull` - Backup schema first, understand it will overwrite
- [ ] `npx prisma generate` - Ensure no other Prisma operations running
- [ ] Batch file generation - Limit to 3-5 files, add pauses
- [ ] Heavy npm operations - Check nothing else is building/watching
- [ ] Database seeding - Chunk data, verify connection first

### Memory-Safe Command Templates

```bash
# Safe migration workflow
pkill -9 -f "tsx watch" && sleep 2
cd /api
cp prisma/schema.prisma prisma/schema.backup.$(date +%s).prisma
npx prisma migrate dev --name add_single_entity --create-only
# Review SQL file
npx prisma migrate deploy
sleep 2
npx prisma generate

# Safe batch entity generation (max 3 at a time)
./generate-entity.sh Entity1 entity1 entity-1s ENTITY_1
sleep 1
./generate-entity.sh Entity2 entity2 entity-2s ENTITY_2
sleep 1
./generate-entity.sh Entity3 entity3 entity-3s ENTITY_3
sleep 2

# Safe server restart
pkill -9 -f "tsx watch" && pkill -9 -f "vite"
lsof -ti:3010 -ti:3011 | xargs kill -9 2>/dev/null
sleep 3
cd /api && npm run dev &
sleep 5
cd /video-production-manager && npm run dev &
```

---

**Remember:** This document is a living protocol. Update it when new preferences or patterns emerge. **Especially update after crashes to prevent recurrence.**
