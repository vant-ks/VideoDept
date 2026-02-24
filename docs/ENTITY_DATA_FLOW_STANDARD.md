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

## 🎯 SUCCESS CRITERIA

**This standard is successful when:**

1. ✅ All entities follow identical pattern
2. ✅ No UUID/ID confusion issues
3. ✅ WebSocket sync works for all entities without debugging
4. ✅ New entities can be added in <30 minutes
5. ✅ Zero circular bug reports ("we fixed this before")
6. ✅ Validation script passes on all commits
7. ✅ New AI agents can generate correct code from this doc alone

---

## 📚 REFERENCES

- [PROJECT_RULES.md](../video-production-manager/docs/PROJECT_RULES.md#data-flow-architecture---critical-patterns) - Lines 369-600 (Data Flow Architecture)
- [DATA_FLOW_ANALYSIS.md](../docs/architecture-decisions/DATA_FLOW_ANALYSIS.md) - Detailed flow analysis
- [DEVLOG.md](../video-production-manager/DEVLOG.md) - Feb 12 camera sync fix (Bug 3.2)
- [caseConverter.ts](../video-production-manager/api/src/utils/caseConverter.ts) - Transform functions

---

**Last Updated:** February 21, 2026  
**Next Review:** When adding new entity types or experiencing sync issues  
**Enforcement:** MANDATORY for all new code, migration required for existing code
