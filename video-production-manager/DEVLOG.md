# Development Log - Video Production Manager

## February 10, 2026

### Railway Deployment Crash Fix - Seed Process Issue
- **Context**: VS Code hung and crashed during previous session; Railway API deployment returning 502 Bad Gateway
  - API server not responding: `{"status":"error","code":502,"message":"Application failed to respond"}`
  - Last commits were error handlers for unhandled rejections/exceptions
  - TypeScript compilation clean locally (0 errors)

- **Investigation Process** (Protocol-Driven):
  1. Linked Railway CLI to VideoDept-API service
  2. Verified environment variables: DATABASE_URL, ENABLE_MDNS=false, NODE_ENV=production ✅
  3. Confirmed Prisma migrations exist (6 migrations including signal flow models from Feb 9) ✅
  4. Reviewed nixpacks.toml start command ✅
  5. Identified local build passes cleanly ✅

- **Root Cause Discovered**:
  - Nixpacks start command: `npx prisma migrate deploy && npm run seed:all && npm run start`
  - `seed:all` script runs `seed:equipment` which first calls `equipment:export`
  - `equipment:export` attempts to read from database BEFORE seeding
  - Fails on fresh Railway deployments where no data exists yet
  - Process crashes, server never starts, returns 502

- **Solution Implemented**:
  - Changed nixpacks.toml start command to use `seed:all:prod` instead of `seed:all`
  - `seed:all:prod` skips export step and seeds directly from equipment-data.json
  - Proper sequence: migrate → seed from JSON → start server

- **Fix Applied**:
  ```toml
  [start]
  cmd = 'npx prisma migrate deploy && npm run seed:all:prod && npm run start'
  ```
  - Committed: `b110a35` - "fix: use seed:all:prod to avoid export step in Railway deployment"
  - Pushed to trigger automatic Railway redeployment

- **Key Lessons**:
  - Production seed scripts must not depend on existing database data
  - Railway deployments are ephemeral - always seed from static files
  - 502 errors indicate app crash during startup, not build failure
  - Protocol-driven investigation (link CLI → check vars → verify migrations → review config) efficiently identified issue

---

### Complete baseEntity Signal Flow Architecture - TypeScript Compilation Fixed
- **Context**: Railway deployment failing due to TypeScript build errors (exit code 2)
  - Initial symptom: 72 TypeScript compilation errors blocking production deployment
  - Root cause investigation revealed: Prisma client naming mismatch, not missing models
  - Discovery: All 9 signal flow models already existed in schema, only route files needed alignment

- **Investigation & Analysis**:
  - Identified 54 errors from unused route files (incorrect Prisma client references)
  - Identified 18 errors from active routes (field name mismatches, type casting issues)
  - Verified all 9 baseEntity models present in schema: cable_snakes, cam_switchers, vision_switchers, led_screens, media_servers, projection_screens, records, routers, streams
  - Verified all EventType enum values already exist (CAM_SWITCHER, VISION_SWITCHER, RECORD, STREAM)
  - Confirmed transform utilities (toCamelCase/toSnakeCase) properly established

- **Implemented Fixes** (following sources.ts pattern):
  1. **Prisma Client References** - Fixed all 9 route files
     - `prisma.cableSnake` → `prisma.cable_snakes`
     - `prisma.camSwitcher` → `prisma.cam_switchers`
     - `prisma.mediaServer` → `prisma.media_servers`
     - `prisma.visionSwitcher` → `prisma.vision_switchers`
     - `prisma.ledScreen` → `prisma.led_screens`
     - `prisma.projectionScreen` → `prisma.projection_screens`
     - `prisma.record` → `prisma.records`
     - `prisma.router` → `prisma.routers`
     - `prisma.stream` → `prisma.streams`
  
  2. **Database Field Names** - WHERE/ORDER BY clauses updated to snake_case
     - `productionId` → `production_id`
     - `isDeleted` → `is_deleted`
     - `createdAt` → `created_at`
     - Applied to all query constructions across 9 route files
  
  3. **Property Access Fixes** - Post-query entity object references
     - `entity.productionId` → `entity.production_id` in recordEvent() calls
     - Fixed in led-screens.ts, projection-screens.ts, records.ts
     - Ensures proper access to Prisma-returned snake_case fields
  
  4. **Active Route Corrections**:
     - [validation-helpers.ts:47](api/src/utils/validation-helpers.ts) - sources query uses `uuid` not `id` (sources table special case)
     - [settings.ts:510](api/src/routes/settings.ts) - added required `id`, `updated_at` fields to upsert, added crypto import
     - [equipment.ts](api/src/routes/equipment.ts) - fixed relation name `equipment_card_io` (was equipment_io_ports), added required fields
     - [admin.ts:184](api/src/routes/admin.ts) - FieldVersions type casting with `as unknown` intermediate, currentData declared as `any`
     - [productions.ts:232](api/src/routes/productions.ts) - FieldVersions type casting fix
  
  5. **Server Configuration**:
     - [server.ts:258-266](api/src/server.ts) - Uncommented all 9 route imports
     - [server.ts:281-289](api/src/server.ts) - Enabled all 9 route registrations
     - All signal flow endpoints now active: /api/cable-snakes, /api/cam-switchers, etc.
  
  6. **Build Configuration Cleanup**:
     - [package.json:8](api/package.json) - Restored clean build script: `"build": "tsc"`
     - [tsconfig.json](api/tsconfig.json) - Removed temporary `"noEmitOnError": false` workaround
     - TypeScript now properly enforces type safety during build

- **Validation Results**:
  - ✅ TypeScript compilation: **0 errors**, exit code 0
  - ✅ Build produces clean dist/ folder with all route files
  - ✅ All 9 signal flow routes enabled and registered
  - ✅ Transform pipeline intact: API (camelCase) ↔ Database (snake_case)
  - ✅ baseEntity pattern complete: id, production_id, created_at, updated_at, version, is_deleted, last_modified_by, synced_at

- **Architecture Pattern Confirmed**:
  ```typescript
  // Example: led-screens route
  const ledScreen = await prisma.led_screens.findUnique({
    where: { id, is_deleted: false }
  });
  await recordEvent({
    productionId: ledScreen.production_id, // ← snake_case from DB
    eventType: EventType.LED_SCREEN
  });
  io.emit('entity:created', {
    entity: toCamelCase(ledScreen) // ← Transform before sending to frontend
  });
  ```

- **Key Lessons**:
  - Prisma client property names mirror table names exactly (snake_case from schema)
  - Database returns snake_case fields, must be accessed with snake_case in TypeScript
  - Transform utilities convert at API boundary, not within route logic
  - Systematic sed/perl replacements effective for bulk fixes, multi_replace for precision
  - Protocol-driven investigation prevented premature implementation of unnecessary features

- **Ready for Deployment**:
  - All TypeScript errors resolved
  - Build configuration clean (no workarounds)
  - All 9 signal flow entity types operational
  - Ready to test on Railway production environment

---

## February 9, 2026

### Session Initialization & Protocol Review
- **Context**: New session start after gap since Feb 3
  - Database migrations verified: 6 migrations applied, schema up to date
  - Ports cleared (3010 API, 3011 Frontend)
  - Previous migration attempt (`add_signal_flow_models`) encountered error but database is now in sync
  
- **Protocol Review**: Reviewed all standardized procedures
  1. **SESSION_START_PROTOCOL.md** - 5-phase startup checklist for session initialization
  2. **AI_AGENT_PROTOCOL.md** - Universal development protocol (v2.0, database workflows, session tracking)
  3. **PROTOCOL.md** - Project-specific rules (logging standards, browser tab management, port config)
  4. **SESSION_JOURNAL.md** - Historical work tracking system with prompt IDs, milestones, and crash recovery
  
- **Key Protocols Confirmed**:
  - ✅ Structured logging (DEBUG, INFO, WARN, ERROR, CRITICAL) for UI log viewers
  - ✅ No auto-opening browser tabs
  - ✅ Auto-restart servers after major updates
  - ✅ Fixed ports: API:3010, Frontend:3011
  - ✅ Session tracking with unique IDs, milestones, and detailed action logs
  - ✅ Database-first workflow with migrations and seeds
  
- **Current System State**:
  - Last active work: Feb 3 - Phase 5 multi-browser sync testing (IN_PROGRESS)
  - Phase 3 complete: Field-level versioning (16/16 tests passing)
  - Infinite render loop bug previously resolved (Feb 1)
  - Ready for: Multi-browser sync testing execution (10 test scenarios)

### Next Steps
- Start development servers (API + Frontend)
- Execute Phase 5 multi-browser sync testing from [MULTI_BROWSER_SYNC_TEST.md](../MULTI_BROWSER_SYNC_TEST.md)
- Document test results
- Continue with Production Checklist feature (new priority from TODO list)

---

## February 1, 2026

### Bug Fixes - Infinite Render Loop Resolution
- **Fixed** Critical infinite render loop in Settings page (Maximum update depth exceeded)
  - **Root cause:** ServerConnection renderStatus callback creating dependency cycle
  - renderStatus was inline arrow function → new reference on every Settings render
  - ServerConnection useEffect had renderStatus in deps → triggered on every change
  - Created loop: render → new callback → useEffect → setState → render
  
- **Solution:** Applied Option C (architectural improvements)
  1. Memoized renderStatus callback with useCallback in Settings.tsx
  2. Removed renderStatus from ServerConnection useEffect dependency array
  - Follows React best practices
  - Prevents similar issues in the future
  
- **Commits:**
  - c6f5bcb: Fix infinite render loop in Settings page
  - 5d17dde: Remove troubleshooting debug logs from Settings.tsx

### Field-Level Versioning - Phase 3 Complete ✅
- **Fixed** Conflict resolution force save bug
  - Variable scoping issue: updatedProject out of scope in catch block
  - Fixed by reconstructing project object from activeProject
  - Added proper error handling with try/catch and user feedback
  - Added IndexedDB sync for force saves

- **Enhanced** Conflict resolution dialog
  - Upgraded from confirm() (2 options) to prompt() (3 options)
  - Option 1: Retry - reload fresh data and manually merge
  - Option 2: Keep Yours - force save, overwrite their changes
  - Option 3: Keep Theirs - discard your changes, load their version
  
- **Testing Results:** All Phase 3 tests passing
  - ✅ Test 1: Single browser field edits working
  - ✅ Test 2: Two browsers different fields - auto-merge successful
  - ✅ Test 3: Two browsers same field - conflict detected, retry option works
  
- **Settings Page:** Production info form with 7 editable fields (showName, client, venue, room, loadIn, loadOut, showInfoUrl)
- **Dashboard:** Added pencil edit button that navigates to Settings
- **Architecture:** Database-first with dual-path API (field-level + record-level fallback)
  - 16/16 backend tests passing
  - 14 tracked fields with JSONB field_versions column
  - Automatic conflict detection and resolution
  - Manual refresh required until Phase 4 WebSocket implementation

---

## January 18, 2026

### Bug Fixes & UX Improvements
- **Fixed** Settings page blank screen - added missing frameRates and resolutions initialization
- **Fixed** Source edit modal blank screen - added safety checks for undefined arrays
- **Disabled** auto-open browser on server restart
- **Improved** Settings UX: All sections now collapsed by default
- **Added** Settings section state persistence to localStorage (remembers user's expand/collapse preferences)

### Version Control & Logging System
- **Established** automatic git commit and push protocol for code changes
- **Created** DEVLOG.md for human-readable development history
- **Implemented** LogService for tracking application changes
  - Stores up to 1000 log entries in localStorage
  - Tracks settings additions, updates, deletions, and reordering
  - Tracks equipment additions, updates, deletions with change details
  - Includes timestamps, categories, and detailed change tracking
  
- **Created** Activity Logs page
  - Filter by category (all, settings, equipment, general)
  - Expandable entries showing field-level changes
  - Export logs as JSON
  - Clear logs functionality
  - Color-coded badges for categories and actions

### Centralized Settings Management
- **Removed** `secondaryDevices` from Settings - replaced with connector types from equipment converters
- **Added** Connector Types section to Settings
  - Initialized with: HDMI, SDI, DP, FIBER, NDI, USB-C
  - Drag-and-drop reordering with GripVertical handles
  - Add/remove capabilities with validation
  
- **Added** Frame Rates section to Settings
  - Initialized with: 60, 59.94, 50, 30, 29.97, 25, 24, 23.98
  - Drag-and-drop reordering
  - Add/remove capabilities
  
- **Added** Resolutions section to Settings
  - Initialized with: 1080i, 1080p, 720p, 4K, 8K, SD
  - Drag-and-drop reordering
  - Add/remove capabilities

### Site-Wide Integration
- Updated all dropdown references to use centralized settings
- Equipment FORMAT_OPTIONS now dynamically built from resolutions × frameRates
- SourceFormModal uses centralized connectorTypes
- EquipmentFormModal uses centralized resolutions and frameRates
- Added safety checks for undefined arrays
- All changes automatically logged via LogService

### Bug Fixes
- Fixed blank window issue (Cameras page was de-referenced)
- Restored Cameras page with all original customizations intact
- Added cache clearing guidance

### Infrastructure
- **Protocol**: Automatically commit and push after code changes (unless user says "don't push")
- **Protocol**: Server restart after large alterations
- All 4 settings lists (Source Types, Connector Types, Frame Rates, Resolutions) support drag-and-drop reordering
- Changes in Settings automatically propagate throughout application
- All changes tracked in Activity Logs

---

## February 10, 2026

### Phase 5 Multi-Browser Sync Testing & Bug Fixes

**Context**: Executing local multi-browser sync tests from RAILWAY_SYNC_TESTING.md

#### Test 2: Checklist Sync - PASSED ✅

**Issue 1**: 409 conflict on checklist page load (Browser B)
- **Root Cause**: Checklist page's useEffect was mutating activeProject on mount (computing collapsedCategories)
- **Solution**: Removed mutation - compute collapsed state on-the-fly from checklist items instead of storing in project
- **Files**: [Checklist.tsx](video-production-manager/src/pages/Checklist.tsx#L33-47) - Removed lines 33-47

**Issue 2**: 409 conflict when toggling category visibility
- **Root Cause**: Category collapsed state stored in project.collapsedCategories → triggered saveProject() → sync conflict
- **Solution**: Moved UI preferences to localStorage (per-browser, never synced)
- **Pattern**: UI state should be local, not synced across browsers
- **Files**: [Checklist.tsx](video-production-manager/src/pages/Checklist.tsx#L23-70) - localStorage init and sync

#### Test 3: Camera Sync - Fixed, Ready to Retest

**Issue 1**: Cameras not persisting/appearing in other browser
- **Root Cause**: Camera CRUD functions only updated local Zustand state, never called API
- **Solution**: 
  - Added camera/CCU API methods to apiClient: `createCamera`, `updateCamera`, `deleteCamera`, `getCameras`, `createCCU`, `updateCCU`, `deleteCCU`, `getCCUs`
  - Made store CRUD functions async with API calls + optimistic updates
  - Added error rollback pattern
- **Files**: 
  - [apiClient.ts](video-production-manager/src/services/apiClient.ts#L213-252) - New methods
  - [useProjectStore.ts](video-production-manager/src/hooks/useProjectStore.ts#L1268-1445) - Async CRUD
  - [Cameras.tsx](video-production-manager/src/pages/Cameras.tsx) - Async handlers

**Issue 2**: 500 error "Unknown argument `manufacturer`" from API
- **Root Cause**: 
  - Frontend sends camelCase fields
  - API wasn't converting to snake_case for Prisma
  - `manufacturer` field doesn't exist in cameras schema (only `model`)
- **Solution**:
  - Added `toSnakeCase()` conversion in POST/PUT routes
  - Filtered out `manufacturer` field before database insert
  - Applied same pattern to CCU routes preemptively
- **Files**:
  - [cameras.ts](video-production-manager/api/src/routes/cameras.ts#L47-140) - toSnakeCase + filter
  - [ccus.ts](video-production-manager/api/src/routes/ccus.ts#L47-145) - Same pattern

#### Test 3 Retest Results (2026-02-10 Evening)

**Issue 3: Foreign Key Constraint**
- **Problem**: After fixing field mismatch, got new 500 error: "Foreign key constraint violated: `cameras_ccu_id_fkey (index)`"
- **Root Cause**: Form was sending empty string `''` for ccuId field instead of `null`, which violated the foreign key constraint
- **Solution**: Added check in API routes to convert empty string to null before database operations
- **Files Changed**:
  - [cameras.ts](video-production-manager/api/src/routes/cameras.ts#L67-71) - Convert empty ccuId to null
  - Same pattern applied to update route

**Issue 4: Real-Time Sync Not Working**
- **Problem**: Created camera on Browser A successfully, but Browser B required manual refresh to see the new camera
- **Root Cause**: API was broadcasting WebSocket events (`camera:created`) but frontend had no listeners for entity events
- **Investigation**: Found `useProductionSync` hook already had checklist-item listeners but no listeners for other entities
- **Solution**: Added WebSocket event listeners for all entity types:
  - Camera events: camera:created, camera:updated, camera:deleted
  - CCU events: ccu:created, ccu:updated, ccu:deleted
  - Source events: source:created, source:updated, source:deleted
  - Send events: send:created, send:updated, send:deleted
- **Files Changed**:
  - [useProductionSync.ts](video-production-manager/src/hooks/useProductionSync.ts#L221-390) - Added entity event listeners
- **Pattern**: Each listener:
  1. Checks if update is for current production
  2. Prevents duplicates by checking if entity already exists
  3. Updates activeProject in store
  4. Persists to IndexedDB
  5. Logs success

**Issue 5: Delete Not Syncing (2026-02-10 Evening)**
- **Problem**: Browser A deleted camera successfully, but Browser B required manual refresh to see the deletion
- **Root Cause**: DELETE routes in API were missing WebSocket broadcast calls
  - Cameras and CCUs: No broadcast at all
  - Sources and Sends: Had generic `entity:deleted` broadcast instead of specific event names
- **Solution**: Added `broadcastEntityDeleted()` helper calls to all DELETE routes
- **Files Changed**:
  - [cameras.ts](video-production-manager/api/src/routes/cameras.ts#L219-225) - Added broadcast after event recording
  - [ccus.ts](video-production-manager/api/src/routes/ccus.ts) - Added broadcast after event recording
  - [sources.ts](video-production-manager/api/src/routes/sources.ts) - Replaced generic broadcast with broadcastEntityDeleted
  - [sends.ts](video-production-manager/api/src/routes/sends.ts) - Replaced generic broadcast with broadcastEntityDeleted
- **Pattern**: Each DELETE route now:
  1. Soft deletes entity (is_deleted = true)
  2. Records DELETE event
  3. Broadcasts `{entityType}:deleted` via broadcastEntityDeleted()
  4. Returns success
- **Note**: Sources and sends were using generic `entity:deleted` event, now all use specific events matching frontend listeners

**Issue 6: Cannot Create New Camera/CCU After Deletion (2026-02-10 Evening)**
- **Problem**: After deleting a camera (e.g., "CAM 1") and trying to create a new one with the same ID → 500 error: "Unique constraint failed on the fields: (`id`)"
- **Root Cause**: Soft deletes keep the ID in database (is_deleted=true), but unique constraint on `id` field prevents reusing the ID
- **Solution**: 
  1. Added ID uniqueness check in CREATE routes before attempting database insert
  2. Return 409 conflict with helpful message instead of 500 error
  3. Improved frontend error handling to catch 409 and suggest next available ID
- **Files Changed**:
  - [cameras.ts](video-production-manager/api/src/routes/cameras.ts) - Check for existing ID including soft-deleted
  - [ccus.ts](video-production-manager/api/src/routes/ccus.ts) - Same check
  - [Cameras.tsx](video-production-manager/src/pages/Cameras.tsx#L119-138) - Better error handling with ID suggestion
  - [CCUs.tsx](video-production-manager/src/pages/CCUs.tsx#L103-144) - Better error handling, made async
- **Pattern**: Before CREATE, always check `findUnique` on ID field, return 409 if exists
- **User Experience**: Error message now says "Camera ID 'CAM 1' is already in use. Suggestion: Use 'CAM 2' instead."

#### Lessons Learned (Critical for Sends, Signal Flow, etc.)

**Pattern 1: Entity CRUD Requirements**
- EVERY entity needs API methods in apiClient (create, update, delete, get)
- EVERY store CRUD function must be async and call API
- Use optimistic updates + error rollback pattern
- **CRITICAL**: WebSocket broadcasts required for ALL operations:
  - CREATE: `broadcastEntityCreated()` after recording event
  - UPDATE: `broadcastEntityUpdate()` after recording event
  - DELETE: `broadcastEntityDeleted()` after recording event
- Import helpers from `utils/sync-helpers`
- Broadcasts enable instant sync across browsers without refresh

**Pattern 2: Frontend WebSocket Listeners**
- Frontend must have corresponding listeners in `useProductionSync.ts` for each entity type
- Required listeners: `{entityType}:created`, `{entityType}:updated`, `{entityType}:deleted`
- Each listener should:
  1. Check if update is for current production
  2. Prevent duplicates (check if entity already exists for create events)
  3. Update `activeProject` state via `useProjectStore.setState()`
  4. Persist changes to IndexedDB
  5. Log success for debugging
- Without frontend listeners, API broadcasts are ignored and refresh is required

**Pattern 3: Field Case Conversion**
- Frontend uses camelCase
- Database/Prisma uses snake_case
- ALWAYS use `toSnakeCase()` in API routes before Prisma operations
- ALWAYS use `toCamelCase()` when returning data to frontend
- Import from: `utils/caseConverter`

**Pattern 4: Schema Validation**
- Check Prisma schema BEFORE adding fields to API routes
- Filter out fields that don't exist in schema
- Frontend might send extra fields from forms - filter defensively

**Pattern 5: Foreign Key Constraints**
- Empty strings violate foreign key constraints
- Convert empty string to `null` for optional FK fields
- Example: `if (snakeCaseData.ccu_id === '') { snakeCaseData.ccu_id = null; }`
- Applies to all optional FK fields (ccu_id, source_id, etc.)

**Pattern 6: UI State vs Data State**
- UI preferences (collapsed state, sort order, view mode) → localStorage
- Business data (production, equipment, connections) → API + sync
- Never trigger API saves for pure UI state changes

**Pattern 7: Equipment Data Duplication Issue**
- Current: Cameras store `model`, forms collect `manufacturer`
- Problem: Data duplication, no single source of truth
- Future: Phase 6 will normalize with equipment_id FK and master equipment table
- Quick fix: Filter out non-schema fields for now

**Pattern 8: Soft Deletes and ID Uniqueness**
- Soft deletes set `is_deleted=true` but keep the ID in database
- Unique constraint on `id` field prevents reusing IDs from deleted entities
- **CRITICAL**: Always check for existing ID (including soft-deleted) before CREATE
- Example: `const existing = await prisma.entity.findUnique({ where: { id } }); if (existing) return 409;`
- Return 409 conflict with helpful error message
- Frontend should catch 409 and suggest next available ID to user
- Applies to ALL entities with user-specified IDs (cameras, CCUs, etc.)

#### Testing Status
- Test 2 (Checklist): ✅ PASSED - All UI preference conflicts resolved
- Test 3 (Cameras): ✅ READY TO RETEST - Fixed all 6 issues:
  1. Missing API methods ✅
  2. Field conversion (toSnakeCase) ✅
  3. FK constraints (empty string → null) ✅
  4. WebSocket listener for create ✅
  5. WebSocket broadcast for delete ✅
  6. ID uniqueness validation ✅
- Test 6 (CCUs): ✅ READY TO RETEST - Same 6 fixes applied
- Tests 4-5, 7-10: Pending (Sources, Sends, Connections, Offline, Conflicts, Rapid)
- Note: Sources and Sends should also work with same patterns applied

---

## Previous Work

### Equipment Management System
- 10 equipment categories with modal-based CRUD operations
- Card-based architecture with direct I/O specifications
- Multi-output source support
- Equipment modal redesign with format assignment
- Simplified card model (removed manufacturer/model fields)

### Core Features
- Production planning and management
- Source and send tracking
- LED screen configuration
- IP address management
- Checklist system
- Video switcher integration
- Media server allocation
- CCU and camera management
