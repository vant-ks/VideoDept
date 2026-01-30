# VS Code Crash Audit - January 30, 2026

## Problem
VS Code has crashed multiple times when executing large Prisma commands, particularly:
- `npx prisma studio` (multiple crashes - exit code 137)
- `./generate-all-entities.sh` script execution
- Heavy database operations

Exit code 137 = SIGKILL (forcefully killed by system, often due to memory pressure)

## What Was Completed Successfully ✅

### 1. Database Schema & Migration
- ✅ Database tables exist and are operational (22 models confirmed via `prisma db pull`)
- ✅ Core production entities: productions, sources, sends, cameras, ccus
- ✅ Infrastructure entities: connections, ip_addresses, checklist_items
- ✅ Equipment library: equipment_specs, equipment_cards, equipment_io_ports, equipment_card_io
- ✅ Support tables: settings, events, connector_types, source_types, frame_rates, resolution_presets

### 2. API Routes Generated
All route files were successfully created in `/api/src/routes/`:
- ✅ cable-snakes.ts
- ✅ cam-switchers.ts
- ✅ cameras.ts
- ✅ ccus.ts
- ✅ checklist-items.ts
- ✅ connections.ts
- ✅ equipment.ts
- ✅ events.ts
- ✅ ip-addresses.ts
- ✅ led-screens.ts
- ✅ media-servers.ts
- ✅ productions.ts
- ✅ projection-screens.ts
- ✅ records.ts
- ✅ routers.ts
- ✅ sends.ts
- ✅ settings.ts
- ✅ sources.ts
- ✅ streams.ts
- ✅ vision-switchers.ts

### 3. Server Infrastructure
- ✅ API server starts successfully on port 3010
- ✅ Frontend dev server works on port 3011
- ✅ Health check endpoint responds
- ✅ POST requests to productions API working
- ✅ Database seeding completed successfully

## What Needs Completion ❌

### 1. Prisma Schema Sync Issue
**CRITICAL:** The `npx prisma db pull` **overwrote** the manually maintained schema.

**Before crash:** Schema had proper TypeScript-style naming (PascalCase models, camelCase fields)
```prisma
model Production { ... }
model Source { ... }
model Camera { ... }
```

**After db pull:** Schema now has snake_case table names (database reality)
```prisma
model cameras { ... }
model ccus { ... }
model productions { ... }
```

**Why this happened:** The database tables were created with snake_case names, but the Prisma schema was manually maintained with PascalCase. When `db pull` ran, it introspected the actual database.

### 2. Missing Database Models
The following entities have API routes but **NO database tables** (yet):
- ❌ MediaServer / media_servers
- ❌ Router / routers  
- ❌ CableSnake / cable_snakes
- ❌ Record / records
- ❌ Stream / streams
- ❌ VisionSwitcher / vision_switchers
- ❌ CamSwitcher / cam_switchers
- ❌ LEDScreen / led_screens
- ❌ ProjectionScreen / projection_screens

### 3. Missing Prisma Client Generation
After the crash, `prisma generate` needs to be run to sync the Prisma Client with the current schema state.

## Root Cause Analysis: Why VS Code Keeps Crashing

### Memory-Heavy Operations
1. **Prisma Studio** - Loads entire database into memory, keeps WebSocket connections open
2. **Batch Script Generation** - Creates 20+ files simultaneously, triggers excessive FS watchers
3. **No Memory Limits** - Node processes spawned without `--max-old-space-size` constraints

### File System Watchers
- Creating 20 route files + triggering TypeScript compilation + ESLint + Prettier all at once
- VS Code's FS watcher limit can be exceeded on macOS
- Multiple terminals running heavy node processes simultaneously

### Concurrent Heavy Processes
Looking at terminal history:
- Multiple `tsx watch` processes (API server)
- `vite` dev server (frontend)
- `prisma studio` (database GUI)
- `prisma db pull` (schema introspection)
- Batch file generation script

All competing for resources simultaneously.

## Safe Command Design Principles

### 1. **Never Run Prisma Studio from Terminal**
❌ BAD: `npx prisma studio`
✅ GOOD: Tell user to run it from a **separate terminal window** or use the **Prisma VS Code extension**

### 2. **Batch Operations Must Be Chunked**
❌ BAD: Generate all 20 files at once
```bash
for entity in all_entities; do generate $entity; done
```

✅ GOOD: Generate in batches with pauses
```bash
# Batch 1 (Core entities)
generate Source; generate Send; generate Camera; 
sleep 2

# Batch 2 (Infrastructure)
generate Connection; generate IPAddress; 
sleep 2

# etc...
```

### 3. **Always Check Memory Before Heavy Operations**
```bash
# Check available memory before running heavy commands
available=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
if [ $available -lt 100000 ]; then
  echo "⚠️  Low memory. Close other apps first."
  exit 1
fi
```

### 4. **Use Background Process Limits**
```bash
# Limit concurrent Node processes
npm run dev &
PID=$!
renice +10 $PID  # Lower priority
```

### 5. **Database Operations Must Be Idempotent**
Every migration, seed, or generation script should:
- Check if work is already done before starting
- Support `--force` flag to override
- Create backups before destructive operations
- Log progress to file (not just stdout)

### 6. **Separate Schema Management from Code Generation**
❌ BAD: `prisma migrate dev` → triggers codegen → triggers TypeScript → crash
✅ GOOD: 
```bash
# Step 1: Create migration (schema only)
npx prisma migrate dev --create-only --name add_media_servers

# Step 2: Review SQL file (manual step)

# Step 3: Apply migration (isolated)
npx prisma migrate deploy

# Step 4: Generate client (isolated)
npx prisma generate

# Step 5: Restart servers (isolated)
npm run dev
```

### 7. **Use Local Database for Development**
The script is connecting to Railway database (`shinkansen.proxy.rlwy.net`), which adds network latency and potential timeout issues.

✅ BETTER: Use local PostgreSQL for heavy operations
```bash
# Use local DB for schema work
export DATABASE_URL="postgresql://localhost:5432/viddept_dev"
npx prisma migrate dev

# Sync to production only after testing
npx prisma migrate deploy --preview-feature
```

## Recommended Next Steps

### Immediate (Before Any More Commands)
1. Kill all running servers properly
2. Check current memory usage
3. Close Prisma Studio if open
4. Verify which database is active (local vs Railway)

### Schema Recovery
1. **BACKUP current schema:** `cp prisma/schema.prisma prisma/schema.backup.$(date +%s).prisma`
2. Decide on naming convention:
   - Option A: Accept snake_case (match database reality)
   - Option B: Use `@@map` to keep PascalCase models mapping to snake_case tables
3. Run `prisma generate` to sync client
4. Test with a simple query

### Missing Entities (Do in Phases)
**Phase 1** (Media/Video):
- Create migrations for: MediaServer, Router, CableSnake
- Generate and test

**Phase 2** (Recording):
- Create migrations for: Record, Stream  
- Generate and test

**Phase 3** (Switching):
- Create migrations for: VisionSwitcher, CamSwitcher
- Generate and test

**Phase 4** (Display):
- Create migrations for: LEDScreen, ProjectionScreen
- Generate and test

### Server Management
1. Create a proper orchestration script:
```bash
# start-dev.sh
#!/bin/bash
pkill -f "tsx watch"
pkill -f "vite"
sleep 2

cd api && npm run dev &
API_PID=$!
sleep 3  # Wait for API to be ready

cd ../video-production-manager && npm run dev &
FE_PID=$!

echo "API: $API_PID, Frontend: $FE_PID"
echo $API_PID > .api.pid
echo $FE_PID > .fe.pid
```

## Memory-Safe Command Templates

### For Schema Changes
```bash
# Always one at a time, never in parallel
npx prisma migrate dev --name add_single_entity --create-only
# Review the SQL
npx prisma migrate deploy
sleep 2
npx prisma generate
```

### For Seeding
```bash
# Chunk the data
npx prisma db seed -- --table=equipment_specs --batch-size=50
sleep 1
npx prisma db seed -- --table=sources --batch-size=50
```

### For File Generation
```bash
# Generate one, wait for FS to settle
./generate-entity.sh MediaServer mediaServer media-servers MEDIA_SERVER
sleep 1
./generate-entity.sh Router router routers ROUTER
sleep 1
# etc...
```

## Key Takeaway

**Stop trying to do everything at once.** The architecture is complex, the database is large, and VS Code has resource limits. Break every operation into small, observable, reversible steps.

**Never assume success**—always verify the result before moving to the next step.
