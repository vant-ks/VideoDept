# Video Production Manager - Project Rules

**Project:** VideoDept Video Production Manager  
**Last Updated:** March 11, 2026  
**Maintained By:** Kevin @ GJS Media

This document contains **project-specific** rules and conventions for this codebase. For universal AI agent protocols, see the symlinked `AI_AGENT_PROTOCOL.md` or `~/Dropbox (Personal)/Development/_Utilities/AI_AGENT_PROTOCOL.md`.

---

<!-- DOCUMENT NAVIGATION — ~3281 lines total
     HOW TO USE: grep_search for  tags:.*<keyword>  to jump to relevant sections.
     Then read_file from the section's start line for only what you need.

     SECTION                               LINE    ~SIZE    KEY TAGS
     ─────────────────────────────────────────────────────────────────────────
     Entity Terminology & Naming            11      ~50     entity-naming, computers, sends, cameras, ccus, hierarchy
     CRITICAL: DB Schema Changes            61      ~33     migration, db-push, prisma, critical
     MISSION STATEMENT — Pillars 1–13       94     ~202     transform, uuid, toSnakeCase, spread-operator, websocket, seed, diagnostic, critical
     Critical Project Rules                296      ~24     railway, deploy, project-rules
     Database Development Workflow         320      ~72     migration, dev-workflow, db-push, prisma
     Architecture                          392      ~33     architecture, tech-stack
     File & Directory Standards            425      ~32     file-structure
     UI/UX Conventions                     457      ~29     ui-ux, typography, layout
     Code Standards [DATA FLOW SECTION]    486    ~1591     transforms, data-flow, indexeddb, cache, websocket, uuid, equipment, ports, api-routes, toSnakeCase, spread-operator
       ↳ Data Flow Architecture            488     ~479     transforms, toCamelCase, toSnakeCase, BigInt, DateTime, snake-case
       ↳ IndexedDB Cache Management        967     ~241     indexeddb, cache, loadProject, dual-path, invalidation
       ↳ Spread Operator Safety           1193     ~209     spread-operator, explicit-fields, uuid-bug, productionId
       ↳ Multi-User Conflict Handling     1402     ~172     multi-user, websocket, conflict, version, clock-skew
     Database Conventions                 2077      ~48     database, field-names, snake-case
     Entity Generation Protocol           2125      ~49     new-entity, entity-generation, checklist
     Testing Strategy                     2174      ~19     testing
     Deployment                           2193      ~17     railway, deployment, production
     Current Project State                2210      ~39     project-state
     Project-Specific Safety Rules        2249      ~29     safety, critical, migration
     Project Documentation                2278      ~24     docs-structure
     Schema & Route Consistency           2302     ~158     schema, routes, api-routes, audit, consistency, entities
     Meta-Rule: Docs Updates              2460      ~40     meta, documentation, project-rules-update
     DB Migration Safety                  2500      ~78     migration, safety, schema-engine, critical
     Schema Drift Resolution              2578     ~109     schema-drift, recovery, migration, db-reset
     When to Update This Document         2687      ~17     meta
     Entity Card UI Design Rules          2704     ~232     card-ui, drag-reorder, reveal-panel, expand-state, sends, computers, ccus, media-servers, cameras
     apiClient Service Gotchas            2936      ~19     apiClient, api-service, fetch, gotcha
     Equipment Soft-Delete & Archive      2955      ~25     equipment, soft-delete, archive
     Port Data & Display Standards        2980     ~169     device-ports, io-ports, ioportspanel, format-select, direct-io, expansion, slot-split, sends
     Overflow Rules                       3149      ~76     overflow, overflow-hidden, dropdown, css, clip-bug, format-cascade
     Modal Layout Standard                3225      ~56     modal, layout, notes, field-order, sends
     ─────────────────────────────────────────────────────────────────────────
-->

---

## �️ CRITICAL: Entity Terminology & Naming
<!-- tags: entity-naming, terminology, computers, media-servers, sends, cameras, ccus, hierarchy, sources-table, legacy-naming, critical -->

**Last Updated:** February 28, 2026

**AI agents MUST use these terms correctly. "Sources" is a parent category, NOT a specific entity.**

### The Hierarchy

```
Sources  (parent category — UI grouping, NOT a DB table)
  ├── Computers     → DB table: `sources`       (legacy table name, UI calls it "Computers")
  └── Media Servers → DB table: `media_servers`

Sends    (parent category — UI grouping, NOT a DB table)
  ├── LED Screens        → DB table: `led_screens`
  ├── Projection Screens → DB table: `projection_screens`
  ├── Monitors           → DB table: `sends` (type = MONITOR)
  ├── Records            → DB table: `records`
  └── Streams            → DB table: `streams`

Signal Flow  (parent category — UI grouping, NOT a DB table)
  ├── Vision Switchers  → DB table: `vision_switchers`
  ├── Cam Switchers     → DB table: `cam_switchers`
  ├── Routers           → DB table: `routers`
  └── Cable Snakes      → DB table: `cable_snakes`

Camera System  (parent category)
  ├── Cameras → DB table: `cameras`
  └── CCUs    → DB table: `ccus`
```

### Rules for AI Agents

1. **NEVER say "sources" when you mean "computers"** — the `sources` DB table stores Computers
2. **"Sources" in conversation = the parent category** (encompasses Computers + Media Servers + Cameras + CCUs)
3. **"Computers" = the specific entity type** stored in the `sources` DB table
4. **The `sources` table name is a legacy artifact** — it was not yet renamed to `computers` in the DB
5. **When referring to the DB model by table name**, always clarify: "`sources` table (UI: Computers)"

### Correct vs Incorrect Usage

| ❌ WRONG | ✅ CORRECT |
|---|---|
| "sources and media servers already done" | "computers and media servers already done" |
| "the sources model has equipment_uuid" | "the computers entity (`sources` table) has equipment_uuid" |
| "Sources page" (meaning Computers UI) | "Computers page" |
| "adding a source record" (meaning a Computer) | "adding a computer record" |

---

## �🚨 CRITICAL: Database Schema Changes
<!-- tags: migration, db-push, prisma, schema, critical, db-migrate-dev, exit-137, vs-code-crash -->

**Last Updated:** February 27, 2026

### ✅ REQUIRED: Use `prisma db push` for Local Development

**DO NOT use `prisma migrate dev` for local schema changes. It crashes VS Code (Exit Code 137).**

```bash
# CORRECT approach:
cd api
npx prisma validate        # Check syntax
npm run db:push            # Apply to database (70ms, no crashes)
# ⚠️ MANDATORY: Restart the API server after db:push.
# tsx watch does NOT detect Prisma client regeneration.
# A running server will use stale Prisma client until restarted — causing 500 errors on affected tables.
```

**Create migrations ONLY for production deployment:**
```bash
# When feature is complete and ready to deploy:
npx prisma migrate dev --name feature_name
git add prisma/migrations/
git commit -m "feat: add feature_name"
```

**Documentation:**
- [MIGRATION_CRASH_PREVENTION_RULE.md](../../_Utilities/MIGRATION_CRASH_PREVENTION_RULE.md) - Full protocol
- [DB_DEVELOPMENT_LESSONS.md](../../docs/DB_DEVELOPMENT_LESSONS.md) - Historical context
- [migrations/README_MIGRATION_SAFETY.md](../api/prisma/migrations/README_MIGRATION_SAFETY.md) - Quick reference

---

## 🎯 MISSION STATEMENT - READ BEFORE CODING
<!-- tags: critical, transform, uuid, toSnakeCase, spread-operator, cache, websocket, seed, entity-data-flow, diagnostic, fk-uuid, toCamelCase -->

**Every bug we've encountered traces back to violating one of these core principles:**

### The Pillars of Data Integrity

1. **TRANSFORMS ARE TRUTH** → Never manually convert types. Use `toCamelCase()`/`toSnakeCase()` everywhere.
   - See: [Data Flow Architecture](#data-flow-architecture---critical-patterns)
   - Covers: BigInt serialization, DateTime handling, snake_case ↔ camelCase
   - **SERVER-SIDE TRANSFORMATION CONTRACT**: API always sends camelCase (via toCamelCase), frontend always receives camelCase
   - **⛔ API ROUTE HANDLERS**: Every POST/PUT handler MUST call `toSnakeCase(inputData)` BEFORE passing to Prisma. Never pass raw camelCase req.body fields to Prisma `data:{}`. Reference implementation: `api/src/routes/cameras.ts` POST handler. This has caused 500 errors multiple times.

2. **CACHE IS NOT TRUTH** → Always verify cached data with API. Database is source of truth.
   - See: [IndexedDB Cache Management](#indexeddb-cache-management---critical-patterns)
   - Covers: Browser B empty state, dual-path loading, cache invalidation

3. **SERVER OWNS TIME** → Client never sends timestamps. Server sets `updated_at`, `completed_at`, etc.
   - See: [Multi-User Conflict Handling](#multi-user-conflict-handling---critical-patterns)
   - Covers: Clock skew, Prisma validation errors, race conditions

4. **SCHEMA DRIVES SEED** → Never add seed data before database sync. Schema → `db:push` → Seed → Types → Routes.
   - See: [Seed Data Integrity](#seed-data-integrity---critical-patterns)
   - Covers: Missing fields, silent Prisma drops, undefined values
   - Development: Use `npm run db:push` to sync schema changes

5. **FETCH ALL ENTITIES** → Loading production must fetch ALL related data (checklist, sources, sends, cameras, CCUs) in BOTH cached and fresh paths.
   - See: [Production Loading - Dual Path Pattern](#production-loading---dual-path-pattern)
   - Covers: Empty checklists, missing entities, field mapping consistency

6. **NO SPREAD OPERATORS ON INPUT** → Never use `...input` or `...data` when sending to API. Always explicitly pass each field.
   - See: [Spread Operator Safety](#spread-operator-safety---critical-pattern)
   - Covers: String iteration bugs, UUID split into numeric keys, undefined productionId
   - Pattern: Extract fields individually, never spread entire objects

7. **SCHEMA CONSISTENCY FIRST** → All entity tables must follow standard field patterns. Audit before implementing new entities.
   - See: [Schema & Route Consistency](#schema--route-consistency---critical-patterns)
   - Covers: Missing updated_at, inconsistent field names, Prisma relation mismatches
   - Pattern: Standard fields (id, production_id, created_at, updated_at, version, is_deleted)

8. **AUDIT FINDINGS GO TO PROJECT RULES** → When you conduct an audit and discover novel patterns, document them here immediately.
   - See: [Meta-Rule: Documentation Updates](#meta-rule-documentation-updates)
   - Covers: Knowledge capture, pattern evolution, preventing repeat issues

9. **ENTITY DATA FLOW STANDARD** → All entities MUST follow standardized 4-layer pattern: Database (snake_case) → API (transform + emit) → Frontend hooks → Pages (WebSocket sync).
   - See: [../../docs/ENTITY_DATA_FLOW_STANDARD.md](../../docs/ENTITY_DATA_FLOW_STANDARD.md) for complete reference implementation
   - Enforced: Run `./scripts/validate-entity-pattern.sh` before commits
   - Covers: WebSocket event naming (entity:created not source:created), .id not .uuid, generic events, toCamelCase usage
   - Pattern: Backend emits `entity:created/updated/deleted` with entityType in payload, frontend filters by entityType
   - **MANDATORY**: Follow checklist when creating new entities to prevent sync bugs

10. **UUID AS PRIMARY KEY, ID AS DISPLAY** → All entity tables use auto-generated uuid as PRIMARY KEY. The id field is user-editable for display purposes.
   - See: [../../docs/incident-reports/UUID_ARCHITECTURE_SOLUTION_2026-02-22.md](../../docs/incident-reports/UUID_ARCHITECTURE_SOLUTION_2026-02-22.md) for complete architecture
   - Database: `uuid String @id @default(uuid())` - Postgres auto-generates
   - Database: `id String` with `@@unique([production_id, id])` - User can edit
   - WebSocket: Always use uuid for entityId (immutable, reliable matching)
   - Frontend: Create without uuid, receive it from API response
   - Foreign Keys: Always reference uuid (immune to id changes)
   - **PATTERN**: User can rename "SRC 1" → "SRC A" anytime, uuid stays same, all references remain valid
   - **⛔ PAGE COMPONENTS**: When calling `update*()/delete*()` API hooks, ALWAYS pass `entity.uuid` (NOT `entity.id`). Pattern: `updateCCU((editingCCU as any).uuid, data)`. The `.id` field is a user-editable display label, never a DB key. API routes do `findUnique({ where: { uuid } })` — passing `.id` returns 404/500.
   - **⛔ FK REFERENCE FIELDS IN FORM STATE**: When storing a related entity's ID in form state (e.g. `equipmentUuid`), ALWAYS use `spec.uuid` (the DB primary key), NEVER `spec.id` (the display label). Prisma FK constraints reference `.uuid`. Storing `.id` causes FK violation → 500 on save.
   - **MIGRATION**: ONE table at a time, track progress in DEVLOG.md to prevent crashes

11. **ALWAYS USE PRE-MIGRATION SAFETY CHECKS** → Run `npm run db:migrate:check` before EVERY migration to prevent VS Code crashes.
   - See: [Database Migration Safety](#database-migration-safety---critical-patterns)
   - Covers: Zombie process detection, memory checks, schema drift detection
   - Pattern: Safety Check → Migration → Verify Cleanup
   - **CRITICAL**: Never skip this step, even for "simple" migrations

12. **SCHEMA DRIFT = DATABASE RESET IN DEV** → When Prisma detects drift from schema changes/reverts, use `npm run db:reset` to realign.
   - See: [Schema Drift Resolution](#schema-drift-resolution---critical-patterns)
   - Covers: Post-rollback drift, UUID experiments, schema edits without migrations
   - Pattern: Detect Drift → Check Git History → Reset Database → Create Migration
   - **Safe in Dev**: No production data risk, fresh migrations guaranteed

13. **⛔ MIGRATION STOP CONDITIONS - NEVER IGNORE** → If Prisma asks to "reset schema", STOP IMMEDIATELY. This is NOT normal migration behavior.
   - See: [../../_Utilities/MIGRATION_CRASH_PREVENTION_RULE.md](../../_Utilities/MIGRATION_CRASH_PREVENTION_RULE.md) for complete rules
   - **RED FLAG**: "We need to reset the 'public' schema... All data will be lost" → Schema-database mismatch, investigate before proceeding
   - **MANDATORY**: Run `npx prisma validate` and `npx prisma migrate status` before EVERY migration
   - **NEVER**: Retry a failed migration without investigating root cause (causes crashes)
   - **ALWAYS**: Kill zombie Prisma processes before migrations (`pkill -9 -f 'schema-engine'`)
   - **Pattern**: Validate → Check Status → Kill Zombies → ONE Migration → Verify → Pause 2s before next
   - **CRITICAL**: This rule has prevented 3+ crashes. Non-negotiable.

### Quick Diagnostic Checklist

**When you see an error:**
- 🔥 "Do not know how to serialize BigInt" → Check transform functions (#1)
- 🔥 "Browser B shows no items" → Check entity fetching in loadProject (#5)
- 🔥 "Field is undefined" → Check schema → seed order (#4) OR check WebSocket mapping (#1)
- 🔥 "Version conflict" or "Prisma validation error" → Check timestamp management (#3)
- 🔥 "Stale data after deletion" → Check cache invalidation (#2)
- 🔥 "Argument X is missing" or numeric keys (0,1,2) in Prisma data → Check REST destructuring and toSnakeCase primitive handling
- 🔥 "Invalid prisma.*.create() invocation" with numeric keys → UUID/string being iterated, fix toSnakeCase type guards
- 🔥 "productionId: undefined" with UUID split into {0:'x',1:'y'...} → Check for `...input` spread in API hooks (#6)
- 🔥 "WebSocket not syncing" → Check room joining and broadcast pattern
- 🔥 "Field missing in one browser" → Check ALL THREE mapping locations (#5)
- 🔥 "Item deleted but comes back after refresh" → Check if CRUD calls API + updates cache + broadcasts
- 🔥 "Field undefined after WebSocket update" → Check if listener maps from snake_case when API sends camelCase
- 🔥 "Foreign key constraint violated" → Production not saved to API database, check production creation sync
- 🔥 "Argument updated_at is missing" → Check schema - field might not exist (e.g., source_outputs)
- 🔥 "Unknown argument outputs" → Check Prisma relation name (might be source_outputs not outputs)
- 🔥 **"VS Code crash (exit 137)" → Zombie Prisma processes, run pre-migration check (#11, #13)**
- 🔥 **"Prisma needs reset/drift detected" → Schema changed without migration, check git history then run db:reset (#12, #13)**
- 🔥 **"Migration hangs >30s" → Kill prisma processes, verify no zombie schema-engines (#13)**
- 🔥 **"We need to reset the 'public' schema" → STOP IMMEDIATELY, schema-database mismatch (#13)**
- 🔥 **"500 on POST/PUT to /api/{entity}" → Route handler missing `toSnakeCase()` before Prisma. Check `cameras.ts` POST as reference (#1)**
- 🔥 **"404 not found / Cannot update or delete entity" → Frontend passing display `.id` instead of `.uuid` to API hook. Fix: `(entity as any).uuid` (#10)**
- 🔥 **"FK constraint violation / 500 on create with equipment" → `equipmentUuid` being set to `spec.id` (display) instead of `spec.uuid` (FK). Fix: always use `spec.uuid` when setting FK reference fields (#10)**

**Before writing ANY code that touches data:**
1. **Is this a database migration?** → READ PILLAR #13 first, NEVER skip pre-migration checks
2. Is this a new entity? → Follow schema → migration → seed → types → routes order
3. Does this read/write database? → Use transforms, never manual conversions
4. Does this cache data? → Add invalidation logic
5. Does this set timestamps? → Only on server, never client
6. Does this load production? → Fetch ALL entities in parallel
7. Does this delete/update entity? → API call + cache update + WebSocket broadcast
8. **Writing a POST/PUT API route handler?** → Call `toSnakeCase(inputData)` BEFORE Prisma. See `cameras.ts` POST. (#1)
9. **Calling update/delete from a page component?** → Use `(entity as any).uuid` not `entity.id`. (#10)
10. **Starting ANY task?** → Write a DEVLOG.md checkpoint BEFORE starting (`### [Task] — IN PROGRESS`) and update it to `✅ COMPLETE` when done. This is a true journal — it has solved repeat errors and crash recoveries. No exceptions, no minimum size threshold.

**Before committing:**
11. **Check for zombie Prisma processes:** `ps aux | grep -E '(prisma|schema-engine)' | grep -v grep` (expected: no results)

### Self-Audit Commands

**Before committing, run these checks:**

```bash
# Find snake_case in frontend API calls (VIOLATION: Frontend sending snake_case)
cd video-production-manager
grep -rn "apiClient\.\(create\|update\)" src/hooks src/services src/pages | grep -E "(_id|_in|_out|_info|_note|_to|_date|_at|_by|_show)"

# Expected: No matches (all API calls should send camelCase)
# If matches found: Fix by converting to camelCase, let API transform

# Find manual BigInt conversions (VIOLATION: Should use toCamelCase)
grep -rn "Number(.*BigInt\|BigInt(.*Number" api/src/routes

# Expected: No matches (transforms handle this)

# Find REST destructuring without explicit metadata extraction
grep -rn "toSnakeCase(req\.body)" api/src/routes

# Expected: No matches (should destructure first: const {...meta, ...data} = req.body)
# If found: VIOLATION - transform entire body risks iterating string fields

# Find toSnakeCase without proper primitive guards
grep -A5 "function toSnakeCase" api/src/utils/caseConverter.ts | grep "typeof obj !== 'object'"

# Expected: Should use explicit primitive checks (string|number|boolean)
# If "typeof obj !== 'object'" found: VIOLATION - insufficient guard

# Find manual snake_case → camelCase mapping (OK in specific places)
grep -rn "item\.\(production_id\|days_before_show\)" src/hooks/useProjectStore.ts

# Expected: Only in loadProject mapping sections (lines ~210, ~310)
# If found in API calls: VIOLATION

# Find WebSocket broadcasts without toCamelCase
grep -rn "broadcast.*Entity" api/src/routes | grep -v "toCamelCase"

# Expected: All broadcast calls should use toCamelCase(data)
```

**Grep Pattern Quick Reference:**
```bash
# Snake case patterns to avoid in frontend:
production_id|load_in|load_out|show_name|more_info|completion_note|
assigned_to|due_date|completed_at|days_before_show|updated_at|created_at

# Where they're ALLOWED:
# - api/src/routes/*.ts receiving from req.body (will be transformed)
# - src/hooks/useProjectStore.ts loadProject() mapping API responses (API returns snake_case before transform)
# - api/prisma/schema.prisma (database field names)

# Where they're FORBIDDEN:
# - src/hooks/useProjectStore.ts API calls (create/update operations)
# - src/services/apiClient.ts method parameters
# - src/pages/*.tsx API interactions
# - src/hooks/useProductionSync.ts WebSocket listeners (API broadcasts camelCase via toCamelCase)
```

**Common Mistake - WebSocket Mapping:**
```typescript
// ❌ WRONG - API already sends camelCase, don't map from snake_case
subscribe('checklist-item:created', (data) => {
  const item = {
    daysBeforeShow: data.days_before_show  // undefined!
  };
});

// ✅ CORRECT - API broadcasts toCamelCase(item), use camelCase
subscribe('checklist-item:created', (data) => {
  const item = {
    daysBeforeShow: data.daysBeforeShow  // works!
  };
});
```

---

## 🚫 Critical Project Rules
<!-- tags: railway, deploy, project-rules, conventions -->

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
<!-- tags: migration, dev-workflow, db-push, prisma, db-push, local-dev, schema -->

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
<!-- tags: architecture, tech-stack, react, typescript, express, prisma, postgresql -->

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
<!-- tags: file-structure, directories, git, version-control -->

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
<!-- tags: ui-ux, typography, layout, statistics, fonts, components -->

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
<!-- tags: code-standards, transforms, data-flow, indexeddb, cache, websocket, uuid, equipment, ports, api-routes, toSnakeCase, toCamelCase, spread-operator, productions, send, entity-data-flow -->

### Data Flow Architecture - CRITICAL PATTERNS
<!-- tags: data-flow, transforms, toCamelCase, toSnakeCase, BigInt, DateTime, snake-case, camelCase, api-routes, critical -->

**Learned from Checklist Item Debugging (Feb 2026):**

#### Architectural Decision: Server-Side Transformation

**Why transform on server (not client)?**
1. ✅ **Single source of truth** - One place to fix bugs
2. ✅ **WebSocket efficiency** - Broadcast once (transformed), works for all clients
3. ✅ **Lower client CPU** - Important for mobile/low-powered devices
4. ✅ **Consistent format** - All clients receive identical camelCase data
5. ✅ **Industry standard** - REST APIs return client-friendly formats

**Why NOT client-side transform?**
- ❌ Every WebSocket listener must transform (N routes × M clients × P listeners)
- ❌ More bug surface area (inconsistent implementations)
- ❌ More client CPU usage
- ❌ Harder to debug (which client transformed wrong?)

**The Contract:**
```
Client → Server: Always send camelCase
Server → Client: Always receive camelCase (transformed by server)
Database: Always stores snake_case
```

#### The Four-Layer Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: PostgreSQL Database (Source of Truth)         │
│   - snake_case fields                                   │
│   - BigInt for timestamps (Unix milliseconds)           │
│   - DateTime for calendar dates                         │
│   - Prisma types (NOT JSON-serializable)                │
└──────────────────┬──────────────────────────────────────┘
                   ↓ Prisma Query
┌──────────────────┴──────────────────────────────────────┐
│ Layer 2: Express API Routes (TRANSFORMATION LAYER)      │
│   - Receives Prisma objects with special types          │
│   - Incoming: req.body (camelCase) → toSnakeCase()      │
│   - Outgoing: Prisma → toCamelCase() → res.json()       │
│   - WebSocket: Prisma → toCamelCase() → io.emit()       │
│   - Converts: BigInt→number, DateTime→ISO string        │
└──────────────────┬──────────────────────────────────────┘
                   ↓ HTTP/WebSocket (JSON - camelCase)
┌──────────────────┴──────────────────────────────────────┐
│ Layer 3: Frontend TypeScript (READY TO USE)             │
│   - camelCase fields (no transform needed!)             │
│   - number for timestamps                               │
│   - string (ISO) for dates                              │
│   - API calls: Send camelCase → Receive camelCase       │
│   - WebSocket: Receive camelCase (already transformed!) │
└──────────────────┬──────────────────────────────────────┘
                   ↓ State Management
┌──────────────────┴──────────────────────────────────────┐
│ Layer 4: IndexedDB/LocalStorage (Cache)                 │
│   - Same format as Layer 3 (camelCase)                  │
│   - Invalidated on production changes                   │
│   - NOT source of truth                                 │
└─────────────────────────────────────────────────────────┘
```

#### Transform Function Design Rules

**CRITICAL:** All Prisma responses MUST pass through transform functions before:
- Returning from API routes
- Broadcasting via WebSocket
- Logging to events table
- Storing in any JSON format

**The caseConverter.ts MUST:**

```typescript
// 1. Handle Prisma-specific types
export function toCamelCase(obj: any): any {
  // BigInt (from Prisma) → number (for JSON)
  if (typeof obj === 'bigint') return Number(obj);
  
  // DateTime (from Prisma) → ISO string (for JSON)
  if (obj instanceof Date) return obj.toISOString();
  
  // Recursively transform nested objects/arrays
  // Convert snake_case keys to camelCase
}

export function toSnakeCase(obj: any): any {
  // number → number (BigInt conversion happens in Prisma)
  if (typeof obj === 'bigint') return Number(obj);
  
  // Date → Date (keep for Prisma)
  if (obj instanceof Date) return obj;
  
  // ISO string → Date (for Prisma DateTime fields)
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj)) {
    return new Date(obj);
  }
  
  // Recursively transform nested objects/arrays
  // Convert camelCase keys to snake_case
}
```

#### REST Destructuring & String Iteration Bug - CRITICAL PATTERN

**Learned from sources.ts and checklist-items.ts (Feb 2026):**

**The Bug:** When using destructuring with rest parameters (`...rest`), string values (like UUIDs) can be accidentally treated as iterables, causing them to be spread into numeric keys.

**Error signature:**
```typescript
// Prisma error shows UUID converted to character array:
{
  0: "5",
  1: "b",
  2: "0",
  3: "8",
  // ... rest of UUID characters as numeric keys
  production_id: undefined
}
```

**Root Cause Chain:**
1. REST destructuring creates an object with remaining fields
2. Object passed to `toSnakeCase()`
3. If `toSnakeCase()` doesn't handle primitives correctly, it iterates over string characters
4. Spread operator (`...`) spreads these numeric keys into Prisma data
5. Prisma sees numeric keys instead of proper field names
6. Database operation fails with validation error

**The Fix - Type Guard Order Matters:**

```typescript
// ✅ CORRECT: Explicit primitive checks BEFORE object check
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  // CRITICAL: Check primitives FIRST with explicit type guards
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj; // Return immediately, never iterate
  }
  
  // BigInt after primitives but before arrays
  if (typeof obj === 'bigint') return Number(obj);
  
  // Arrays before plain objects (arrays are also typeof 'object')
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }
  
  // Date instances before plain objects
  if (obj instanceof Date) return obj;
  
  // NOW safe to process as plain object
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      acc[snakeKey] = toSnakeCase(obj[key]); // Recursive
      return acc;
    }, {});
  }
  
  return obj;
}

// ❌ WRONG: Generic "not object" check insufficient
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  // BUG: This doesn't catch strings reliably
  if (typeof obj !== 'object') return obj;
  
  // Arrays check happens but strings already passed through
  if (Array.isArray(obj)) return obj.map(item => toSnakeCase(item));
  
  // String UUIDs reach here and get iterated!
  if (typeof obj === 'object') {
    // Object.keys("uuid-string") returns ["0", "1", "2", ...]
  }
}
```

**Why the order matters:**
- `typeof "string"` returns `"string"` (primitive)
- `typeof []` returns `"object"` (not primitive!)
- `typeof {}` returns `"object"` (not primitive!)
- Must check specific primitive types BEFORE generic `typeof obj === 'object'`

**API Route Pattern - Defensive Destructuring:**

```typescript
// ✅ CORRECT: Explicitly list metadata fields to exclude
router.post('/', async (req, res) => {
  // Extract known metadata that should NOT be transformed
  const { outputs, productionId, userId, userName, ...sourceData } = req.body;
  
  // Log for debugging (especially during development)
  console.log('Creating source with productionId:', productionId);
  console.log('Source data before conversion:', sourceData);
  
  // Transform the rest (sourceData should be plain object with entity fields)
  const snakeCaseData = toSnakeCase(sourceData);
  
  console.log('Source data after conversion:', snakeCaseData);
  
  // Explicit field assignment prevents accidental spreads
  const source = await prisma.sources.create({
    data: {
      ...snakeCaseData,
      production_id: productionId, // Explicit, not from spread
      outputs: outputs ? {
        create: outputs.map(toSnakeCase) // Transform nested arrays
      } : undefined
    }
  });
  
  res.json(toCamelCase(source));
});

// ❌ WRONG: Transform entire req.body including metadata
router.post('/', async (req, res) => {
  // BUG: productionId (UUID string) gets spread into numeric keys
  const snakeCaseData = toSnakeCase(req.body);
  
  const source = await prisma.sources.create({
    data: {
      ...snakeCaseData, // Contains 0:"5", 1:"b", etc.
      // production_id is undefined or wrong!
    }
  });
});
```

**Debugging Checklist for "Argument X is missing" Errors:**

1. ✅ Check API logs for numeric keys (0, 1, 2) in Prisma data
2. ✅ Verify `toSnakeCase()` has explicit primitive type guards
3. ✅ Check destructuring extracts ALL metadata before `...rest`
4. ✅ Verify spread operator only used on transformed plain objects
5. ✅ Add console.log before/after `toSnakeCase()` to inspect data
6. ✅ Ensure UUIDs and timestamps passed explicitly, not in spread
7. ✅ Test with real UUID values (not simple strings like "test")

**Apply to ALL Entity Routes:**

This pattern applies to every entity creation/update route:
- ✅ sources.ts (computers, cameras, media servers)
- ✅ sends.ts
- ✅ checklist-items.ts
- ✅ ccus.ts
- ✅ cameras.ts
- ✅ media-servers.ts
- ✅ Any future entity routes

**Transform Function Self-Test:**

```typescript
// Add to caseConverter.test.ts (if you create one)
test('toSnakeCase handles UUIDs correctly', () => {
  const uuid = '5b0874e6-64f7-4ab7-8909-085cfe4de47c';
  const result = toSnakeCase(uuid);
  expect(result).toBe(uuid); // Should return unchanged
  expect(typeof result).toBe('string');
  expect(result).not.toHaveProperty('0'); // Should NOT have numeric keys
});

test('toSnakeCase handles nested objects with UUIDs', () => {
  const data = {
    id: '5b0874e6-64f7-4ab7-8909-085cfe4de47c',
    productionId: 'abc-123',
    name: 'Test Source'
  };
  const result = toSnakeCase(data);
  expect(result.id).toBe(data.id); // UUID preserved
  expect(result.production_id).toBe(data.productionId);
  expect(result.name).toBe(data.name);
  expect(result).not.toHaveProperty('0'); // No numeric keys
});
```

#### API Route Pattern - ALWAYS Follow This

```typescript
// ✅ CORRECT Pattern
router.get('/production/:id', async (req, res) => {
  const items = await prisma.table.findMany({ where: {...} });
  res.json(toCamelCase(items)); // ALWAYS transform before sending
});

router.post('/', async (req, res) => {
  const data = toSnakeCase(req.body); // ALWAYS transform incoming data
  const item = await prisma.table.create({ data });
  res.json(toCamelCase(item)); // ALWAYS transform before sending
});

router.put('/:id', async (req, res) => {
  const data = toSnakeCase(req.body);
  const item = await prisma.table.update({ where: {id}, data });
  
  // Broadcast to WebSocket
  broadcastEntityUpdate({
    data: toCamelCase(item) // ALWAYS transform before broadcast
  });
  
  res.json(toCamelCase(item)); // ALWAYS transform before sending
});

// ❌ WRONG Pattern
router.get('/production/:id', async (req, res) => {
  const items = await prisma.table.findMany({ where: {...} });
  res.json(items); // ERROR: BigInt/DateTime not JSON-serializable
});
```

#### Common Type Pitfalls

**BigInt Fields:**
- Database: `BigInt` (Prisma type)
- API Response: `number` (via toCamelCase)
- Frontend: `number` (TypeScript)
- **Never manually convert** - let transform functions handle it

**DateTime Fields:**
- Database: `DateTime` (Prisma type)
- API Response: `string` (ISO format via toCamelCase)
- Frontend: `string` (TypeScript)
- **Never manually convert** - let transform functions handle it

**Timestamps vs Dates:**
- Use `BigInt` for event timestamps (e.g., `completed_at`)
- Use `DateTime` for calendar dates (e.g., `due_date`)
- Frontend treats both as primitives (number/string)

#### WebSocket Broadcast Rules

**ALWAYS use transform functions:**

```typescript
// ✅ CORRECT
const item = await prisma.checklist_items.create({ data });
io.to(room).emit('item:created', toCamelCase(item));

// ❌ WRONG - BigInt causes serialization error
const item = await prisma.checklist_items.create({ data });
io.to(room).emit('item:created', item); // ERROR
```

#### Field Mapping Consistency

**For every entity, maintain:**

1. **Database Schema** (snake_case):
```prisma
model checklist_items {
  completed_at BigInt?
  due_date DateTime?
}
```

2. **Frontend Type** (camelCase):
```typescript
interface ChecklistItem {
  completedAt?: number;
  dueDate?: string;
}
```

3. **Transform Verification:**
```typescript
// Database field → Frontend field
completed_at → completedAt (BigInt → number)
due_date → dueDate (DateTime → string)
```

**Never mix naming conventions within a layer.**

#### Server-Side Timestamp Management

**Pattern for completion/modification times:**

```typescript
// ✅ CORRECT: Server sets all timestamps
router.put('/:id', async (req, res) => {
  const { completed, ...otherFields } = toSnakeCase(req.body);
  
  const updateData: any = { ...otherFields };
  
  // Server manages timestamps based on state
  if (completed !== undefined) {
    updateData.completed = completed;
    updateData.completed_at = completed ? BigInt(Date.now()) : null;
  }
  
  updateData.updated_at = new Date(); // Server always sets this
  
  const item = await prisma.table.update({ where: {id}, data: updateData });
  res.json(toCamelCase(item));
});

// ❌ WRONG: Client sends timestamps
// Client sends: { completed: true, completedAt: 1234567890 }
// Problems: clock skew, client manipulation, duplicate timestamps
```

**Why:**
- Single source of truth (server clock)
- No client clock skew issues
- Atomic timestamp with state change
- Server validation of state transitions

#### Testing Pattern for Data Flow

**Before committing any entity CRUD:**

```bash
# 1. Test GET endpoint returns valid JSON
curl http://localhost:3010/api/entities/production/ID | jq .
# Verify: no "Do not know how to serialize BigInt" errors

# 2. Test POST creates and broadcasts without errors
# Check API logs for broadcast success

# 3. Test PUT updates and broadcasts without errors
# Check API logs for broadcast success

# 4. Open two browsers, verify real-time sync works
# Check browser consoles for WebSocket message receipt
```

#### Debugging Checklist

**When you see "Do not know how to serialize BigInt":**

1. ✅ Check if route uses `toCamelCase()` before `res.json()`
2. ✅ Check if WebSocket broadcast uses `toCamelCase()`
3. ✅ Check if event logging converts data before `JSON.stringify()`
4. ✅ Verify `caseConverter.ts` handles BigInt in recursive calls
5. ✅ Look for manual BigInt conversions (remove them - redundant)

**When fields don't sync between browsers:**

1. ✅ Verify field exists in Prisma schema
2. ✅ Verify field mapping in `toCamelCase()` / `toSnakeCase()`
3. ✅ Check WebSocket listener maps the field
4. ✅ Check API route includes field in response
5. ✅ Verify frontend type includes the field

#### Future Entity Development

**For ANY new entity with Prisma:**

1. **Define Schema** with correct types:
   - Timestamps → `BigInt?`
   - Dates → `DateTime?`
   - Foreign keys → `String` with `@relation`

2. **Generate Route** ensuring:
   - GET uses `toCamelCase(result)`
   - POST/PUT use `toSnakeCase(input)` and `toCamelCase(result)`
   - Broadcasts use `toCamelCase(data)`

3. **Define Frontend Type** matching:
   - BigInt → `number?`
   - DateTime → `string?`
   - All snake_case → camelCase

4. **Test Data Flow:**
   - Create → appears in other browsers
   - Update → syncs immediately
   - Delete → removes from all browsers
   - No console errors

5. **Verify Transform Coverage:**
   - API responses are valid JSON
   - WebSocket messages are valid JSON
   - No manual type conversions in routes

---

### IndexedDB Cache Management - CRITICAL PATTERNS
<!-- tags: indexeddb, cache, loadProject, dual-path, cache-invalidation, browser-sync, local-storage -->

**Learned from "Browser B can't see checklist items" bug (Feb 2026):**

#### The Cache Problem

```
Timeline of the Bug:
1. Browser A creates production → saves to DB → caches in IndexedDB
2. Browser B opens same production → loads from its OWN IndexedDB cache
3. Browser B's cache is EMPTY (never saw the production before)
4. Result: Browser B shows production but NO entities (checklist, sources, etc.)
```

**Root Cause:** Production metadata cached separately from entity data.

#### Cache Architecture Rules

**CRITICAL: Cache is NOT the source of truth**

```typescript
// ❌ WRONG: Load from cache without verification
const loadProduction = (id) => {
  const cached = await projectDB.getProduction(id);
  if (cached) {
    setState(cached); // BUG: May be stale or incomplete
    return;
  }
  // Fetch from API only if cache miss
}

// ✅ CORRECT: Cache + API validation pattern
const loadProduction = async (id) => {
  // Try cache first for speed
  const cached = await projectDB.getProduction(id);
  
  if (cached) {
    // Show cached data immediately (optimistic)
    setState(cached);
    
    // But ALWAYS verify with API
    const fresh = await apiClient.getProduction(id);
    
    if (fresh.version > cached.version) {
      // Cache stale - update it
      await projectDB.saveProduction(fresh);
      setState(fresh);
    }
  } else {
    // No cache - fetch everything from API
    const production = await apiClient.getProduction(id);
    
    // Fetch ALL entity data in parallel
    const [checklist, sources, sends, cameras, ccus] = await Promise.all([
      apiClient.getChecklistItems(id),
      apiClient.getSources(id),
      apiClient.getSends(id),
      apiClient.getCameras(id),
      apiClient.getCCUs(id)
    ]);
    
    const fullData = { production, checklist, sources, sends, cameras, ccus };
    
    // Save to cache
    await projectDB.saveProduction(fullData);
    setState(fullData);
  }
}
```

#### Cache Invalidation Rules

**When to clear cache:**

1. **Production deleted** → Clear from cache immediately
2. **User logs out** → Clear all caches
3. **Global reset** → Clear all caches via WebSocket broadcast
4. **Entity created/updated/deleted** → Update cache incrementally
5. **Version conflict** → Clear and reload from API

**Implementation:**

```typescript
// ✅ CORRECT: Delete clears cache
const deleteProduction = async (id) => {
  await apiClient.deleteProduction(id);
  await projectDB.deleteProduction(id); // Clear from cache
  
  // If this was the last opened production, clear that too
  if (lastOpenedProjectId === id) {
    setLastOpenedProjectId(null);
  }
}

// ✅ CORRECT: Global reset clears all caches
socket.on('app:global-reset', async () => {
  localStorage.clear();
  await projectDB.clearAll();
  window.location.href = '/projects';
});
```

#### Production Loading - Dual Path Pattern

**The Problem We Had:**

```typescript
// Original loadProject had TWO paths with DIFFERENT logic:

// Path 1: Cached production
if (cachedProject) {
  setState(cachedProject);
  // BUG: Didn't fetch entity data!
  return;
}

// Path 2: Fresh production
const production = await api.getProduction(id);
const checklist = await api.getChecklistItems(id); // Only in Path 2!
setState({ production, checklist });
```

**Result:** Browser A (created production) had full data. Browser B (loaded from cache) had no entities.

**The Fix:**

```typescript
// ✅ CORRECT: BOTH paths fetch entity data
const loadProject = async (id) => {
  let production;
  
  // Get production metadata
  const cached = await projectDB.getProduction(id);
  if (cached) {
    production = cached.production;
  } else {
    production = await apiClient.getProduction(id);
  }
  
  // ALWAYS fetch entity data (regardless of cache)
  const [checklist, sources, sends, cameras, ccus] = await Promise.all([
    apiClient.getChecklistItems(production.id), // Use production.id, not IndexedDB id
    apiClient.getSources(production.id),
    apiClient.getSends(production.id),
    apiClient.getCameras(production.id),
    apiClient.getCCUs(production.id)
  ]);
  
  // Map ALL fields correctly
  const fullData = {
    production,
    checklist: checklist.map(item => ({
      id: item.id,
      title: item.title,
      item: item.title, // Map title to item
      category: item.category,
      completed: item.completed,
      completedAt: item.completedAt,
      daysBeforeShow: item.daysBeforeShow, // MUST map this field
      dueDate: item.dueDate,
      // ... all other fields
    })),
    sources,
    sends,
    cameras,
    ccus
  };
  
  setState(fullData);
  await projectDB.saveProduction(fullData);
}
```

**Critical Rules:**

1. **BOTH paths** (cached and fresh) must fetch entity data
2. **Use production.id** (from database), never IndexedDB UUID
3. **Map ALL fields** in BOTH paths identically
4. **Fetch in parallel** (Promise.all) for performance

#### Field Mapping Verification Process

**Before committing any entity with multiple load paths:**

```bash
# 1. Search for all places that map the entity
grep -n "checklistItem.map\|checklist.map" src/hooks/useProjectStore.ts

# 2. Verify IDENTICAL field lists:
# - Cached path mapping
# - Fresh path mapping  
# - WebSocket sync mapping

# 3. Check for missing fields by comparing to:
# - Prisma schema
# - Frontend TypeScript type
# - API response structure
```

**Example verification:**

```typescript
// Prisma schema has:
model checklist_items {
  days_before_show Int?
  due_date DateTime?
  completed_at BigInt?
}

// Frontend type has:
interface ChecklistItem {
  daysBeforeShow?: number;
  dueDate?: string;
  completedAt?: number;
}

// Verify ALL THREE mappings include:
// ✅ Cached path: daysBeforeShow: item.daysBeforeShow
// ✅ Fresh path: daysBeforeShow: item.daysBeforeShow
// ✅ WebSocket: daysBeforeShow: data.days_before_show

// If ANY path is missing a field, sync will break!
```

---

### Spread Operator Safety - CRITICAL PATTERN
<!-- tags: spread-operator, explicit-fields, uuid-bug, productionId, api-hooks, critical -->

**Learned from "UUID split into numeric keys" bug (Feb 2026):**

#### The String Iteration Problem

```
Error Signature:
Creating source with productionId: undefined
Source data before conversion: {
  '0': '6', '1': '7', '2': '7', '3': '3', ...
  '35': '7'  // UUID "677359b5-..." split into numeric keys
}
Invalid prisma.sources.create() invocation
Argument `id` is missing
```

**Root Cause:** Using spread operator (`...input`) on objects causes JavaScript to iterate string values as if they were arrays, creating numeric keys for each character.

#### The Problem Pattern

```typescript
// ❌ WRONG: Spread operator iterates UUID strings
const createSource = async (input: CreateSourceInput) => {
  const { userId, userName } = getUserInfo();
  const data = await apiClient.post('/sources', {
    ...input,  // 🔥 BUG: Spreads productionId UUID as {0:'6', 1:'7',...}
    userId,
    userName,
  });
};

// Backend receives:
{
  userId: 'user123',
  userName: 'John',
  '0': '6', '1': '7', ... '35': '7',  // productionId UUID split!
  productionId: undefined  // Lost in the spread
}
```

#### Why This Happens

When JavaScript spreads an object with string fields:
1. Object.keys() is called internally
2. String primitives get iterated character-by-character
3. Each character becomes a numeric key
4. Original field name is lost
5. Value arrives as `undefined`

**This affects:**
- UUIDs (productionId, entityId)
- Any string field in the input object
- Nested objects that get spread

#### The Solution: Explicit Field Passing

**Pattern for ALL API hooks:**

```typescript
// ✅ CORRECT: Explicitly pass each field
const createSource = async (input: CreateSourceInput) => {
  const { userId, userName } = getUserInfo();
  
  const requestData = {
    id: input.id,
    productionId: input.productionId,  // Explicit - not spread
    type: input.type,
    name: input.name,
    hRes: input.hRes,
    vRes: input.vRes,
    rate: input.rate,
    outputs: input.outputs,
    note: input.note,
    userId,
    userName,
  };
  
  const data = await apiClient.post('/sources', requestData);
  return data;
};

// Backend receives:
{
  userId: 'user123',
  userName: 'John',
  productionId: '677359b5-0d25-4a7f-ad9e-f54dfbeb57d7',  // ✅ Correct!
  type: 'LAPTOP',
  name: 'MacBook Pro',
  // ... all fields intact
}
```

#### Implementation Requirements

**For ALL entity API hooks (`useSourcesAPI`, `useSendsAPI`, etc.):**

1. **Never use spread operators** in API calls:
   ```typescript
   // ❌ Forbidden patterns:
   { ...input, userId }
   { ...data, productionId }
   { ...source, note }
   ```

2. **Always destructure explicitly**:
   ```typescript
   const requestData = {
     field1: input.field1,
     field2: input.field2,
     // ... list every field
   };
   ```

3. **Include ALL required fields** from the input type

4. **Add metadata fields last** (userId, userName, etc.)

#### Backend Pattern (Already Correct)

**Our backend routes already follow the correct pattern:**

```typescript
// ✅ CORRECT: Destructure metadata BEFORE transform
router.post('/', async (req: Request, res: Response) => {
  const { productionId, userId, userName, ...entityData } = req.body;
  // ^ Extract metadata first, leaving only entity fields
  
  const snakeCaseData = toSnakeCase(entityData);
  // ^ Only transform the pure entity data
  
  const entity = await prisma.table.create({
    data: {
      ...snakeCaseData,
      production_id: productionId,  // Add back metadata explicitly
      version: 1
    }
  });
});
```

**Why this works:**
- Metadata extracted BEFORE any spreading
- Only entity fields get transformed
- No UUIDs in the spread target
- Metadata added back explicitly to Prisma data

#### Verification Checklist

**Before any API hook changes:**

```bash
# Find all spread operators in API hooks (should be ZERO)
grep -rn "^\s*\.\.\.(input\|data\|source)" src/hooks/use*API.ts

# Expected: No matches
# If found: Replace with explicit field passing

# Find explicit field passing (should be ALL hooks)
grep -rn "const requestData = {" src/hooks/use*API.ts

# Expected: Every createX method has explicit requestData object
```

#### Example Fix Applied

**Before (useSendsAPI.ts):**
```typescript
const createSend = async (input: CreateSendInput) => {
  const { userId, userName } = getUserInfo();
  return apiClient.post('/sends', {
    ...input,  // 🔥 BUG
    userId,
    userName,
  });
};
```

**After (useSendsAPI.ts):**
```typescript
const createSend = async (input: CreateSendInput) => {
  const { userId, userName } = getUserInfo();
  
  const requestData = {
    productionId: input.productionId,
    name: input.name,
    type: input.type,
    hRes: input.hRes,
    vRes: input.vRes,
    rate: input.rate,
    userId,
    userName,
  };
  
  return apiClient.post('/sends', requestData);
};
```

#### Related Bugs Fixed

This pattern also fixed:
- Checklist items (same root cause)
- Sources (Feb 2026)
- All signal flow entities (proactive fix)

**Key Insight:** The spread operator is convenient but DANGEROUS with objects containing string primitive fields. Always use explicit field passing for API calls.

---

### Multi-User Conflict Handling - CRITICAL PATTERNS

**Learned from "daysBeforeShow undefined" bug (Feb 2026):**

#### The Seed Data Problem

```
Timeline:
1. Seed data in sampleData.ts includes daysBeforeShow
2. createProject() spreads ...item to include all fields
3. API receives the data correctly
4. BUT: Database had NO days_before_show column yet
5. Prisma silently drops the field
6. Result: Production created with checklist but no due dates
```

**Root Cause:** Seed data added before migration applied.

#### Seed Data Development Order

**ALWAYS follow this sequence:**

```bash
# 1. Update Prisma schema FIRST
model checklist_items {
  days_before_show Int?  # Add new field
}

# 2. Generate and apply migration
npx prisma migrate dev --name add_days_before_show

# 3. Update seed data
export const sampleChecklist = [
  { item: 'Task 1', daysBeforeShow: 30 }  # Add field to seed
];

# 4. Update frontend types
interface ChecklistItem {
  daysBeforeShow?: number;  # Add to type
}

# 5. Update API routes to handle field
# 6. Update all mapping locations
# 7. Test with fresh database
npm run db:reset
```

**NEVER:**
- ❌ Add seed data before schema has the field
- ❌ Update types before database supports the field
- ❌ Assume Prisma will error on unknown fields (it silently drops them)

#### Seed Data Validation Pattern

**Add validation to seed scripts:**

```typescript
// ✅ CORRECT: Validate seed data matches schema
import { Prisma } from '@prisma/client';

const validateChecklistItem = (item: any): Prisma.checklist_itemsCreateInput => {
  // Type-check against Prisma's generated input type
  const valid: Prisma.checklist_itemsCreateInput = {
    id: item.id,
    production_id: item.production_id,
    title: item.title,
    category: item.category,
    completed: item.completed || false,
    days_before_show: item.daysBeforeShow, // Must match schema field name
    updated_at: new Date()
  };
  
  return valid;
};

// When seeding:
for (const item of seedData) {
  const validData = validateChecklistItem(item);
  await prisma.checklist_items.create({ data: validData });
}
```

**This ensures:**
- TypeScript catches missing required fields
- Wrong field names cause compile errors
- Type mismatches are caught early

#### Default Data Template Integrity

**For default checklists/templates:**

```typescript
// sampleData.ts
export const defaultChecklistItems = sampleChecklist.map(({ id, completed, ...rest }) => rest);

// ✅ Verify template matches Prisma schema
type ChecklistTemplate = Omit<Prisma.checklist_itemsCreateInput, 'id' | 'production_id' | 'completed'>;

export const defaultChecklistItems: ChecklistTemplate[] = [
  {
    title: 'Task 1',
    category: 'PRE_PRODUCTION',
    days_before_show: 30,  // Type-checked!
    updated_at: new Date()
  }
];
```

**This ensures:**
- Template data is valid for Prisma
- Adding required fields to schema breaks the build (good!)
- Removing fields from schema breaks the build (good!)

#### Testing Seed Data After Schema Changes

```bash
# After any schema change:

# 1. Reset database completely
npm run db:reset

# 2. Create test production using seed data
# (via UI or API)

# 3. Load in different browser (tests cache + API)

# 4. Verify ALL fields appear:
# - Check browser console log
# - Inspect actual data values
# - Test WebSocket sync with changes
```

#### Common Seed Data Mistakes

**❌ WRONG:**
```typescript
// Seed data uses frontend naming
const seedData = [
  { daysBeforeShow: 30 }  // camelCase
];

await prisma.checklist_items.create({ 
  data: seedData[0]  // ERROR: Prisma expects days_before_show
});
```

**✅ CORRECT:**
```typescript
// Seed data uses database naming
const seedData = [
  { days_before_show: 30 }  // snake_case
];

await prisma.checklist_items.create({ 
  data: seedData[0]  // Works!
});
```

**OR use transform:**
```typescript
// Seed data uses frontend naming
const seedData = [
  { daysBeforeShow: 30 }  // camelCase
];

await prisma.checklist_items.create({ 
  data: toSnakeCase(seedData[0])  // Converts to snake_case
});
```

---

### Multi-User Conflict Handling - CRITICAL PATTERNS

**Learned from "completed_at causing Prisma validation errors" bug (Feb 2026):**

#### The Conflict Problem

```
Scenario: Two users editing the same checklist item simultaneously

Timeline:
1. Browser A loads item { id: '123', title: 'Task', completed: false, version: 1 }
2. Browser B loads same item { id: '123', title: 'Task', completed: false, version: 1 }
3. User A toggles completion → sends { id: '123', completed: true, completedAt: 1738627200000 }
4. User B toggles completion → sends { id: '123', completed: true, completedAt: 1738627201000 }
5. Server processes both: Which timestamp wins?
```

**Without conflict handling:** Last write wins silently, data loss occurs.

#### Version-Based Optimistic Concurrency Control

**Database schema includes version field:**

```prisma
model checklist_items {
  id String @id @default(uuid())
  version BigInt @default(0)
  updated_at BigInt @default(0)
  // ... other fields
}
```

**CORRECT update pattern:**

```typescript
// ✅ Client sends current version
const updateItem = async (id: string, changes: Partial<ChecklistItem>) => {
  const currentItem = store.getChecklistItem(id);
  
  await apiClient.updateChecklistItem(id, {
    ...changes,
    version: currentItem.version  // Include current version
  });
}

// ✅ Server validates version before updating
router.put('/checklist-items/:id', async (req, res) => {
  const { version, ...updates } = toSnakeCase(req.body);
  
  // Read current version from database
  const current = await prisma.checklist_items.findUnique({
    where: { id: req.params.id }
  });
  
  if (!current) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  // Check for version conflict
  if (version && current.version !== BigInt(version)) {
    return res.status(409).json({ 
      error: 'Version conflict - item was modified by another user',
      currentVersion: Number(current.version),
      attemptedVersion: version
    });
  }
  
  // Update with incremented version
  const updated = await prisma.checklist_items.update({
    where: { id: req.params.id },
    data: {
      ...updates,
      version: { increment: 1 },  // Atomic increment
      updated_at: BigInt(Date.now())
    }
  });
  
  // Broadcast to all other clients
  broadcastEntityUpdate('production', updated.production_id, 'checklist-item', toCamelCase(updated));
  
  res.json(toCamelCase(updated));
});
```

**Frontend conflict handling:**

```typescript
// ✅ Handle 409 version conflict
const updateItem = async (id: string, changes: Partial<ChecklistItem>) => {
  try {
    const currentItem = store.getChecklistItem(id);
    const updated = await apiClient.updateChecklistItem(id, {
      ...changes,
      version: currentItem.version
    });
    
    store.updateChecklistItem(updated);
    
  } catch (error) {
    if (error.status === 409) {
      // Version conflict - reload fresh data
      const fresh = await apiClient.getChecklistItem(id);
      store.updateChecklistItem(fresh);
      
      // Show user the conflict
      toast.error('This item was modified by another user. Your changes were not saved. Please try again.');
    } else {
      throw error;
    }
  }
}
```

#### Server-Side Timestamp Management

**The Problem We Had:**

```typescript
// ❌ WRONG: Client sets timestamp
const toggleCompletion = async (id: string) => {
  const completedAt = Date.now(); // Client's clock
  
  await apiClient.update(id, { 
    completed: true, 
    completedAt 
  });
}

// Issues:
// 1. Client clocks can be wrong (timezone, clock skew)
// 2. Client can manipulate timestamps
// 3. Race conditions if two clients send different timestamps
// 4. Prisma validation errors when types don't match
```

**The Fix:**

```typescript
// ✅ CORRECT: Client sends intent, server sets timestamp
const toggleCompletion = async (id: string, completed: boolean) => {
  // Client only sends the boolean state
  await apiClient.update(id, { completed });
}

// Server determines timestamp
router.put('/checklist-items/:id', async (req, res) => {
  const updates = toSnakeCase(req.body);
  
  // If toggling completion, server sets timestamp
  if ('completed' in updates) {
    if (updates.completed) {
      updates.completed_at = BigInt(Date.now()); // Server's clock
    } else {
      updates.completed_at = null; // Clear when uncompleting
    }
  }
  
  // Server ALWAYS sets updated_at
  updates.updated_at = BigInt(Date.now());
  
  const updated = await prisma.checklist_items.update({
    where: { id: req.params.id },
    data: updates
  });
  
  res.json(toCamelCase(updated));
});
```

**Benefits:**
- ✅ Single source of truth for timestamps
- ✅ No clock skew issues
- ✅ Can't be manipulated by client
- ✅ Consistent across all users
- ✅ No type conversion errors

#### WebSocket Sync Coordination

**Real-time updates pattern:**

```typescript
// Server: After any database update, broadcast to room
const updated = await prisma.checklist_items.update({ ... });

broadcastEntityUpdate(
  'production',
  updated.production_id,
  'checklist-item',
  toCamelCase(updated)  // Send transformed data
);

// Client: Listen for updates from OTHER users
socket.on('checklist-item:updated', (data) => {
  const currentItem = store.getChecklistItem(data.id);
  
  // Only update if version is newer (prevents loops)
  if (!currentItem || data.version > currentItem.version) {
    store.updateChecklistItem(data);
    
    // Update IndexedDB cache
    await projectDB.updateChecklistItem(data);
  }
});
```

**CRITICAL: Prevent update loops**

```typescript
// ❌ WRONG: Update triggers another API call
socket.on('checklist-item:updated', async (data) => {
  // This will trigger WebSocket broadcast again!
  await apiClient.updateChecklistItem(data.id, data);
});

// ✅ CORRECT: Update local state only
socket.on('checklist-item:updated', (data) => {
  // Direct state update, no API call
  store.updateChecklistItem(data);
  projectDB.updateChecklistItem(data);
});
```

#### Field-Level vs Entity-Level Locking

**Our architecture uses entity-level optimistic locking:**

```typescript
// Entity-level: Version applies to entire item
{
  id: '123',
  title: 'Task',
  completed: false,
  category: 'PRE_PRODUCTION',
  version: 5  // Entire item version
}

// Any field change increments version
// Pros: Simple, no lost updates
// Cons: Can't edit different fields simultaneously
```

**Alternative: Field-level locking (more complex, not implemented):**

```typescript
// Field-level: Track version per field
{
  id: '123',
  title: { value: 'Task', version: 3 },
  completed: { value: false, version: 5 },
  category: { value: 'PRE_PRODUCTION', version: 2 }
}

// Pros: Can edit different fields simultaneously
// Cons: Complex to implement, larger payload
```

**When to upgrade to field-level:**
- Users frequently edit different fields of same item simultaneously
- Conflicts cause frequent user frustration
- Performance requirements allow larger payloads

**Current entity-level is sufficient because:**
- Most edits are single-field (toggle completion, change title)
- WebSocket sync is fast enough that conflicts are rare
- Conflict UI can guide users to retry

#### Race Condition Prevention Patterns

**1. Atomic database operations:**

```typescript
// ✅ CORRECT: Use Prisma's atomic increment
await prisma.checklist_items.update({
  where: { id },
  data: {
    version: { increment: 1 },  // Atomic - no race condition
    updated_at: BigInt(Date.now())
  }
});

// ❌ WRONG: Read-modify-write has race condition
const current = await prisma.checklist_items.findUnique({ where: { id } });
await prisma.checklist_items.update({
  where: { id },
  data: {
    version: current.version + 1  // Race condition if another request runs between findUnique and update
  }
});
```

**2. Database transactions for multi-entity updates:**

```typescript
// ✅ CORRECT: Use transaction for related updates
await prisma.$transaction(async (tx) => {
  // Update production
  await tx.productions.update({
    where: { id: productionId },
    data: { updated_at: BigInt(Date.now()) }
  });
  
  // Update all related checklist items
  await tx.checklist_items.updateMany({
    where: { production_id: productionId },
    data: { production_id: newProductionId }
  });
});

// Both succeed or both fail - no partial updates
```

**3. Idempotent operations:**

```typescript
// ✅ CORRECT: Toggle completion is idempotent
router.put('/checklist-items/:id/toggle', async (req, res) => {
  const current = await prisma.checklist_items.findUnique({ 
    where: { id: req.params.id } 
  });
  
  // Set to opposite of current state
  const updated = await prisma.checklist_items.update({
    where: { id: req.params.id },
    data: {
      completed: !current.completed,
      completed_at: !current.completed ? BigInt(Date.now()) : null
    }
  });
  
  res.json(toCamelCase(updated));
});

// Calling twice = toggle twice = back to original state
// No duplicate completion states
```

#### Conflict Resolution UI Patterns

**Show user when conflicts occur:**

```typescript
// In frontend component
const handleSave = async () => {
  try {
    await updateChecklistItem(item.id, changes);
    toast.success('Saved');
    
  } catch (error) {
    if (error.status === 409) {
      // Version conflict
      const action = await confirm(
        'This item was modified by another user while you were editing. ' +
        'Would you like to reload the latest version? Your changes will be lost.'
      );
      
      if (action === 'reload') {
        const fresh = await apiClient.getChecklistItem(item.id);
        setItem(fresh);
      } else {
        // Let user keep editing (they can try saving again)
      }
      
    } else if (error.status === 404) {
      // Item was deleted by another user
      toast.error('This item was deleted by another user.');
      router.push('/productions');
      
    } else {
      toast.error('Save failed: ' + error.message);
    }
  }
}
```

#### Testing Multi-User Scenarios

**Test checklist for conflict handling:**

```bash
# Setup: Open same production in Browser A and Browser B

# Test 1: Simultaneous completion toggle
# - Browser A: Click completion checkbox
# - Browser B: Immediately click completion checkbox
# - Expected: One succeeds, one gets 409 conflict
# - Expected: Both browsers show same final state after sync

# Test 2: Edit while other user deletes
# - Browser A: Start editing item title
# - Browser B: Delete the item
# - Browser A: Try to save
# - Expected: 404 error with appropriate message

# Test 3: Version conflict recovery
# - Browser A: Toggle completion (offline mode)
# - Browser B: Toggle completion (while A offline)
# - Browser A: Come back online, try to sync
# - Expected: Conflict detected, user prompted to reload

# Test 4: WebSocket sync speed
# - Browser A: Toggle completion
# - Browser B: Should see change within 100ms
# - Browser C: Should also see change within 100ms

# Test 5: Cache consistency
# - Browser A: Toggle completion
# - Browser B: Reload page
# - Expected: Browser B loads fresh data from API, sees completion
```

#### Future: Collaborative Editing Features

**If implementing real-time collaborative editing:**

1. **Operational Transform (OT)** for text fields:
   - Track character-level changes
   - Merge simultaneous edits
   - Show cursors of other users

2. **Conflict-free Replicated Data Types (CRDTs)**:
   - Mathematically guaranteed convergence
   - No version conflicts possible
   - More complex to implement

3. **Presence indicators**:
   - Show which users are viewing/editing
   - Lock fields while being edited
   - "User X is typing..." indicators

**Current version-based optimistic locking is sufficient for:**
- Infrequent simultaneous edits
- Field-level changes (not text collaboration)
- Clear conflict resolution UI
- Small team sizes (< 10 concurrent users per production)

---

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
<!-- tags: database, field-names, snake-case, prisma, schema, naming -->

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
<!-- tags: new-entity, entity-generation, checklist, scaffold, generate -->

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
<!-- tags: testing, manual-testing, browser-sync, multi-browser -->

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
<!-- tags: railway, deployment, production, git-push, main-branch -->

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
<!-- tags: project-state, implemented, in-progress, roadmap -->

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
<!-- tags: safety, critical, migration, deploy, prisma-studio -->

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
<!-- tags: docs-structure, documentation, symlinks, doc-files -->

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

## 🏗️ Schema & Route Consistency - CRITICAL PATTERNS
<!-- tags: schema, routes, api-routes, audit, consistency, entities, standard-fields, updated-at, uuid -->

**Reference Document:** `api/SCHEMA_AUDIT.md` - Comprehensive schema analysis

### Standard Entity Field Pattern

**Every entity table MUST have these fields:**
```typescript
{
  id: String @id                          // PRIMARY KEY
  production_id: String                   // FOREIGN KEY to productions
  created_at: DateTime @default(now())    // Auto-set by Prisma
  updated_at: DateTime                    // MANUAL - must set in routes!
  synced_at: DateTime?                    // Optional sync timestamp
  last_modified_by: String?               // User tracking
  version: Int @default(1)                // Optimistic locking
  is_deleted: Boolean @default(false)     // Soft delete flag
}
```

### ⚠️ CRITICAL: `updated_at` Must Be Manually Set

**NO TABLES USE `@updatedAt` DECORATOR**

This means you MUST manually set `updated_at` in every create/update operation:

```typescript
// ✅ CORRECT - Create
const entity = await prisma.entities.create({
  data: {
    ...data,
    updated_at: new Date(),
    version: 1
  }
});

// ✅ CORRECT - Update
const entity = await prisma.entities.update({
  where: { id },
  data: {
    ...data,
    updated_at: new Date(),
    version: { increment: 1 }
  }
});

// ❌ WRONG - Missing updated_at
const entity = await prisma.entities.create({
  data: { ...data }  // Prisma will error!
});
```

### Child Table Exceptions

**Tables WITHOUT `updated_at` field:**
- `source_outputs` - Only has `created_at`
- Check schema before assuming field exists

### Prisma Relation Naming

**Always use the exact relation name from schema:**

```typescript
// ❌ WRONG - Using intuitive name
const source = await prisma.sources.create({
  data: {
    outputs: { create: [...] }  // Error: Unknown argument
  }
});

// ✅ CORRECT - Using schema relation name
const source = await prisma.sources.create({
  data: {
    source_outputs: { create: [...] }  // Matches schema
  }
});
```

### Route Implementation Checklist

When implementing entity routes, verify:

1. **Create Route:**
   - [ ] Destructures `{ productionId, userId, userName, ...entityData }`
   - [ ] Uses `toSnakeCase()` for entity data
   - [ ] Sets `production_id: productionId`
   - [ ] Sets `updated_at: new Date()`
   - [ ] Sets `version: 1`
   - [ ] Returns `toCamelCase(result)`

2. **Update Route:**
   - [ ] Checks version conflict before update
   - [ ] Destructures metadata from updates
   - [ ] Uses `toSnakeCase()` for entity data
   - [ ] Sets `updated_at: new Date()`
   - [ ] Increments version: `version: { increment: 1 }`
   - [ ] Sets `last_modified_by`
   - [ ] Returns `toCamelCase(result)`

3. **Delete Route (Soft):**
   - [ ] Sets `is_deleted: true`
   - [ ] Sets `updated_at: new Date()`
   - [ ] Increments version
   - [ ] Broadcasts deletion event

### Helper Function Pattern

**⚠️ WARNING:** `prepareVersionedUpdate()` helper does NOT set `updated_at`!

```typescript
// From sync-helpers.ts
export function prepareVersionedUpdate(lastModifiedBy?: string): any {
  return {
    version: { increment: 1 },
    last_modified_by: lastModifiedBy || null,
    synced_at: new Date()  // ⚠️ NOT updated_at!
  };
}

// ✅ CORRECT USAGE - Add updated_at separately
const entity = await prisma.entities.update({
  where: { id },
  data: {
    ...updateData,
    updated_at: new Date(),  // Must add explicitly!
    ...prepareVersionedUpdate(userId)
  }
});
```

### Foreign Key Constraints

**When you see:** `Foreign key constraint violated: sources_production_id_fkey`

**Root Cause:** Production doesn't exist in database (IndexedDB/API sync issue)

**Fix:**
1. Check if production was saved to API: `GET /api/productions/:id`
2. Verify production creation calls API endpoint
3. Check useProjectStore.createProduction() saves to both IndexedDB AND API
4. Never allow entity creation if production doesn't exist in DB

### Self-Audit Command

```bash
# Find routes missing updated_at in create operations
cd api/src/routes
grep -A10 "prisma\.\w\+\.create" *.ts | grep -B10 "data:" | grep -v "updated_at"

# Find routes missing updated_at in update operations
grep -A10 "prisma\.\w\+\.update" *.ts | grep -B10 "data:" | grep -v "updated_at"

# Find uses of prepareVersionedUpdate without updated_at
grep -B5 "prepareVersionedUpdate" *.ts | grep -v "updated_at"
```

---

## 📋 Meta-Rule: Documentation Updates
<!-- tags: meta, documentation, project-rules-update, audit, knowledge-capture -->

**RULE:** When you conduct an audit and discover novel patterns or issues, immediately document them in PROJECT_RULES.md.

### Audit → Documentation Workflow

1. **Conduct Audit** - Systematically analyze codebase area (schemas, routes, hooks, etc.)
2. **Identify Patterns** - Note what works, what's inconsistent, what's missing
3. **Document Findings** - Create audit document (e.g., SCHEMA_AUDIT.md)
4. **Extract Rules** - Pull universal patterns into PROJECT_RULES.md
5. **Update Checklist** - Add new diagnostic checks to Quick Diagnostic Checklist
6. **Verify Implementation** - Fix discovered issues across codebase

### What Qualifies as "Novel"?

Document a pattern when:
- It caused a bug that could recur
- It's not obvious from code inspection
- It contradicts common assumptions (e.g., "Prisma auto-updates timestamps")
- It requires checking multiple files to understand
- It's project-specific (not a general programming pattern)

### Documentation Structure

New patterns should include:
- **Pattern Name** - Clear, descriptive title
- **Problem It Solves** - Why this rule exists
- **Correct Implementation** - Code examples
- **Common Mistakes** - Anti-patterns to avoid
- **Diagnostic Check** - How to verify compliance

### Examples of Good Audit Documentation

✅ **Pillar #7 - Schema Consistency** - Documents that NO tables use @updatedAt, must manually set  
✅ **Pillar #6 - Spread Operators** - Documents UUID string iteration bug  
✅ **Child Table Exceptions** - Lists tables without standard fields  
✅ **Helper Function Warning** - Notes prepareVersionedUpdate() doesn't set updated_at

---

## � Database Migration Safety - Critical Patterns
<!-- tags: migration, safety, schema-engine, prisma, zombie-process, pre-migration-check, critical, exit-137 -->

**PILLAR #9: ALWAYS USE PRE-MIGRATION SAFETY CHECKS**

### The Problem

VS Code crashes (exit code 137 - SIGKILL) caused by:
- Zombie Prisma processes consuming CPU/memory
- Multiple concurrent migrations
- Low available memory (<500MB)
- Long-running schema-engine processes

### The Solution

**MANDATORY before every migration:**

```bash
cd video-production-manager/api
npm run db:migrate:check  # NEVER skip this!
```

### What the Safety Check Does

1. ✅ Detects and kills zombie `prisma` and `schema-engine` processes
2. ✅ Validates Prisma schema syntax
3. ✅ Tests database connection
4. ✅ Checks available system memory (requires 500MB+)
5. ✅ Warns about concurrent heavy processes
6. ✅ Verifies migrations directory exists

### When Migration Hangs

If migration doesn't complete in 30 seconds:

```bash
# Kill stuck migration
pkill -9 -f 'prisma migrate'
pkill -9 -f 'schema-engine'

# Verify cleanup
ps aux | grep -E '(prisma|schema-engine)' | grep -v grep
# Expected: No results

# Check status
npx prisma migrate status

# Retry with safety check
npm run db:migrate:check
npx prisma migrate dev --name your_migration_name
```

### Never Do This

❌ Run Prisma Studio from terminal during migrations  
❌ Run multiple migrations concurrently  
❌ Skip the safety check ("it's just a small change")  
❌ Ignore low memory warnings  
❌ Edit schema while migration is running

### Self-Audit Command

```bash
# Before ANY migration
npm run db:migrate:check

# After migration - verify cleanup
ps aux | grep -E '(prisma|schema-engine)' | grep -v grep
# Must return: (nothing - grep exit code 1)
```

### References

- Full details: `../../CRASH_PREVENTION_SUMMARY.md`
- Script source: `../api/scripts/pre-migration-check.sh`
- Quick reference: `../../MIGRATION_SAFETY_QUICK_REF.md`

---

## 🔄 Schema Drift Resolution - Critical Patterns
<!-- tags: schema-drift, recovery, migration, db-reset, prisma, rollback, critical -->

**PILLAR #10: SCHEMA DRIFT = DATABASE RESET IN DEV**

### The Problem

**Schema Drift** occurs when:
1. Schema.prisma is edited manually without creating a migration
2. Git reverts schema changes but database already has those changes
3. UUID experiments or other structural changes are rolled back in code but not in database
4. Migration files are modified after being applied

**Symptoms:**
- Prisma says "Need to reset schema"
- "Drift detected: database not in sync with migrations"
- Migration lists changes that seem backwards (adding columns you removed)
- Routes fail with "column does not exist" but it's in the schema

### The Solution - Investigation First

**Step 1: Check Git History**
```bash
git log --oneline --all | grep -i "uuid\|rollback\|revert"
git show <suspect-commit> --stat
```

**Step 2: Compare Schema vs Database**
``` bash
npx prisma db pull --print | grep -A20 "model <table_name>"
# Compare with your schema.prisma
```

**Step 3: Verify Drift**
```bash
npx prisma migrate status
# Look for "drift detected" message
```

### The Solution - Database Reset in Dev

**Safe in development (local database only):**

```bash
cd video-production-manager/api

# OPTION 1: Full reset with seed data (recommended)
npm run db:reset
# Result: Clean schema, migrations reapplied, settings seeded

# OPTION 2: Just schema (no seed data)
npx prisma migrate reset --force
```

**Creates:**
- Clean database matching current schema.prisma
- Fresh migration history
- No drift
- Ready for new migrations

**Then create your migration:**
```bash
npm run db:migrate:check
npx prisma migrate dev --name descriptive_migration_name
```

### When NOT to Use Database Reset

❌ **Production/Railway:** NEVER reset production database  
❌ **Shared dev database:** Coordinate with team  
❌ **If you have critical test data:** Export first with `pg_dump`

### The UUID Rollback Case Study

**Scenario:** Code changed to use uuid primary keys, then reverted, but database still had uuid as PK.

**Error:** "Need to reset schema - drift detected"

**Investigation:**
```bash
git show 2e0e3b7  # Found the revert commit
npx prisma db pull --print | grep "model sources"  # Saw uuid was still PK
```

**Resolution:**
```bash
npm run db:reset  # Clean slate
# Then committed new migration with actual changes
```

### Self-Audit Command

```bash
# Check for schema/database drift
npx prisma migrate status
# Expected: "Database schema is up to date!"
# If drift detected: Investigate git history then reset

# After reset - verify
npx prisma migrate status
# Should show: "Database schema is up to date!"
```

### References

- Detailed case study: `../../UUID_MIGRATION_RECOVERY.md`
- Reset guide: `../DATABASE_RESET_GUIDE.md`

---

## �🔄 When to Update This Document
<!-- tags: meta, documentation, when-to-update -->

- New project-specific conventions are established
- Architecture decisions are made
- Deployment process changes
- New entities or features are added
- Safety rules are discovered through crashes
- UI/UX conventions evolve

**Universal patterns should go in `AI_AGENT_PROTOCOL.md` instead.**

---

**Remember:** This document is **project-specific**. Update it when VideoDept conventions change. Universal patterns belong in `~/Dropbox (Personal)/Development/_Utilities/AI_AGENT_PROTOCOL.md`.

---

## 🃏 Entity Card UI Design Rules
<!-- tags: card-ui, drag-reorder, reveal-panel, expand-state, uuid-keyed-set, columns, chevron, action-buttons, sends, computers, ccus, media-servers, cameras, select-none, single-click, double-click -->

**Last Updated:** March 11, 2026 — codified from Computers, CCUs, MediaServers (v0.1.x)

These conventions apply to every entity list card (CCUs, Cameras, Media Servers, Computers, and all future Sends subcategories).

---

### 1. Collapsed Card Layout

**Single grid row only.** No stacked sections or sub-panels in the collapsed state.

Use percentage-based fr columns via inline style (NOT Tailwind grid-cols, which can't express fr ratios cleanly):

```tsx
// Standard 4-column layout (CCUs, MediaServers)
<div className="grid gap-4 items-center" style={{ gridTemplateColumns: '30fr 30fr 30fr 10fr' }}>

// 5-column layout (Computers — extra col for ID vs Name split)
<div className="grid items-center gap-3" style={{ gridTemplateColumns: '14fr 18fr 28fr 24fr 16fr' }}>
```

**Column assignment:**
| Col | Width | Content |
|-----|-------|---------|
| 1 | ~30% | Grip + Chevron + Primary ID + key association badge |
| 2 | ~30% | Note (truncated) |
| 3 | ~30% | Tags/Badges (mfr, model, type, secondary device) or counts |
| 4 | ~10% | Action buttons (Edit, Copy, Delete) |

**Required Card-level classes:**
```tsx
<Card
  className="p-4 transition-colors select-none cursor-pointer
    ${dragOver ? 'border-av-accent bg-av-accent/5' : 'hover:border-av-accent/30'}
    ${beingDragged ? 'opacity-40' : ''}
  "
  draggable
  onDragStart={...}
  onDragOver={...}
  onDragEnd={...}
  onDragLeave={...}
  onClick={() => { if (!isDragInProgress.current && uuid) toggleReveal(uuid); }}
  onDoubleClick={(e) => { e.stopPropagation(); handleEdit(entity); }}
>
```

- `select-none cursor-pointer` — required on every card; prevents text selection during drag
- `transition-colors` — smooth hover/drag state transitions
- Drag target highlight: `border-av-accent bg-av-accent/5`
- Drag source: `opacity-40` (not `opacity-50 scale-95` — keep it consistent at 40%)

---

### 2. Column 1 — Identity Column

Always: `flex items-center gap-2 min-w-0`

**Left-to-right order:** `GripVertical` → `ChevronUp/Down` → Entity ID/Name → Association hint

```tsx
<div className="flex items-center gap-2 min-w-0">
  <GripVertical
    className="w-4 h-4 text-av-text-muted cursor-grab flex-shrink-0"
    onClick={(e) => e.stopPropagation()}  // ← REQUIRED: prevents card click
  />
  {uuid && (isExpanded
    ? <ChevronUp   className="w-4 h-4 text-av-accent flex-shrink-0" />
    : <ChevronDown className="w-4 h-4 text-av-text-muted flex-shrink-0" />
  )}
  <span className="text-sm font-medium text-av-text truncate">{entity.id}</span>
  {/* Optional: association hint */}
  <span className="text-sm text-av-text-muted truncate flex-shrink-0">← {linkedCamera.id}</span>
</div>
```

- Chevron only renders when `uuid` is available (not yet-legacy entities without UUIDs)
- Chevron: `text-av-accent` when expanded, `text-av-text-muted` when collapsed
- `flex-shrink-0` on Grip, Chevron, and association hint — **never** on the ID/name (it truncates)
- ID/name always gets `truncate`

---

### 3. Column 2 — Note Column

```tsx
<div className="min-w-0">
  {entity.note ? (
    <p className="text-sm text-av-text-muted truncate" title={entity.note}>
      {entity.note}
    </p>
  ) : (
    <span className="text-sm text-av-text-muted/40 italic">—</span>
  )}
</div>
```

**Truncation rules:**
- **CCUs:** `truncate` + `title={note}` tooltip — notes tend to be short labels
- **MediaServers:** `truncate block` — same as CCUs
- **Computers:** `line-clamp-2` (2-line clamp, no tooltip) — notes can be longer prose
- **Empty state:** `"—"` in `text-av-text-muted/40 italic` (NOT "No notes" — just the em dash)
- `min-w-0` on the wrapper `div` is **required** to allow truncation inside flex/grid

---

### 4. Column 3 — Tags / Metadata Column

Display entity-type-specific metadata as `<Badge>` components or plain text counts.

```tsx
// Badges (CCUs, Cameras)
<div className="flex items-center gap-2 flex-wrap">
  {entity.manufacturer && <Badge>{entity.manufacturer}</Badge>}
  {entity.model && <Badge>{entity.model}</Badge>}
</div>

// Warning badge (secondary device, Computers)
<div className="flex flex-wrap gap-1.5">
  {source.type && <Badge>{source.type}</Badge>}
  {source.secondaryDevice && <Badge variant="warning">{source.secondaryDevice}</Badge>}
</div>

// Plain text count (MediaServers layer count)
<span className="text-sm text-av-text-muted">{count} layer{count !== 1 ? 's' : ''}</span>
// Empty: <span className="text-sm text-av-text-muted/40 italic">—</span>
```

---

### 5. Column 4 — Action Buttons

Always wrapped in `onClick={(e) => e.stopPropagation()}`:

```tsx
<div className="flex items-center justify-end gap-1 flex-shrink-0"
     onClick={(e) => e.stopPropagation()}>
  <button onClick={() => handleEdit(entity)}
    className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
    title="Edit">
    <Edit2 className="w-4 h-4" />
  </button>
  <button onClick={() => handleDuplicate(entity)}
    className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
    title="Duplicate">
    <Copy className="w-4 h-4" />
  </button>
  <button onClick={() => handleDelete(entity.uuid)}
    className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
    title="Delete">
    <Trash2 className="w-4 h-4" />
  </button>
</div>
```

- **Color convention:** Edit → `av-accent` (blue), Duplicate → `av-info` (teal/cyan), Delete → `av-danger` (red)
- `p-2 rounded-md hover:bg-av-surface-light` on ALL action buttons — consistent hit area

---

### 6. Expand State — UUID-Keyed Set

**⛔ NEVER key expand state by list index.** When items are added/deleted the index shifts, incorrectly collapsing/expanding neighbors.

```tsx
// ✅ CORRECT — UUID-keyed Set, survives list re-renders
const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

const toggleReveal = useCallback(async (uuid: string) => {
  setExpandedItems(prev => {
    const next = new Set(prev);
    if (next.has(uuid)) { next.delete(uuid); } else { next.add(uuid); }
    return next;
  });
  fetchPortsForUuid(uuid); // idempotent — skip if already fetched
}, [fetchPortsForUuid]);

// Reading in render:
const isExpanded = uuid ? expandedItems.has(uuid) : false;
```

- Functional setState (`prev => ...`) prevents stale closure issues
- React `key` prop on each Card must also be `entity.uuid` (NOT index, NOT entity.id)

---

### 7. Drag-to-Reorder Pattern

**Use HTML5 drag events (not a DnD library).** Consistent pattern across all list pages:

```tsx
const [draggedIndex, setDraggedIndex]   = useState<number | null>(null);
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
const isDragInProgress = useRef(false);

const handleDragStart  = (index: number) => { setDraggedIndex(index); isDragInProgress.current = true; };
const handleDragOver   = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
const handleDragLeave  = () => setDragOverIndex(null);
const handleDragEnd    = () => {
  const from = draggedIndex, to = dragOverIndex;
  setDraggedIndex(null); setDragOverIndex(null);
  setTimeout(() => { isDragInProgress.current = false; }, 0); // allow onClick to fire after dragEnd
  if (from === null || to === null || from === to) return;
  // splice reordering, then persist sort_order
};
```

- `isDragInProgress.current` is a **ref** (not state) so it doesn't trigger re-renders
- `setTimeout(..., 0)` on `isDragInProgress.current = false` prevents a brief drag-end triggering click
- Persist `sort_order` field to DB after reorder (IndexedDB + API)
- The `GripVertical` icon's `onClick={e => e.stopPropagation()}` prevents card click from firing when user grabs the handle

---

### 8. Reveal Panel Structure

```tsx
{isExpanded && (
  <div className="mt-4 border-t border-av-border pt-4 space-y-4">
    {/* content */}
  </div>
)}
```

- Always `mt-4 border-t border-av-border pt-4`
- `space-y-4` when multiple sub-sections (e.g. direct + expansion I/O)
- Port table wrapped in `overflow-x-auto` (see Overflow Rules below)
- Loading state: `<p className="text-xs text-av-text-muted italic">Loading ports…</p>`
- Empty state: `<p className="text-xs text-av-text-muted italic">No ports configured. Open Edit to assign ports.</p>`

---

## 🗂️ apiClient Service — Critical Gotchas
<!-- tags: apiClient, api-service, fetch, gotcha, dot-data, typescript -->

### `apiClient.get<T>()` returns T directly — NEVER use `.data`

`src/services/apiClient.ts` wraps `fetch` and already unwraps the response body before return. The generic type parameter IS the return type.

```typescript
// ✅ CORRECT
const specs = await apiClient.get<EquipmentSpec[]>('/equipment');

// ❌ WRONG — `.data` does not exist; TypeScript may not catch this at runtime
const res = await apiClient.get<{ data: EquipmentSpec[] }>('/equipment');
const specs = res.data; // undefined at runtime
```

This applies to all methods: `get`, `post`, `put`, `delete`, `patch`.

---

## 🗄️ Equipment Soft-Delete & Archive Pattern
<!-- tags: equipment, soft-delete, archive, is-deleted, unarchive -->

Equipment records are **never hard-deleted**. Historical association with productions must be preserved.

### Schema
- `equipment_specs.is_deleted: Boolean @default(false)`
- `DELETE /equipment/:uuid` → sets `is_deleted: true` (soft-delete)
- `GET /equipment` → filters `is_deleted: false` (active only)
- `GET /equipment?archived=true` → returns `is_deleted: true` records

### apiClient methods
```typescript
apiClient.archiveEquipment(id)       // soft-delete via DELETE /:uuid
apiClient.unarchiveEquipment(id)     // PUT /:uuid { isDeleted: false }
apiClient.getArchivedEquipment()     // GET /equipment?archived=true
```

### UI pattern
- Equipment cards: Archive button (amber `Archive` icon) in card header actions
- Equipment.tsx: "Show Archived" toggle in page header (amber when active); archived items section at bottom with `ArchiveRestore` buttons
- EquipmentFormModal: `onArchive?` prop; Archive button in footer (amber, editing-only)
- `PUT /equipment/:uuid` uses `toSnakeCase(req.body)` — `{ isDeleted: false }` maps correctly to `is_deleted: false`

---

## 🔌 Port Data — Model, Edit Rules, and Display Standards
<!-- tags: device-ports, io-ports, ioportspanel, format-select, direct-io, expansion-io, slot-split, reveal-table, port-label, route-field, sends, computers, media-servers, ccus -->

**Last Updated:** March 11, 2026 — codified from IOPortsPanel, Computers, CCUs, MediaServers (v0.1.x)

---

### Port Data Model (DevicePortDraft)

```typescript
export interface DevicePortDraft {
  uuid?: string;           // DB primary key — set when row exists; absent on new rows
  specPortUuid?: string;   // FK to equipment_io_ports.uuid (from spec)
  portLabel: string;       // editable per-show label (e.g. "OUT 1", "HDMI MAIN")
  ioType: string;          // connector type (SDI, HDMI, DP, SMPTE-Fiber, REF…) — read-only from spec
  direction: 'INPUT' | 'OUTPUT';
  formatUuid?: string | null;  // FK to formats.uuid (show-assigned format)
  note?: string | null;    // "Route" field: source signal path (input) or destination (output)
  cardSlot?: number;       // expansion card slot; undefined = direct I/O
}
```

**Key field rules:**
- `ioType` is **always read-only** in edit UI — it comes from the equipment spec, never entered manually
- `portLabel` is show-specific — same physical port gets different labels per production
- `formatUuid` is show-specific — format assigned for this show
- `note` = the "Route" field. For **inputs**: "where signal comes from". For **outputs**: "where signal goes to"
- `cardSlot` = undefined means direct I/O (onboard); number = expansion card slot index (1, 2, 3…)

---

### Slot-Split Rule (Direct I/O vs Expansion I/O)

When an equipment spec has cards, ports are stored flat in order but split positionally:

```
Index 0 … (nDirectIn + nDirectOut - 1)  → Direct I/O
Index nDirect … nDirect + card1Ports - 1 → Slot 1
Index nDirect + card1Ports … +card2Ports → Slot 2
… etc.
```

```tsx
const directCount = (spec.inputs?.length ?? 0) + (spec.outputs?.length ?? 0);
const directPorts = spec.cards.length > 0 ? allPorts.slice(0, directCount) : allPorts;
// Per-slot slicing follows spec card order (sort by slotNumber first)
```

**Never mix direct and expansion ports.** When no cards, all ports are "direct."

---

### IOPortsPanel — Edit Mode (Modal)

Used inside modals. Always split into separate Direct I/O and Expansion I/O sections.

**Grid layout:** `grid-cols-[80px_1fr_1fr_1fr]` = Type | Label | Format | Route

```tsx
<IOPortsPanel
  ports={directPorts}
  onChange={setDirectPorts}
  formats={formats}
  isLoading={portsLoading}
  emptyText="Select a Computer Type above to auto-populate ports from the equipment spec."
  onCreateCustomFormat={() => setIsCreateFormatOpen(true)}
/>
```

- `ioType` column: `font-mono text-av-text-muted` span — read-only, no input
- `portLabel`: `input-field text-xs py-1 min-w-0`
- `formatUuid`: `FormatCascadeSelect` — grouped by resolution, flyout submenu per rate, viewport-aware flip
- `note` (Route): `input-field text-xs py-1 min-w-0`, placeholder differs by direction:
  - Input: `"Source signal or device"`
  - Output: `"Destination device or input"`
- Inputs section shown first, then Outputs. Separated by section headers.
- Section headers: `text-xs font-semibold text-av-text-muted uppercase tracking-wide mb-1.5`

**Column headers in IOPortsPanel:**
```
Type | Label | Format In/Out | Route
```
- "Format In" on the Inputs section, "Format Out" on the Outputs section

---

### Reveal Panel Port Table — Display Mode (Read-Only)

**5-column `table-fixed`:**

```
Dir (10%) | Type (15%) | Label (25%) | Format (25%) | Route (25%)
```

```tsx
<table className="w-full text-xs table-fixed">
  <thead>
    <tr className="text-av-text-muted uppercase tracking-wide border-b border-av-border">
      <th className="text-left pb-1.5 pr-3 font-semibold w-[10%]">Dir</th>
      <th className="text-left pb-1.5 pr-3 font-semibold w-[15%]">Type</th>
      <th className="text-left pb-1.5 pr-3 font-semibold w-[25%]">Label</th>
      <th className="text-left pb-1.5 pr-3 font-semibold w-[25%]">Format</th>
      <th className="text-left pb-1.5 font-semibold w-[25%]">Route</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-av-border/40">
    {ports.map((port, i) => {
      const isOut = port.direction === 'OUTPUT';
      const fmtName = port.formatUuid ? (formats.find(f => f.uuid === port.formatUuid)?.id ?? '—') : '—';
      return (
        <tr key={i} className="hover:bg-av-surface-hover/40">
          <td className="py-1.5 pr-3">
            {isOut
              ? <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-accent/15 text-av-accent">OUT</span>
              : <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-warning/15 text-av-warning">IN</span>
            }
          </td>
          <td className="py-1.5 pr-3 font-mono text-av-text-muted truncate">{port.ioType}</td>
          <td className="py-1.5 pr-3 text-av-text truncate">{port.portLabel}</td>
          <td className="py-1.5 pr-3 text-av-info truncate">{isOut ? fmtName : <span className="text-av-text-muted">—</span>}</td>
          <td className="py-1.5 text-av-text-muted truncate">{port.note || '—'}</td>
        </tr>
      );
    })}
  </tbody>
</table>
```

**Style rules:**
- `Dir` badge: `inline-block px-1.5 py-0.5 rounded text-[10px] font-bold`
  - `IN`: `bg-av-warning/15 text-av-warning` (amber)
  - `OUT`: `bg-av-accent/15 text-av-accent` (blue)
- `Type` column: `font-mono text-av-text-muted truncate` — connector type is technical, monospace
- `Label` column: `text-av-text truncate` — user-readable label
- `Format` column:  
  - **OUTPUT ports:** `text-av-info truncate` — format name is informational highlight color  
  - **INPUT ports:** always render `—` (`text-av-text-muted`) — inputs don't have show-assigned formats in current model
- `Route` column: `text-av-text-muted truncate` — routing note, secondary text
- Row hover: `hover:bg-av-surface-hover/40`
- **Row ordering:** Inputs first, then outputs (within each section/slot)
- **Direct then Expansion:** Always show Direct I/O section first; Expansion I/O cards below, labeled `Card {slotNumber}`

---

### Port Loading Pattern (Lazy Fetch)

Ports are fetched on demand (when the card is first expanded), not on page load:

```tsx
const requestedPortUuids = useRef<Set<string>>(new Set()); // idempotency guard

const fetchPortsForUuid = useCallback(async (uuid: string) => {
  if (requestedPortUuids.current.has(uuid)) return; // already fetched or in-flight
  requestedPortUuids.current.add(uuid);
  setPortsLoading(prev => new Set(prev).add(uuid));
  // fetch from /device-ports/device/:uuid
  // ...
}, []);

const toggleReveal = useCallback(async (uuid: string) => {
  setExpandedItems(prev => { ... });
  fetchPortsForUuid(uuid); // idempotent
}, [fetchPortsForUuid]);
```

- `requestedPortUuids` is a **ref** (not state) — avoids re-renders when tracking fetched UUIDs
- The `Set` pattern prevents duplicate requests when the same UUID is toggled rapidly

---

## 📐 Overflow — Permitted Use and Restrictions
<!-- tags: overflow, overflow-hidden, overflow-x-auto, overflow-y-auto, dropdown, format-cascade, clip-bug, css, ioportspanel -->

**Last Updated:** March 11, 2026 — codified from v0.1.x overflow-related bugs

---

### ✅ PERMITTED: overflow-x-auto

For reveal-panel port tables that may be wider than the card:

```tsx
<div className="overflow-x-auto">
  <table className="w-full text-xs table-fixed">
    {/* port table */}
  </table>
</div>
```

- Apply **on the `div` wrapping the table** — not on the table itself
- Required on all `table-fixed` port tables in reveal panels
- Also acceptable on any horizontally-scrollable data table

---

### ✅ PERMITTED: overflow-y-auto

For scrollable modals and constrained-height lists:

```tsx
// Modal body — always use both max-height + overflow-y-auto
<div className="bg-av-surface rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
  ...
</div>

// Bounded picker lists (e.g., camera assignment list in CCU modal)
<div className="space-y-1 max-h-40 overflow-y-auto border border-av-border rounded-md p-2">
  {cameras.map(...)}
</div>
```

---

### ⛔ FORBIDDEN: overflow-hidden on dropdown containers

**Never apply `overflow-hidden` to any container that has `position: absolute` children.**

This clips cascading dropdowns, flyout submenus, and format selectors — they disappear instead of escaping the container.

```tsx
// ❌ WRONG — clips the FormatCascadeSelect dropdown
<div className="p-4 overflow-hidden">
  <IOPortsPanel ... />
</div>

// ✅ CORRECT — let the dropdown escape
<div className="p-4">
  <IOPortsPanel ... />
</div>
```

**Known cases where this has caused bugs:**
- ServerPairModal expansion slot card container (removed `overflow-hidden`, March 2026)
- Any container wrapping `IOPortsPanel` or `FormatCascadeSelect`

---

### FormatCascadeSelect — Viewport-Aware Flip

The `FormatCascadeSelect` component auto-detects viewport edges and flips:
- Opens **upward** (`bottom-full mb-1`) when `window.innerHeight - rect.bottom < 280`
- Submenu opens **leftward** (`right-full mr-0.5`) when `window.innerWidth - rect.right < 160`

This is handled internally in `IOPortsPanel.tsx`. Do not disable or override it. Do not wrap the select in containers that calculate their own clipping (see overflow-hidden rule above).

---

## 📋 Modal Layout Standard
<!-- tags: modal, layout, sticky-header, sticky-footer, field-order, notes, textarea, sends, form -->

**Last Updated:** March 11, 2026

### Structure

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div className="bg-av-surface rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
    <form onSubmit={handleSubmit}>
      {/* Sticky header */}
      <div className="p-6 border-b border-av-border sticky top-0 bg-av-surface z-10">
        <h2 className="text-2xl font-bold text-av-text">Modal Title</h2>
      </div>

      {/* Scrollable body */}
      <div className="p-6 space-y-6">
        {/* fields */}
      </div>

      {/* Sticky footer with action buttons */}
      <div className="p-6 border-t border-av-border flex justify-end gap-3 sticky bottom-0 bg-av-surface">
        <button type="submit" className="btn-primary">Save</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  </div>
</div>
```

### Field ordering within modal body

1. Primary identity fields (ID, Name, Platform)
2. Spec / equipment type selector (if applicable)
3. Direct I/O ports section (`IOPortsPanel`)
4. Expansion I/O ports section (if spec has cards)
5. Secondary relationships (linked cameras, layers, etc.)
6. **Note textarea — always last field before footer**

### Note field standard

```tsx
<div>
  <label className="block text-sm font-medium text-av-text mb-2">Notes</label>
  <textarea
    value={note}
    onChange={(e) => setNote(e.target.value)}
    className="input-field w-full h-24"
    placeholder="Additional notes..."
  />
</div>
```

- Always `<textarea>`, never `<input type="text">` for notes
- Always `h-24` (6 lines) for note fields
- Always last field in the form body
- Placeholder: describes who/what it applies to (e.g. "Additional notes (applied to both servers)…")
