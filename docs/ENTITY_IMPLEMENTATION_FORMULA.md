# Entity Implementation Formula
## Repeatable, Reliable Pattern for New Entity Pages

**Version:** 1.0  
**Last Updated:** February 27, 2026  
**Purpose:** Standard checklist to add new entity types without bugs

---

## Overview

This is the proven, tested pattern for implementing new entity pages (like Sources, Cameras, Media Servers, etc.) that work reliably in both local dev and Railway production.

---

## Phase 1: Database Schema (Prisma)

### 1.1 Define Schema Model
**File:** `video-production-manager/api/prisma/schema.prisma`

```prisma
model entity_name {
  // PRIMARY KEY PATTERN - ALWAYS FIRST
  uuid         String   @id @default(dbgenerated("gen_random_uuid()"))
  
  // USER-EDITABLE ID - ALWAYS SECOND  
  id           String
  
  // REQUIRED FIELDS
  production_id    String
  name             String
  
  // ENTITY-SPECIFIC FIELDS (optional)
  custom_field_1   String?
  custom_field_2   Int?
  custom_field_3   Json?      // For arrays/objects
  
  // STANDARD AUDIT FIELDS (same order for all entities)
  created_at       DateTime    @default(now())
  updated_at       DateTime
  version          Int         @default(1)
  is_deleted       Boolean     @default(false)
  last_modified_by String?
  synced_at        DateTime?
  field_versions   Json?
  
  // RELATIONS
  productions      productions @relation(fields: [production_id], references: [id], onDelete: Cascade)

  // INDEXES
  @@index([production_id])
}
```

**CRITICAL RULES:**
- ✅ `uuid` MUST have `@default(dbgenerated("gen_random_uuid()"))`
- ✅ `uuid` comes FIRST (before `id`)
- ✅ `id` is user-editable String (not PRIMARY KEY)
- ✅ All timestamps/versions in same order as other entities
- ✅ Use `snake_case` for field names (database convention)

### 1.2 Apply Schema Changes
```bash
# DEVELOPMENT (recommended)
cd video-production-manager/api
npx prisma validate          # Verify syntax
npx prisma db push          # Apply to database (fast, no migration file)
npx prisma generate         # Regenerate Prisma client

# PRODUCTION (when ready)
npx prisma migrate dev --name add_entity_name
```

**IMPORTANT:** After `prisma generate`, RESTART the API server to load new Prisma client.

---

## Phase 2: API Routes (Express + Prisma)

### 2.1 Create Route File
**File:** `video-production-manager/api/src/routes/entity-name.ts`

**Template Pattern:**
```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// GET all entities for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const entities = await prisma.entity_name.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(entities));
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// POST create entity
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...entityData } = req.body;
    const snakeCaseData = toSnakeCase(entityData);
    
    // DO NOT include 'uuid' - database generates it
    const entity = await prisma.entity_name.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        updated_at: new Date(),
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: entity.production_id,
      eventType: EventType.ENTITY_NAME,
      operation: EventOperation.CREATE,
      entityId: entity.id,
      entityData: entity,
      userId: userId || 'system',
      userName: userName || 'System',
      version: entity.version
    });
    
    // Broadcast to production room
    io.to(`production:${entity.production_id}`).emit('entity:created', {
      entityType: 'entityName',     // camelCase
      entity: toCamelCase(entity),
      userId,
      userName
    });
    
    res.status(201).json(toCamelCase(entity));
  } catch (error) {
    console.error('❌ Error creating entity:', error);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({ error: 'Failed to create entity' });
  }
});

// PUT update entity (by uuid)
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    const current = await prisma.entity_name.findUnique({
      where: { uuid }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Version conflict check
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    const entity = await prisma.entity_name.update({
      where: { uuid },
      data: {
        ...toSnakeCase(updates),
        updated_at: new Date(),
        version: current.version + 1
      }
    });
    
    // Broadcast update
    io.to(`production:${entity.production_id}`).emit('entity:updated', {
      entityType: 'entityName',
      entity: toCamelCase(entity),
      userId,
      userName
    });
    
    res.json(toCamelCase(entity));
  } catch (error) {
    console.error('Error updating entity:', error);
    res.status(500).json({ error: 'Failed to  entity' });
  }
});

// DELETE entity (soft delete)
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    
    const entity = await prisma.entity_name.update({
      where: { uuid },
      data: {
        is_deleted: true,
        updated_at: new Date()
      }
    });
    
    io.to(`production:${entity.production_id}`).emit('entity:deleted', {
      entityType: 'entityName',
      entityId: uuid,
      entity: toCamelCase(entity)
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity:', error);
    res.status(500).json({ error: 'Failed to delete entity' });
  }
});

export default router;
```

**CRITICAL RULES:**
- ✅ Always use `toSnakeCase()` before sending to database
- ✅ Always use `toCamelCase()` before sending to frontend
- ✅ NEVER include `uuid` in create data (database generates)
- ✅ NEVER use spread operators (`...mainServer`) - explicit fields only
- ✅ Use `uuid` for all routes (`:uuid` not `:id`)
- ✅ WebSocket events: `entity:created/updated/deleted` (generic)
- ✅ Payload includes `entityType` to identify which entity

### 2.2 Register Route in Server
**File:** `video-production-manager/api/src/server.ts`

```typescript
import entityNameRouter from './routes/entity-name';
app.use('/api/entity-name', entityNameRouter);
```

---

## Phase 3: Frontend Store (Zustand)

### 3.1 Add State to Store
**File:** `video-production-manager/src/hooks/useProjectStore.ts`

```typescript
interface ProjectStore {
  // ... existing state
  entityNames: EntityName[];
  
  // Actions
  addEntityName: (data: Partial<EntityName>) => Promise<EntityName>;
  updateEntityName: (uuid: string, updates: Partial<EntityName>) => Promise<EntityName>;
  deleteEntityName: (uuid: string) => Promise<void>;
}

// State initialization
entityNames: [],

// Actions implementation
addEntityName: async (data) => {
  try {
    const response = await apiClient.post('/entity-name', {
      // EXPLICIT FIELD LIST - NO SPREAD OPERATORS!
      id: data.id,
      name: data.name,
      customField1: data.customField1,
      customField2: data.customField2,
      // ... all other fields explicitly
      productionId: get().selectedProduction?.id,
      userId: get().currentUser?.id,
      userName: get().currentUser?.name
    });
    
    const newEntity = response.data;
    set(state => ({
      entityNames: [...state.entityNames, newEntity]
    }));
    
    return newEntity;
  } catch (error) {
    console.error('Failed to create entity:', error);
    throw error;
  }
},

updateEntityName: async (uuid, updates) => {
  try {
    const current = get().entityNames.find(e => e.uuid === uuid);
    
    const response = await apiClient.put(`/entity-name/${uuid}`, {
      ...updates,
      version: current?.version,
      userId: get().currentUser?.id,
      userName: get().currentUser?.name
    });
    
    const updated = response.data;
    set(state => ({
      entityNames: state.entityNames.map(e => 
        e.uuid === uuid ? updated : e
      )
    }));
    
    return updated;
  } catch (error) {
    console.error('Failed to update entity:', error);
    throw error;
  }
},

deleteEntityName: async (uuid) => {
  try {
    await apiClient.delete(`/entity-name/${uuid}`);
    
    set(state => ({
      entityNames: state.entityNames.filter(e => e.uuid !== uuid)
    }));
  } catch (error) {
    console.error('Failed to delete entity:', error);
    throw error;
  }
}
```

**CRITICAL RULES:**
- ✅ Use `uuid` for all operations (not `id`)
- ✅ NEVER use spread operators when sending to API
- ✅ Explicitly list ALL fields being sent
- ✅ Include `version` for conflict detection

### 3.2 Add WebSocket Sync
**File:** `video-production-manager/src/hooks/useProjectStore.ts` (WebSocket setup)

```typescript
// In setupWebSocket function
socket.on('entity:created', (data: { entityType: string; entity: any }) => {
  if (data.entityType === 'entityName') {
    set(state => ({
      entityNames: [...state.entityNames, data.entity]
    }));
  }
});

socket.on('entity:updated', (data: { entityType: string; entity: any }) => {
  if (data.entityType === 'entityName') {
    set(state => ({
      entityNames: state.entityNames.map(e =>
        e.uuid === data.entity.uuid ? data.entity : e
      )
    }));
  }
});

socket.on('entity:deleted', (data: { entityType: string; entityId: string }) => {
  if (data.entityType === 'entityName') {
    set(state => ({
      entityNames: state.entityNames.filter(e => e.uuid !== data.entityId)
    }));
  }
});
```

---

## Phase 4: Frontend Page Component

### 4.1 Create Page Component
**File:** `video-production-manager/src/pages/EntityName.tsx`

Follow existing patterns from:
- `Cameras.tsx` - Complex forms with related entities
- `Sources.tsx` - Tabbed interface patterns
- `CCUs.tsx` - Simple list/form patterns

**Key Patterns:**
```typescript
// Use uuid for all operations
const handleEdit = (entity: EntityName) => {
  setEditingId(entity.uuid);  // NOT entity.id!
};

// Use uuid for finding items
const entity = entityNames.find(e => e.uuid === editingId);

// Use uuid for updates/deletes
await updateEntityName(entity.uuid, updates);
await deleteEntityName(entity.uuid);
```

---

## Phase 5: Testing Checklist

### 5.1 API Tests
```bash
# Run automated test
cd video-production-manager/api
./scripts/test-entity-name.sh

# Manual curl tests
curl -X POST http://localhost:3010/api/entity-name \
  -H "Content-Type: application/json" \
  -d '{"id":"TEST-1","name":"Test Entity","productionId":"..."}'
```

### 5.2 Frontend Tests
- [ ] Create new entity - appears immediately
- [ ] Refresh page - entity persists
- [ ] Edit entity - updates immediately
- [ ] Delete entity - removes immediately
- [ ] Open in second browser - sees real-time updates (WebSocket)
- [ ] Offline handling - shows error messages

### 5.3 Production Deployment
- [ ] Push schema migration to Railway
- [ ] Deploy API changes
- [ ] Deploy frontend changes
- [ ] Test in production environment

---

## Common Gotchas & Solutions

### Issue: "Argument `uuid` is missing"
**Cause:** Schema missing `@default(dbgenerated("gen_random_uuid()"))`  
**Fix:** Add default to schema, run `prisma db push`, restart API server

### Issue: Entities disappear after creation
**Cause:** Spread operator transforms objects incorrectly  
**Fix:** Use explicit field lists (Rule #6 in PROJECT_RULES.md)

### Issue: Field name mismatch between API and TypeScript
**Symptom:** `Cannot read properties of null (reading 'length')` or similar errors  
**Cause:** Database field name differs from TypeScript interface (e.g., `outputs_data` vs `outputs`)  
**Fix:** Add normalization helper in API route:
```typescript
function normalizeEntity(entity: any) {
  const camelCased = toCamelCase(entity);
  return {
    ...camelCased,
    outputs: camelCased.outputsData || [], // Transform field name
    outputsData: undefined // Remove database field name
  };
}
// Apply to all route responses: .map(normalizeEntity)
```

### Issue: No real-time updates between browser tabs
**Symptom:** Creating entity in tab A doesn't show in tab B until refresh  
**Cause:** Entity page component not subscribed to WebSocket events  
**Fix:**
1. Add entity type to `useProductionEvents.ts` EntityEvent interface
2. Import and use `useProductionEvents` hook in component:
```typescript
import { useProductionEvents } from '@/hooks/useProductionEvents';

// Inside component:
const productionId = activeProject?.production?.id || oldStore.production?.id;

useProductionEvents({
  productionId,
  onEntityCreated: useCallback((event) => {
    if (event.entityType === 'yourEntityType') {
      // Update local state or Zustand store
    }
  }, [dependencies]),
  onEntityUpdated: useCallback((event) => { /* ... */ }, []),
  onEntityDeleted: useCallback((event) => { /* ... */ }, [])
});
```

### Issue: React "unique key prop" warning
**Cause:** Using array index as key in `.map()` → `key={idx}`  
**Fix:** Use stable unique identifier:
```typescript
// ❌ BAD - index not stable
{items.map((item, idx) => <div key={idx}>...

// ✅ GOOD - uuid is stable
{items.map((item) => <div key={item.uuid}>...

// ✅ GOOD - composite key if no uuid
{items.map((item) => <div key={`${item.serverId}-${item.outputId}`}>...
```

### Issue: WebSocket updates don't show
**Cause:** Wrong event name or missing entityType filter  
**Fix:** Use generic events (`entity:created`) with `entityType` payload field

### Issue: Version conflicts on every edit
**Cause:** Not sending current `version` with update  
**Fix:** Include `version: current?.version` in update payload

### Issue: Can't find entity after creation
**Cause:** Using `.id` instead of `.uuid` for lookups  
**Fix:** Always use `.uuid` for all operations (PRIMARY KEY)

---

## Validation Checklist

Before marking implementation complete, verify:

- [ ] Schema has uuid @default
- [ ] API routes use `:uuid` parameters
- [ ] Frontend store uses `.uuid` for all operations
- [ ] No spread operators in API calls
- [ ] Database field names match TypeScript interfaces (or add normalization helper)
- [ ] Component uses `useProductionEvents` hook with entityType handlers
- [ ] All `.map()` calls use stable keys (not array index)
- [ ] WebSocket events use generic names + entityType
- [ ] toCamelCase/toSnakeCase used correctly
- [ ] Created automated test script
- [ ] All tests pass
- [ ] Works in both dev and after server restart
- [ ] Real-time updates work across browser tabs
- [ ] No React warnings in console

---

## Files Modified Checklist

When adding a new entity, you touch exactly these files:

1. ✅ `api/prisma/schema.prisma` - Add model
2. ✅ `api/src/routes/entity-name.ts` - Create routes
3. ✅ `api/src/server.ts` - Register routes
4. ✅ `src/hooks/useProjectStore.ts` - Add state & actions
5. ✅ `src/pages/EntityName.tsx` - Create UI
6. ✅ `src/App.tsx` - Add route
7. ✅ `api/scripts/test-entity-name.sh` - Create test

**That's it!** Follow this pattern and entity pages work reliably every time.
