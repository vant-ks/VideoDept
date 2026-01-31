# Naming Convention Audit & Fixes
**Date:** January 31, 2026
**Status:** CRITICAL ISSUES FOUND

## Summary
Comprehensive audit of naming conventions across Prisma schema, API routes, and frontend code revealed multiple critical mismatches causing runtime errors.

---

## Prisma Schema (Source of Truth)
**Convention:** `snake_case` fields, `plural` table names

### Verified Tables (Exist in Schema)
✅ cameras (snake_case fields: production_id, ccu_id, created_at, etc.)
✅ ccus (snake_case fields: production_id, created_at, etc.)
✅ checklist_items (snake_case fields: production_id, **category, task**, completed)
✅ connections (snake_case fields: production_id, source_id, created_at)
✅ ip_addresses (snake_case fields: production_id, created_at)
✅ productions (snake_case fields: created_at, updated_at, show_name, load_in, load_out)
✅ sources (snake_case fields: production_id, created_at, etc.)
✅ sends (snake_case fields: production_id, created_at, etc.)

### Missing Tables (Routes Exist But NO Schema)
❌ **records** - route exists, NO table in schema
❌ **streams** - route exists, NO table in schema  
❌ **routers** - route exists, NO table in schema
❌ **cable_snakes** - route exists, NO table in schema
❌ **projection_screens** - route exists, NO table in schema
❌ **media_servers** - route exists, NO table in schema
❌ **video_switchers** - route exists, NO table in schema
❌ **computers** - route exists, NO table in schema
❌ **led_screens** - route exists, NO table in schema

---

## API Routes Issues

### ❌ CRITICAL: camelCase vs snake_case
**Problem:** Many routes use `camelCase` to access Prisma returned data, but Prisma returns `snake_case`

**Files with .productionId (WRONG):**
- api/src/routes/projection-screens.ts (lines 40, 51, 104, 116, 150, 161)
- api/src/routes/streams.ts (lines 40, 51, 104, 116, 150, 161)
- api/src/routes/cable-snakes.ts (lines 40, 51, 104, 116, 150, 161)
- api/src/routes/records.ts (lines 40, 51, 104, 116, 150, 161)
- api/src/routes/routers.ts (similar pattern)
- api/src/routes/media-servers.ts (similar pattern)
- api/src/routes/video-switchers.ts (similar pattern)
- api/src/routes/computers.ts (similar pattern)
- api/src/routes/led-screens.ts (similar pattern)

**Should be:** `.production_id`

**Fixed Files:**
✅ api/src/routes/checklist-items.ts (fixed in commit 549fb6a)

### ❌ CRITICAL: Routes for Non-Existent Tables
All routes listed in "Missing Tables" section will fail because:
1. Prisma client doesn't have these models
2. Any query will throw "Property does not exist on type 'PrismaClient'"

---

## Frontend Issues

### ❌ CRITICAL: checklist_items Field Mismatch
**Location:** src/hooks/useProjectStore.ts line 224-228

**Frontend sends:**
```typescript
{
  id: item.id,
  title: item.title,  // ❌ WRONG - doesn't exist in schema
  completed: item.completed
}
```

**Schema expects:**
```typescript
{
  id: string
  production_id: string  // ❌ MISSING in frontend payload
  category: string       // ❌ MISSING in frontend payload
  task: string           // ❌ MISSING in frontend payload  
  completed: boolean
  sort_order?: number
}
```

**Impact:** ALL checklist item creation fails with 500 errors

---

## Required Fixes

### Priority 1: Fix checklist_items (BLOCKING)
1. **Update schema** OR **update frontend** to align field names
   - Option A: Change schema `category` + `task` → `title`
   - Option B: Change frontend to send `category` + `task` instead of `title`
   - **Recommendation:** Frontend has existing checklist with `title` field, so update schema

2. **Fix frontend payload** in useProjectStore.ts:
   - Add `production_id` field
   - Either map `title` → split into `category` + `task`, OR update schema

### Priority 2: Fix camelCase Field Access
Update ALL route files to use `snake_case`:
- Change `entity.productionId` → `entity.production_id`
- Change `entity.createdAt` → `entity.created_at`  
- Change `entity.updatedAt` → `entity.updated_at`
- Change any other camelCase field access

### Priority 3: Handle Missing Tables
For each route with no corresponding schema table:
- Either ADD table to schema + run migration
- OR DELETE the route file if feature not implemented

---

## Implementation Plan

### Step 1: Fix checklist_items Schema
```prisma
model checklist_items {
  id            String      @id
  production_id String
  title         String      // CHANGED from category + task
  completed     Boolean     @default(false)
  sort_order    Int?
  created_at    DateTime    @default(now())
  updated_at    DateTime
  version       Int         @default(1)
  productions   productions @relation(fields: [production_id], references: [id], onDelete: Cascade)

  @@index([production_id])
}
```

### Step 2: Fix useProjectStore Payload
```typescript
await apiClient.createChecklistItem(productionData.id, {
  id: item.id,
  production_id: productionData.id,  // ADD THIS
  title: item.title,                 // Keep as-is
  completed: item.completed || false
});
```

### Step 3: Bulk Fix All Route Files
Search and replace in all files:
- `entity.productionId` → `entity.production_id`
- `entity.sourceId` → `entity.source_id`
- `entity.createdAt` → `entity.created_at`
- `entity.updatedAt` → `entity.updated_at`

### Step 4: Verify Prisma Types
After schema change, run:
```bash
cd api
npx prisma generate
npx prisma migrate dev --name fix_checklist_schema
```

---

## Testing Checklist
- [ ] Create new production - no errors
- [ ] 40 checklist items save successfully
- [ ] Production persists after refresh
- [ ] Checklist items visible after refresh
- [ ] All entities (cameras, sources, sends) can be created
- [ ] Real-time WebSocket updates work
- [ ] No 500 errors in console or terminal
