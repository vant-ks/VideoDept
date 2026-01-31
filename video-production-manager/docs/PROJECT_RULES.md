# Video Production Manager - Project Rules

**Project:** VideoDept Video Production Manager  
**Last Updated:** January 30, 2026  
**Maintained By:** Kevin @ GJS Media

This document contains **project-specific** rules and conventions for this codebase. For universal AI agent protocols, see the symlinked `AI_AGENT_PROTOCOL.md` or `~/Dropbox (Personal)/Development/_Utilities/AI_AGENT_PROTOCOL.md`.

---

## 🚫 Critical Project Rules

### Railway Deployments
- **NEVER** automatically deploy to Railway
- Deployments to Railway must be **explicitly requested** by the user
- Wait for explicit instruction: "deploy to Railway" or similar
- This is a production system - deploy with care

### Dev Server Management
- **API Server:** Port **3010** (tsx watch)
- **Frontend:** Port **3011** (Vite)
- **ALWAYS** ensure both servers are running while working
- **NEVER** show interactive prompts (h+enter, r+enter notifications)
- Kill and restart properly using tasks or manual commands

### Port Management
- API backend: **Port 3010 ONLY**
- Frontend dev: **Port 3011 ONLY**
- If ports are occupied, kill the process and restart on correct port
- Never auto-increment to different ports
- Command to clear ports: `lsof -ti:3010,3011 | xargs kill -9 2>/dev/null`

---

## 🗄️ Database Development Workflow

### Local vs Production Separation

**CRITICAL:** Always work with local database, never connect to production from local machine!

```
LOCAL DEV DB:  postgresql://localhost:5432/video_production
PRODUCTION DB: postgresql://railway:25023/railway (Railway only!)
```

### Starting Fresh on a New Branch

```bash
# After git pull/checkout
cd video-production-manager/api
npm run db:reset

# This gives you:
# - Fresh schema (all migrations applied)
# - Equipment library seeded
# - Settings seeded
# - 2 sample productions for testing
```

### What Git Tracks

```
✅ Committed to Git:
  - Code files
  - Schema (prisma/schema.prisma)
  - Migrations (prisma/migrations/**/migration.sql)
  - Seed scripts (.ts files)
  - Equipment data (equipment-data.json)

❌ Never in Git:
  - Database data (your test productions)
  - .env files (contains DATABASE_URL)
  - node_modules
```

### Database Commands

```bash
npm run db:reset        # Full reset (drop → migrate → seed)
npm run db:migrate      # Apply migrations only
npm run seed:equipment  # Re-seed equipment library
npm run seed:settings   # Re-seed settings
npm run seed:sample     # Add sample productions
```

### Data Flow

```
PostgreSQL (source of truth)
    ↓
Express API (port 3010)
    ↓
React Frontend (port 3011)
    ↓
Browser Storage (cache only)
```

**Key Point:** Browser localStorage/IndexedDB is just a cache. Database is the source of truth. On app start, frontend syncs from API/database.

### See Also
- [Database Workflow Guide](../api/docs/DATABASE_WORKFLOW.md) - Comprehensive guide
- [Database Architecture](./DATABASE_ARCHITECTURE.md) - Technical details
- [Getting Started](./GETTING_STARTED_DATABASE.md) - Setup instructions

---

## 🏗️ Architecture

### Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Express + TypeScript + Prisma
- **Database:** PostgreSQL (Railway hosted)
- **State:** Zustand with localStorage persistence
- **Real-time:** Socket.IO for WebSocket events
- **Styling:** TailwindCSS

### Directory Structure
```
video-production-manager/
├── api/                    # Backend Express server
│   ├── prisma/            # Database schema and migrations
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   └── server.ts      # Main server file
│   └── scripts/           # Utility scripts
├── src/                   # Frontend React app
│   ├── components/        # Reusable UI components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks (API calls)
│   ├── services/          # Frontend services
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── docs/                  # Project documentation
└── public/                # Static assets & utility pages
```

---

## 📁 File & Directory Standards

### Git & Version Control
- **Frequent local commits:** After each logical unit of work (WIP commits)
- **Format:** `wip: [description]` for in-progress work
- **Feature commits:** `feat: [description]` when feature is complete
- Use conventional commit format
- **Squash WIP commits** before pushing to GitHub (keep clean remote history)
- **Push to GitHub** only at feature completion or when user requests
- **Session tracking:** All work logged in `docs/SESSION_JOURNAL.md`

### Ignore Patterns
```gitignore
# Development-only files (ignore on Railway/production)
docs/AI_AGENT_PROTOCOL.md
docs/PROJECT_RULES.md
docs/SESSION_JOURNAL.md
docs/DB_DEVELOPMENT_LESSONS.md
docs/CRASH_AUDIT_*.md
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

## 🎨 UI/UX Conventions

### Typography
- **Monospace fonts ONLY in Logs page** (`Logs.tsx`)
- All other pages use default sans-serif
- No `font-mono` class outside of Logs page

### Statistics Cards
- Mini-dashboard statistics have been **removed** from:
  - Media Servers (Layers/Layer Map tabs)
  - Computers page
  - Cameras page
  - CCUs page
- Keep stats **only on Dashboard** and where explicitly requested

### Layout Structure
- Production info (show name, client) displays in **header top-left**
- User menu placeholder reserved in **header top-right** (40px circle)
- No "System Online" status indicators
- Sidebar focuses on navigation only

### Component Styling
- Use **card-based layouts** for list views (Sources, Sends, Cameras, etc.)
- Match styling consistency across similar pages
- **Sources page styling is the reference** for card layouts
- Use TailwindCSS utility classes consistently

---

## 🛠️ Code Standards

### Data Validation at API Boundaries

**ALWAYS validate and whitelist fields when passing data between:**
- Client → Server (API endpoints)
- Route handlers → Database (Prisma)
- Service → Service
- Server → Client (responses)

**Required Pattern:**
1. **Destructure** known fields from request body
2. **Validate** field existence and types
3. **Whitelist** only schema-valid fields
4. **Never spread** unvalidated request data directly into database operations

**Example:**
```typescript
// ❌ BAD: Spreads unknown fields
const { userId, ...updateData } = req.body;
await prisma.model.update({ data: { ...updateData } });

// ✅ GOOD: Explicit field validation
const { userId, field1, field2, ...ignored } = req.body;
const dbData: any = {};
if (field1 !== undefined) dbData.field1 = field1;
if (field2 !== undefined) dbData.field2 = field2;
await prisma.model.update({ data: dbData });
```

**Rationale:** Prevents database errors, injection attacks, and ensures data integrity across all service boundaries.

### State Management
- **Use Zustand** with persist for all application state
- Store location: `src/data/productionStore.ts`
- **Log all CRUD operations** via LogService
- Equipment changes: `LogService.logEquipmentChange()`
- Settings changes: `LogService.logSettingsChange()`

### TypeScript
- All new code must be fully typed
- No `any` types unless absolutely necessary
- Build must pass with 0 TypeScript errors
- Use interfaces for object shapes
- Use types for unions/intersections

### API Hooks Pattern
Each entity has a custom hook in `src/hooks/`:
```typescript
// Example: src/hooks/useSourcesAPI.ts
export const useSourcesAPI = () => {
  const createSource = async (data) => { /* ... */ };
  const updateSource = async (id, data) => { /* ... */ };
  const deleteSource = async (id) => { /* ... */ };
  // ... other operations
  return { createSource, updateSource, deleteSource };
};
```

### Event Sourcing
All changes are logged to `events` table:
- Type: SOURCE, SEND, CAMERA, CCU, etc.
- Operation: CREATE, UPDATE, DELETE
- Includes full entity data snapshot
- Used for audit trail and debugging

---

## 🗄️ Database Conventions

### Prisma Schema Rules
- **Table names:** `snake_case` (matches PostgreSQL convention)
- **Model names in schema:** `snake_case` (e.g., `model checklist_items`)
- **Field names:** `snake_case` (e.g., `production_id`, `created_at`)
- **Prisma client usage:** `prisma.checklist_items.findMany()`
- **TypeScript variables:** `camelCase` (e.g., `const checklistItems = ...`)

### Naming Convention Standard
```typescript
// Database table name
CREATE TABLE checklist_items (...);

// Prisma schema (matches DB exactly)
model checklist_items {
  id String @id
  production_id String  // snake_case fields
  task String
  completed Boolean
}

// Prisma client usage
await prisma.checklist_items.findMany({
  where: { production_id: "123" }
});

// TypeScript variables
const checklistItems = await prisma.checklist_items.findMany(...);
const checklistItem = await prisma.checklist_items.create(...);

// Route URLs
app.use('/api/checklist-items', checklistItemRouter);

// File names
routes/checklist-items.ts
hooks/useChecklistItemAPI.ts
```

### Migration Strategy
- **Always** create migrations locally first
- Test migrations on local PostgreSQL instance
- Then apply to Railway database
- **Never** use `prisma db pull` (overwrites schema)
- **Always** backup schema before operations: `cp prisma/schema.prisma prisma/schema.backup.$(date +%s).prisma`

---

## 🏗️ Entity Generation Protocol

**CRITICAL:** The `generate-entity.sh` script has known issues. See [DB_DEVELOPMENT_LESSONS.md](../../docs/DB_DEVELOPMENT_LESSONS.md) for details.

### Pre-Generation Checklist

```bash
# 1. Navigate to API directory
cd video-production-manager/api

# 2. Verify Prisma schema is valid
npx prisma validate

# 3. Stop all running servers
pkill -9 -f "tsx watch" && pkill -9 -f "vite"
sleep 2

# 4. Validate existing routes
./scripts/validate-routes.sh

# 5. Backup route directory
cp -r src/routes src/routes.backup.$(date +%s)
```

### Entity Generation Rules

**DO:**
- ✅ Create database migration FIRST, then generate route
- ✅ Generate ONE entity at a time
- ✅ Wait 2 seconds between generations
- ✅ Run `validate-routes.sh` after EACH generation
- ✅ Test server startup after EACH generation
- ✅ Commit after each successful entity

**DON'T:**
- ❌ Generate routes before creating database tables
- ❌ Run `generate-all-entities.sh` (too memory intensive)
- ❌ Skip validation between generations
- ❌ Generate while servers are running

### Validation Tool
```bash
# Validate all routes reference valid Prisma models
cd api
./scripts/validate-routes.sh
```

---

## 🧪 Testing Strategy

### Manual Testing
- Test in browser at http://localhost:3011
- Verify all CRUD operations work
- Check calculations are accurate
- Ensure localStorage persistence works
- Test WebSocket real-time updates

### Pre-Commit Checklist
- [ ] TypeScript compiles without errors
- [ ] API server starts successfully
- [ ] Frontend builds without errors
- [ ] Health endpoint responds: `curl http://localhost:3010/health`
- [ ] No console errors in browser
- [ ] LocalStorage data persists correctly

---

## 📦 Deployment

### Railway (Production)
- **Manual deployment ONLY**
- User must explicitly request: "deploy to Railway" or "push to production"
- Never automatically deploy
- Ensure all tests pass before deploying
- Check Railway logs after deployment

### GitHub
- Push to GitHub after feature completion
- Keep commit history clean (squash WIP commits)
- Protocol documents and session journals should sync to GitHub
- Railway ignores docs/ folder in production

---

## 🎯 Current Project State

### Implemented Features
- Production management (CRUD)
- Sources management with format assignments
- Sends/Destinations management
- Cameras with CCU relationships
- Connections (signal flow)
- IP Address tracking
- Checklist items
- Equipment library (specs, cards, I/O ports)
- Settings management (connector types, source types, frame rates, resolutions)
- Real-time WebSocket events
- Event sourcing / audit trail
- Layer Map visualization for Media Servers
- Projection screen calculations

### Known Issues
- Computer source edit modal has blank page bug (low priority)
- 9 entities have routes but NO database tables:
  - cable_snakes
  - cam_switchers
  - led_screens
  - media_servers
  - projection_screens
  - vision_switchers
  - routers
  - records
  - streams
- Route files reference wrong Prisma models (123+ errors)
- Entity generation script has bugs (see [DB_DEVELOPMENT_LESSONS.md](../../docs/DB_DEVELOPMENT_LESSONS.md))

### Active Development Areas
- Signal flow management improvements
- Fixing route/model naming mismatches
- Creating missing database tables for 9 entities

---

## ⚠️ Project-Specific Safety Rules

### Prisma Studio
- **NEVER** run `npx prisma studio` from VS Code terminal
- Use separate terminal window or Prisma VS Code extension
- Causes crashes (exit code 137) due to memory pressure

### Database Operations
- **Use local PostgreSQL** for heavy operations (migrations, seeding)
- **Railway database** for production only
- Always backup schema before operations
- Never run multiple Prisma operations simultaneously

### Server Management
```bash
# Clean shutdown
pkill -9 -f "tsx watch" && pkill -9 -f "vite"
lsof -ti:3010 -ti:3011 | xargs kill -9 2>/dev/null
sleep 2

# Start API server (use task if available)
cd api && npm run dev

# Start frontend (use task if available)
cd video-production-manager && npm run dev
```

---

## 📚 Project Documentation

### Key Documents
- `AI_AGENT_PROTOCOL.md` - Universal AI agent protocols (symlinked from _Utilities)
- `PROJECT_RULES.md` - This document (project-specific)
- `SESSION_JOURNAL.md` - Historical session tracking
- `DB_DEVELOPMENT_LESSONS.md` - Database development lessons learned
- `CRASH_AUDIT_2026-01-30.md` - Crash analysis and prevention
- `GIT_WORKFLOW.md` - Git strategy and commit conventions
- `ARCHITECTURE_AUDIT.md` - System architecture overview
- `DATABASE_FIRST_ARCHITECTURE.md` - Database design decisions

### Utility Scripts
- `api/scripts/generate-entity.sh` - Generate routes/hooks for entities (HAS BUGS)
- `api/scripts/validate-routes.sh` - Validate Prisma model references
- `scripts/session-log.sh` - Session management helper

### Utility Pages
- `public/reset-settings.html` - Reset localStorage (production info, equipment)
- `public/clear-storage.html` - Clear all localStorage
- `public/storage-manager.html` - View/manage localStorage

---

## 🔄 When to Update This Document

- New project-specific conventions are established
- Architecture decisions are made
- Deployment process changes
- New entities or features are added
- Safety rules are discovered through crashes
- UI/UX conventions evolve

**Universal patterns should go in `AI_AGENT_PROTOCOL.md` instead.**

---

**Remember:** This document is **project-specific**. Update it when VideoDept conventions change. Universal patterns belong in `~/Dropbox (Personal)/Development/_Utilities/AI_AGENT_PROTOCOL.md`.
