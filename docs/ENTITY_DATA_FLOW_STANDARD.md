# Entity Data Flow Standard - Systematic Protocol

**Created:** February 21, 2026  
**Status:** ENFORCEMENT REQUIRED  
**Purpose:** Eliminate circular pattern violations

---

## 🚨 THE SYSTEMIC PROBLEM

This document exists because the same issues keep recurring:
- UUID/ID confusion (sources, cameras, CCUs)
- Event name mismatches (source:created vs entity:created)  
- Field name inconsistencies (snake_case vs camelCase)
- WebSocket sync failures
- Frontend state management conflicts

**Root Cause:** Documentation exists but no enforcement mechanism. Agents repeatedly violate patterns that were previously fixed.

---

## ✅ THE FORMULA - Non-Negotiable Pattern

### Layer 1: Database (PostgreSQL + Prisma)

```prisma
model entity_name {
  id            String   @id        // PK: user-friendly (e.g., "SRC 1")
  production_id String               // FK: always required
  name          String               // Business fields
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  version       Int      @default(1)
  is_deleted    Boolean  @default(false)
  
  // Relationships
  productions productions @relation(fields: [production_id], references: [id])
  
  @@index([production_id, is_deleted])
}
```

**RULES:**
- ✅ **ALWAYS** use snake_case for all field names
- ✅ **ALWAYS** use `id` as PRIMARY KEY (text, user-friendly like "SRC 1")
- ❌ **NEVER** use `uuid` as PRIMARY KEY (unless explicitly architected system-wide)
- ✅ **ALWAYS** include: id, production_id, created_at, updated_at, version, is_deleted
- ✅ **ALWAYS** add composite index on (production_id, is_deleted)

---

### Layer 2: API Routes (Express + Prisma)

```typescript
// FILE: api/src/routes/entity-name.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { validateProductionExists } from '../utils/validation-helpers';

const router = Router();

// ========================================
// GET all entities for a production
// ========================================
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const entities = await prisma.entity_name.findMany({
      where: {
        production_id: req.params.productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    // MANDATORY: Transform to camelCase before sending
    res.json(toCamelCase(entities));
  } catch (error: any) {
    console.error('❌ GET entities error:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// ========================================
// POST create entity
// ========================================
router.post('/', async (req: Request, res: Response) => {
  try {
    // Extract metadata that should NOT be transformed
    const { productionId, userId, userName, ...entityData } = req.body;
    
    // MANDATORY: Validate production exists
    await validateProductionExists(productionId);
    
    // Transform to snake_case for database
    const snakeCaseData = toSnakeCase(entityData);
    
    // Create in database
    const entity = await prisma.entity_name.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        version: 1,
        is_deleted: false
      }
    });
    
    // MANDATORY: Transform to camelCase
    const camelCaseEntity = toCamelCase(entity);
    
    // MANDATORY: Broadcast via WebSocket
    io.to(`production:${productionId}`).emit('entity:created', {
      entityType: 'entity-name',
      entityId: entity.id,
      entity: camelCaseEntity,
      userId,
      userName
    });
    
    // Return transformed data
    res.status(201).json(camelCaseEntity);
  } catch (error: any) {
    console.error('❌ Create entity error:', error);
    res.status(500).json({ error: 'Failed to create entity' });
  }
});

// ========================================
// PUT update entity
// ========================================
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...entityData } = req.body;
    const snakeCaseData = toSnakeCase(entityData);
    
    // Update with version increment
    const entity = await prisma.entity_name.update({
      where: { id: req.params.id },
      data: {
        ...snakeCaseData,
        version: { increment: 1 },
        updated_at: new Date()
      }
    });
    
    const camelCaseEntity = toCamelCase(entity);
    
    // MANDATORY: Broadcast update
    io.to(`production:${entity.production_id}`).emit('entity:updated', {
      entityType: 'entity-name',
      entityId: entity.id,
      entity: camelCaseEntity,
      userId,
      userName
    });
    
    res.json(camelCaseEntity);
  } catch (error: any) {
    console.error('❌ Update entity error:', error);
    res.status(500).json({ error: 'Failed to update entity' });
  }
});

// ========================================
// DELETE entity (soft delete)
// ========================================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.query;
    
    const entity = await prisma.entity_name.update({
      where: { id: req.params.id as string },
      data: {
        is_deleted: true,
        version: { increment: 1 }
      }
    });
    
    // MANDATORY: Broadcast deletion
    io.to(`production:${entity.production_id}`).emit('entity:deleted', {
      entityType: 'entity-name',
      entityId: entity.id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Delete entity error:', error);
    res.status(500).json({ error: 'Failed to delete entity' });
  }
});

export default router;
```

**RULES:**
- ✅ **ALWAYS** use `toCamelCase()` before sending to client
- ✅ **ALWAYS** use `toSnakeCase()` before saving to database
- ✅ **ALWAYS** broadcast WebSocket events as `entity:created/updated/deleted`
- ❌ **NEVER** broadcast as `source:created` or `camera:created` (entity-specific)
- ✅ **ALWAYS** include entityType in broadcast payload for filtering
- ✅ **ALWAYS** transform WebSocket payload to camelCase
- ❌ **NEVER** use sync-helpers.ts that creates wrong event names

---

### Layer 3: Frontend API Hooks

```typescript
// FILE: src/hooks/useEntityNameAPI.ts
import { useCallback } from 'react';
import { api } from '@/services/api';
import type { EntityName } from '@/types';

export const useEntityNameAPI = () => {
  const fetchEntities = useCallback(async (productionId: string): Promise<EntityName[]> => {
    const response = await api.get(`/entity-name/production/${productionId}`);
    return response.data; // Already camelCase from API
  }, []);
  
  const createEntity = useCallback(async (
    productionId: string,
    data: Partial<EntityName>,
    userId: string,
    userName: string
  ): Promise<EntityName> => {
    const response = await api.post('/entity-name', {
      ...data,
      productionId,
      userId,
      userName
    });
    return response.data; // Already camelCase from API
  }, []);
  
  const updateEntity = useCallback(async (
    id: string,
    data: Partial<EntityName>,
    userId: string,
    userName: string
  ): Promise<EntityName> => {
    const response = await api.put(`/entity-name/${id}`, {
      ...data,
      userId,
      userName
    });
    return response.data;
  }, []);
  
  const deleteEntity = useCallback(async (
    id: string,
    productionId: string,
    userId: string,
    userName: string
  ): Promise<void> => {
    await api.delete(`/entity-name/${id}?userId=${userId}&userName=${userName}`);
  }, []);
  
  return {
    fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity
  };
};
```

**RULES:**
- ✅ **ALWAYS** send camelCase to API
- ✅ **ALWAYS** receive camelCase from API
- ❌ **NEVER** transform case in frontend
- ✅ **ALWAYS** include userId and userName in mutations

---

### Layer 4: Frontend Pages

```typescript
// FILE: src/pages/EntityName.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEntityNameAPI } from '@/hooks/useEntityNameAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import type { EntityName } from '@/types';

export const EntityNamePage: React.FC = () => {
  const { activeProject } = useProjectStore();
  const oldStore = useProductionStore();
  const entityAPI = useEntityNameAPI();
  
  // Local state (synced via WebSocket)
  const [entities, setEntities] = useState<EntityName[]>([]);
  
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  const userId = oldStore.userId || 'user-unknown';
  const userName = oldStore.userName || 'Unknown User';
  
  // Load entities on mount
  useEffect(() => {
    if (!productionId) return;
    
    entityAPI.fetchEntities(productionId)
      .then(setEntities)
      .catch(console.error);
  }, [productionId, entityAPI]);
  
  // WebSocket sync
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType !== 'entity-name') return;
      
      setEntities(prev => {
        // Prevent duplicates using id (PK)
        if (prev.some(e => e.id === event.entity.id)) {
          console.log('⚠️ Duplicate detected - skipping');
          return prev;
        }
        return [...prev, event.entity];
      });
    }, []),
    
    onEntityUpdated: useCallback((event) => {
      if (event.entityType !== 'entity-name') return;
      
      setEntities(prev => prev.map(e => 
        e.id === event.entity.id ? event.entity : e
      ));
    }, []),
    
    onEntityDeleted: useCallback((event) => {
      if (event.entityType !== 'entity-name') return;
      
      setEntities(prev => prev.filter(e => e.id !== event.entityId));
    }, [])
  });
  
  // CRUD handlers
  const handleCreate = async (data: Partial<EntityName>) => {
    try {
      // Optimistic update
      const tempEntity = { ...data, id: 'temp-' + Date.now() } as EntityName;
      setEntities(prev => [...prev, tempEntity]);
      
      // API call (WebSocket will broadcast to other clients)
      const created = await entityAPI.createEntity(productionId, data, userId, userName);
      
      // Replace temp with real
      setEntities(prev => prev.map(e => 
        e.id === tempEntity.id ? created : e
      ));
    } catch (error) {
      // Rollback optimistic update
      setEntities(prev => prev.filter(e => e.id !== tempEntity.id));
      console.error('Failed to create entity:', error);
    }
  };
  
  const handleUpdate = async (id: string, data: Partial<EntityName>) => {
    try {
      await entityAPI.updateEntity(id, data, userId, userName);
      // WebSocket will update state automatically
    } catch (error) {
      console.error('Failed to update entity:', error);
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      await entityAPI.deleteEntity(id, productionId, userId, userName);
      // WebSocket will update state automatically
    } catch (error) {
      console.error('Failed to delete entity:', error);
    }
  };
  
  return (
    // ... UI components
  );
};
```

**RULES:**
- ✅ **ALWAYS** use local state for entities (not global store for entity lists)
- ✅ **ALWAYS** sync via useProductionEvents WebSocket listeners
- ✅ **ALWAYS** filter by entityType in WebSocket handlers
- ✅ **ALWAYS** use `id` field (PK) for duplicate checks and matching
- ❌ **NEVER** use `uuid` field (doesn't exist in most tables)
- ✅ **ALWAYS** implement optimistic updates for better UX
- ✅ **ALWAYS** rollback optimistic updates on error
- ❌ **NEVER** manually update state after API call if WebSocket is working

---

## 🛡️ ENFORCEMENT MECHANISMS

### Mechanism 1: Automated Validation Script

```bash
# FILE: scripts/validate-entity-pattern.sh
#!/bin/bash

echo "🔍 Validating Entity Data Flow Pattern..."

# Check 1: Verify all routes use toCamelCase before res.json
echo "Checking API routes for toCamelCase usage..."
MISSING_TRANSFORM=$(grep -r "res\.json" api/src/routes/*.ts | grep -v "toCamelCase" | grep -v "error" | grep -v "success")
if [ ! -z "$MISSING_TRANSFORM" ]; then
  echo "❌ Found routes without toCamelCase:"
  echo "$MISSING_TRANSFORM"
  exit 1
fi

# Check 2: Verify WebSocket events use generic pattern
echo "Checking WebSocket event names..."
WRONG_EVENTS=$(grep -r "\.emit\(" api/src/routes/*.ts | grep -E "(source|camera|send|ccu):created" | grep -v "production:")
if [ ! -z "$WRONG_EVENTS" ]; then
  echo "❌ Found entity-specific event names (should be entity:created):"
  echo "$WRONG_EVENTS"
  exit 1
fi

# Check 3: Verify frontend doesn't use uuid
echo "Checking frontend for uuid references..."
UUID_REFS=$(grep -r "\.uuid" src/pages/*.tsx | grep -v "//")
if [ ! -z "$UUID_REFS" ]; then
  echo "⚠️  Found uuid references in frontend (use .id instead):"
  echo "$UUID_REFS"
fi

# Check 4: Verify sync-helpers not used
SYNC_HELPERS=$(grep -r "broadcastEntity" api/src/routes/*.ts)
if [ ! -z "$SYNC_HELPERS" ]; then
  echo "⚠️  Found sync-helpers usage (emit directly instead):"
  echo "$SYNC_HELPERS"
fi

echo "✅ Validation complete"
```

### Mechanism 2: TypeScript Interface Enforcement

```typescript
// FILE: src/types/entity-standard.ts

/**
 * Standard entity fields that MUST exist on all entities
 */
export interface StandardEntityFields {
  id: string;              // PRIMARY KEY: user-friendly, NOT uuid
  productionId: string;    // FK to productions (camelCase from API)
  createdAt: string;       // ISO string from API
  updatedAt: string;       // ISO string from API
  version: number;
  isDeleted: boolean;
}

/**
 * Standard WebSocket event payload
 */
export interface EntityEvent {
  entityType: string;      // Must be: 'source', 'camera', 'send', etc.
  entityId: string;         // The entity's id field
  entity: any;             // The full entity object (camelCase)
  userId: string;
  userName: string;
}

// Force all entity types to extend this
export interface Source extends StandardEntityFields {
  name: string;
  type: string;
  // ... other fields
}

export interface Camera extends StandardEntityFields {
  name: string;
  model: string;
  // ... other fields
}
```

### Mechanism 3: Git Pre-Commit Hook

```bash
# FILE: .git/hooks/pre-commit
#!/bin/bash

# Run validation before allowing commit
./scripts/validate-entity-pattern.sh
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Entity pattern validation failed"
  echo "Fix violations before committing"
  exit 1
fi

echo "✅ Entity pattern validation passed"
```

---

## 🔧 MIGRATION PLAN - Fix Existing Violations

### Phase 1: Fix sync-helpers.ts (CRITICAL)

**Problem:** Creates entity-specific event names instead of generic

```typescript
// CURRENT (WRONG):
export function broadcastEntityCreated(options: BroadcastOptions): void {
  const event = `${entityType}:created`;  // Creates "source:created"
  io.to(room).emit(event, data);
}

// FIX:
export function broadcastEntityCreated(options: BroadcastOptions): void {
  const event = 'entity:created';  // Generic event
  const payload = {
    entityType: options.entityType,  // Include type in payload
    entityId: options.entityId,
    entity: options.data,
    ...options.metadata
  };
  io.to(room).emit(event, payload);
}
```

### Phase 2: Update All Routes Using sync-helpers

**Files to update:**
- sources.ts
- sends.ts
- ccus.ts
- connections.ts
- checklist-items.ts
- ip-addresses.ts

**Pattern:**
```typescript
// BEFORE:
broadcastEntityCreated({
  io,
  productionId,
  entityType: 'source',
  entityId: source.id,
  data: camelCaseSource
});

// AFTER (Option A: Direct emit):
io.to(`production:${productionId}`).emit('entity:created', {
  entityType: 'source',
  entityId: source.id,
  entity: camelCaseSource,
  userId,
  userName
});

// AFTER (Option B: Fixed sync-helper):
broadcastEntityCreated({
  io,
  productionId,
  entityType: 'source',
  entityId: source.id,
  data: camelCaseSource,
  metadata: { userId, userName }
});
```

### Phase 3: Remove UUID References from Frontend

**Files to update:**
- Sources.tsx (lines 75, 89, 96)
- Any other pages checking `.uuid`

**Change:**
```typescript
// BEFORE:
if (prev.some(s => s.uuid === event.entity.uuid)) return prev;

// AFTER:
if (prev.some(s => s.id === event.entity.id)) return prev;
```

### Phase 4: Add Validation to CI/CD

```yaml
# FILE: .github/workflows/validate.yml
name: Entity Pattern Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run validation
        run: ./scripts/validate-entity-pattern.sh
```

---

## 📋 CHECKLIST - Creating New Entity

When adding a new entity type, verify ALL steps:

### Database Schema
- [ ] Uses snake_case for all fields
- [ ] Has `id` as @id (PRIMARY KEY)
- [ ] Has production_id FK
- [ ] Has created_at, updated_at, version, is_deleted
- [ ] Has composite index on (production_id, is_deleted)

### API Route
- [ ] Uses toCamelCase() before res.json()
- [ ] Uses toSnakeCase() before database operations
- [ ] Emits generic `entity:created/updated/deleted` events
- [ ] Includes entityType in WebSocket payload
- [ ] Validates production exists
- [ ] Implements soft delete (is_deleted)

### Frontend Hook
- [ ] Sends camelCase to API
- [ ] Does NOT transform received data
- [ ] Includes userId, userName in mutations

### Frontend Page
- [ ] Uses local state for entity list
- [ ] Uses useProductionEvents for sync
- [ ] Filters by entityType in WebSocket handlers
- [ ] Uses .id for duplicate checks (NOT .uuid)
- [ ] Implements optimistic updates
- [ ] Implements rollback on error

### Testing
- [ ] Create entity in Browser A → appears in Browser B
- [ ] Update entity in Browser A → updates in Browser B
- [ ] Delete entity in Browser A → removes in Browser B
- [ ] Refresh Browser A → entity persists correctly
- [ ] No duplicate entries after sync
- [ ] No race conditions in state updates

---

## 🔑 UUID vs ID Management - Critical Patterns

**Updated:** February 25, 2026  
**Context:** Lessons from Computers/Sources duplicate button implementation

### The Dual Identifier System

VideoDept uses **two distinct identifiers** for entities:

#### 1. `uuid` - Immutable Backend Identifier
- **Type:** UUID v4 string (e.g., `"e9b1f0ad-d11d-486e-8940-30daa9fbdfc0"`)
- **Purpose:** Internal database PRIMARY KEY
- **Generation:** **ALWAYS** generated by backend (database or API)
- **Lifecycle:** Created on insert, NEVER changes, unique forever
- **Usage:** 
  - Entity relationships in database
  - WebSocket duplicate detection (`if (prev.some(s => s.uuid === event.entity.uuid))`)
  - Update/delete operations (`updateSource(uuid, data)`)
  - Internal state management

#### 2. `id` - User-Facing Display Identifier
- **Type:** Human-readable string (e.g., `"SRC 1"`, `"CAM 3"`)
- **Purpose:** User interface display and identification
- **Generation:** Frontend generates via `Service.generateId(existingEntities)`
- **Lifecycle:** User-controlled, CAN be edited, may have duplicates
- **Usage:**
  - Display in UI cards and lists
  - User communication ("Check SRC 1")
  - Sorting and filtering
  - Duplicate button operations (find by id, not uuid)

### ⚠️ CRITICAL RULES

#### Frontend MUST NEVER:
- ❌ Set or modify `uuid` field
- ❌ Send `uuid` in create operations
- ❌ Generate uuid values (use `undefined` for new records)
- ❌ Use `id` for uniqueness checks in WebSocket handlers
- ❌ Use `uuid` for display purposes

#### Frontend MUST ALWAYS:
- ✅ Check `if (editingEntity?.uuid)` to detect update vs create
- ✅ Use `uuid` for duplicate detection in WebSocket handlers
- ✅ Use `uuid` for update/delete API calls
- ✅ Use `id` for display and user interactions
- ✅ Set `uuid: undefined` when duplicating records
- ✅ Generate new `id` when duplicating records

#### Backend MUST ALWAYS:
- ✅ Generate `uuid` for new records (using `uuid_generate_v4()` or library)
- ✅ Return `uuid` in all API responses
- ✅ Use `uuid` as WHERE clause in UPDATE/DELETE
- ✅ Allow duplicate `id` values (user-controlled field)

### 🎯 Duplicate Button Pattern (Proven)

When implementing duplicate functionality, follow this exact pattern:

```typescript
const handleDuplicate = (sourceId: string) => {
  console.log('🔄 Duplicating source:', sourceId);
  
  // Step 1: Find the source to duplicate by DISPLAY ID
  const sourceToDuplicate = sources.find(s => s.id === sourceId);
  if (!sourceToDuplicate) {
    console.error('Source not found:', sourceId);
    return;
  }
  
  // Step 2: Generate NEW unique display ID
  const newId = SourceService.generateId(sources);
  
  // Step 3: Create template WITHOUT uuid (backend will generate new one)
  const duplicateTemplate = {
    ...sourceToDuplicate,
    uuid: undefined,  // CRITICAL: Remove uuid so backend generates new
    id: newId,        // New display ID
    name: `${sourceToDuplicate.name} (Copy)`,
  } as Source;
  
  // Step 4: Pre-populate modal - let existing save handler create via API
  setEditingSource(duplicateTemplate);
  setIsModalOpen(true);
};
```

**Why This Works:**
1. Modal checks `if (editingSource?.uuid)` to determine create vs update
2. No `uuid` → Modal treat as NEW record
3. Calls `createSource()` API without uuid
4. Backend generates fresh uuid in database
5. Returns new entity with backend-generated uuid
6. WebSocket broadcasts creation to other clients

### 🔍 Common Pitfalls We've Fixed

#### ❌ WRONG: Setting uuid to undefined causes NULL constraint errors
```typescript
// DON'T send id as undefined - backend needs it!
const duplicateTemplate = {
  ...source,
  uuid: undefined,
  id: undefined,  // ❌ WRONG - causes database NULL constraint violation
};
await createSource(duplicateTemplate);
```

#### ✅ CORRECT: Generate new id, remove uuid
```typescript
const newId = SourceService.generateId(sources);
const duplicateTemplate = {
  ...source,
  uuid: undefined,  // Backend generates
  id: newId,        // Frontend generates
};
await createSource(duplicateTemplate);
```

#### ❌ WRONG: Using id for uniqueness in WebSocket
```typescript
// DON'T use id - allows duplicates!
if (prev.some(s => s.id === event.entity.id)) return prev;
```

#### ✅ CORRECT: Always use uuid for uniqueness
```typescript
// Use uuid - guaranteed unique
if (prev.some(s => s.uuid === event.entity.uuid)) return prev;
```

#### ❌ WRONG: Trying to update by id
```typescript
await sourcesAPI.updateSource(source.id, data);  // ❌ May match multiple
```

#### ✅ CORRECT: Always update by uuid
```typescript
await sourcesAPI.updateSource(source.uuid, data);  // ✅ Guaranteed unique
```

### 📋 Validation Checklist

When implementing new entity pages, verify:

- [ ] Database schema uses `uuid` as PRIMARY KEY (PostgreSQL UUID type)
- [ ] `id` field exists as separate user-friendly identifier (TEXT type)
- [ ] Create API route does NOT expect `uuid` in request body
- [ ] Create API route RETURNS `uuid` in response
- [ ] Update API route accepts `/:uuid` not `/:id`
- [ ] Delete API route accepts `/:uuid` not `/:id`
- [ ] Modal checks `if (editingEntity?.uuid)` to determine mode
- [ ] Duplicate handler sets `uuid: undefined`
- [ ] Duplicate handler generates new `id` via Service.generateId()
- [ ] WebSocket handlers use `uuid` for duplicate detection
- [ ] UI displays `id` field, not `uuid`
- [ ] Update/delete buttons pass `uuid` not `id`

---

## 🔗 RELATIONSHIP ARCHITECTURE - Cross-Entity References

**Updated:** February 28, 2026  
**Context:** Establishing patterns for signal flow and inter-entity connections

### The Dual-Storage Principle

When entities reference other entities (e.g., camera → CCU, source → router input), VideoDept uses **both UUID and ID** for optimal database integrity and user experience.

### Architecture Decision

```
DATABASE RELATIONSHIPS → Use uuid (foreign keys, Prisma relations)
USER DISPLAY & QUERIES → Store both uuid AND id (redundant but performant)
```

### Why Both Fields?

#### UUID Foreign Key Benefits:
- ✅ **Stable relationships**: Survives user ID changes (e.g., "CAM 1" → "CAM 5")
- ✅ **Database integrity**: Prisma enforces referential integrity
- ✅ **Cascading deletes**: Works correctly with `onDelete: Cascade`
- ✅ **Fast joins**: Indexed UUID lookups are efficient

#### Display ID Storage Benefits:
- ✅ **No joins needed**: UI can show "SRC 1 → RTR 3 IN2" without querying related tables
- ✅ **User communication**: Easy to reference in logs, error messages, UI
- ✅ **Performance**: Reduces database load for display operations
- ✅ **Sorting/filtering**: Can sort by user-friendly ID without joins

### Database Schema Pattern

```prisma
model cameras {
  uuid         String   @id  // Primary key
  id           String        // User-friendly display ID (e.g., "CAM 1")
  ccu_uuid     String?       // FK for Prisma relationship
  ccu_id       String?       // Display field (redundant storage)
  
  ccus         ccus?    @relation(fields: [ccu_uuid], references: [uuid])
  
  @@index([ccu_uuid])  // Index the FK for performance
}

model connections {
  uuid              String   @id
  
  // Source side - dual storage
  source_uuid       String?  // For FK relationship & updates
  source_id         String?  // For display "SRC 1"
  source_output_id  String?  // Output identifier "OUT 2"
  
  // Destination side - dual storage
  destination_type  String   // "router" | "switcher" | etc.
  destination_uuid  String?  // For FK relationship
  destination_id    String?  // For display "RTR 1"
  
  sources           sources? @relation(fields: [source_uuid], references: [uuid])
  
  @@index([source_uuid])
}
```

### Signal Flow Example

When connecting a media server output to a router input:

```typescript
// Connection object
{
  uuid: "abc-123-def",  // Backend generates
  
  // Source (Media Server)
  sourceType: "media-server",
  sourceUuid: "ms-uuid-here",      // For database relationship
  sourceId: "MEDIA 1A",             // For UI display
  sourceOutputId: "OUT 2",          // Which output
  
  // Destination (Router)
  destinationType: "router",
  destinationUuid: "rtr-uuid-here", // For database relationship
  destinationId: "RTR 1",           // For UI display
  destinationInputId: "IN 3",       // Which input
  
  // Connection details
  signalFormat: {
    hRes: 1920,
    vRes: 1080,
    rate: 59.94
  },
  
  note: "Program feed"
}
```

### Frontend Display Pattern

```typescript
// Efficient display without joins
const ConnectionCard = ({ connection }) => (
  <Card>
    {/* No database query needed - all display data stored */}
    <div>
      {connection.sourceId} {connection.sourceOutputId} 
      → 
      {connection.destinationId} {connection.destinationInputId}
    </div>
    
    <div className="text-muted">
      {connection.signalFormat.hRes}×{connection.signalFormat.vRes} 
      @ {connection.signalFormat.rate}Hz
    </div>
  </Card>
);

// Update/delete operations use UUID
const handleDisconnect = async (connection) => {
  await api.deleteConnection(connection.uuid);  // Use UUID for mutation
};

const handleUpdateFormat = async (connection, newFormat) => {
  await api.updateConnection(connection.uuid, { // Use UUID for mutation
    signalFormat: newFormat
  });
};
```

### Update Propagation Rules

When a user renames an entity (e.g., "CAM 1" → "CAM 5"), the system must update redundant ID storage:

```typescript
// API route: PUT /api/cameras/:uuid
router.put('/:uuid', async (req, res) => {
  const { uuid } = req.params;
  const { id: newId, ...otherUpdates } = req.body;
  
  await prisma.$transaction(async (tx) => {
    // 1. Update the camera itself
    await tx.cameras.update({
      where: { uuid },
      data: { id: newId, ...otherUpdates }
    });
    
    // 2. Update all references to this camera's ID
    await tx.connections.updateMany({
      where: { source_uuid: uuid, source_type: 'camera' },
      data: { source_id: newId }  // Update redundant storage
    });
    
    // 3. Update any CCU references
    await tx.ccus.updateMany({
      where: { camera_uuid: uuid },
      data: { camera_id: newId }
    });
  });
  
  // Broadcast update via WebSocket
  io.to(productionId).emit('entity:updated', {
    entityType: 'camera',
    entity: updatedCamera
  });
});
```

### ⚠️ CRITICAL RULES

#### When Creating Relationships:
- ✅ **ALWAYS** store both `xxx_uuid` (for FK) and `xxx_id` (for display)
- ✅ **ALWAYS** use `xxx_uuid` for Prisma `@relation(fields:)`
- ✅ **ALWAYS** add index on `xxx_uuid` foreign key fields
- ❌ **NEVER** use `xxx_id` alone for relationships (can't enforce integrity)

#### When Updating Entities:
- ✅ **ALWAYS** use UUID for the WHERE clause
- ✅ **IF** updating `id` field, propagate to all tables storing `xxx_id`
- ✅ **USE** database transactions for multi-table updates
- ✅ **BROADCAST** single WebSocket event after transaction commits

#### When Displaying Relationships:
- ✅ **USE** stored `xxx_id` fields for display (no joins needed)
- ✅ **USE** UUID for click actions (edit, delete, navigate)
- ❌ **NEVER** display UUID to users (show user-friendly ID)

### Database Migration Pattern

When adding a new relationship field to existing table:

```sql
-- Step 1: Add both UUID and ID fields
ALTER TABLE connections 
  ADD COLUMN intermediate_uuid VARCHAR,
  ADD COLUMN intermediate_id VARCHAR,
  ADD COLUMN intermediate_type VARCHAR;

-- Step 2: Add foreign key constraint
ALTER TABLE connections
  ADD CONSTRAINT fk_intermediate_router
  FOREIGN KEY (intermediate_uuid) 
  REFERENCES routers(uuid)
  ON DELETE SET NULL;

-- Step 3: Add index for performance
CREATE INDEX idx_connections_intermediate_uuid 
  ON connections(intermediate_uuid);

-- Step 4: Backfill data for existing records (if needed)
UPDATE connections c
SET 
  intermediate_uuid = r.uuid,
  intermediate_id = r.id,
  intermediate_type = 'router'
FROM routers r
WHERE c.intermediate_legacy_id = r.id;
```

### Testing Checklist

When implementing cross-entity relationships:

- [ ] Database schema has both `xxx_uuid` (FK) and `xxx_id` (display)
- [ ] Prisma relation uses `xxx_uuid` field
- [ ] Index created on `xxx_uuid` field
- [ ] Create operation stores both UUID and ID
- [ ] Update operation on source entity propagates to `xxx_id` fields
- [ ] Delete operation correctly cascades or nullifies
- [ ] UI displays `xxx_id` without database joins
- [ ] Update/delete buttons use `xxx_uuid`
- [ ] WebSocket broadcasts trigger UI refresh
- [ ] ID rename propagates to all referencing tables

### Performance Considerations

**Why redundant storage is acceptable:**

1. **Query Speed**: `SELECT * FROM connections` shows full display data without 3+ joins
2. **UI Responsiveness**: No waiting for related entity lookups
3. **Database Load**: Fewer joins = less CPU on database server
4. **Scalability**: Read-heavy workload benefits from denormalization
5. **Storage Cost**: VARCHAR(50) × 2 per relation is negligible vs. query overhead

**Trade-off accepted:**
- Extra ~50 bytes per relationship record
- Update logic must maintain consistency
- Database transactions ensure atomicity

### Signal Flow Implementation Guidance

For the upcoming signal flow features, apply this pattern:

```typescript
// Source outputs
interface SourceOutput {
  uuid: string;          // Generated by backend
  id: string;            // "OUT 1", "OUT 2", etc.
  sourceUuid: string;    // Parent source FK
  sourceId: string;      // "SRC 1" (redundant)
  connector: string;     // "HDMI", "SDI", etc.
  signalFormat: Format;  // Resolution, rate, etc.
}

// Router inputs
interface RouterInput {
  uuid: string;
  id: string;            // "IN 1", "IN 2", etc.
  routerUuid: string;    // Parent router FK
  routerId: string;      // "RTR 1" (redundant)
  connectedTo?: {
    outputUuid: string;  // Connected output FK
    outputId: string;    // "SRC 1 OUT 2" (redundant)
    sourceUuid: string;  // Ultimate source FK
    sourceId: string;    // "SRC 1" (redundant)
  };
}

// Display component - no joins needed
<RouterCard router={router}>
  {router.inputs.map(input => (
    <div>
      {input.id}: 
      {input.connectedTo 
        ? `${input.connectedTo.sourceId} ${input.connectedTo.outputId}`
        : 'Not connected'
      }
    </div>
  ))}
</RouterCard>
```

---

## 🎯 SUCCESS CRITERIA

**This standard is successful when:**

1. ✅ All entities follow identical pattern
2. ✅ No UUID/ID confusion issues
3. ✅ WebSocket sync works for all entities without debugging
4. ✅ New entities can be added in <30 minutes
5. ✅ Zero circular bug reports ("we fixed this before")
6. ✅ Validation script passes on all commits
7. ✅ New AI agents can generate correct code from this doc alone
8. ✅ **Cross-entity relationships use dual storage (UUID + ID)**
9. ✅ **Signal flow connections display without joins**
10. ✅ **ID renames propagate to all referencing tables**

---

## 📚 REFERENCES

- [Prisma Schema](../video-production-manager/api/prisma/schema.prisma) - cameras (line 12), ccus (line 43), connections (line 296)
- [PROJECT_RULES.md](../video-production-manager/docs/PROJECT_RULES.md#data-flow-architecture---critical-patterns) - Lines 369-600 (Data Flow Architecture)
- [DATA_FLOW_ANALYSIS.md](../docs/architecture-decisions/DATA_FLOW_ANALYSIS.md) - Detailed flow analysis  
- [DATABASE_FIRST_ARCHITECTURE.md](../docs/architecture-decisions/DATABASE_FIRST_ARCHITECTURE.md) - Railway PostgreSQL as primary storage
- [DEVLOG.md](../video-production-manager/DEVLOG.md) - Feb 12 camera sync fix (Bug 3.2), Feb 27 relationship patterns
- [caseConverter.ts](../video-production-manager/api/src/utils/caseConverter.ts) - Transform functions

---

**Last Updated:** February 28, 2026 (Added Relationship Architecture section)  
**Next Review:** When adding new entity types, relationships, or experiencing sync issues  
**Enforcement:** MANDATORY for all new code, migration required for existing code
