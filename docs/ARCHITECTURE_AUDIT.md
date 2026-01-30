# Video Production Manager - Architecture Audit

## Executive Summary

**Current State:** Partially migrated to event sourcing. Some entities use modern API + events, others use legacy store pattern.

**Reusability Score:** 7/10 - Good patterns established, but inconsistent implementation

**Migration Status:** 40% complete

---

## Entity Migration Matrix

| Entity | Database Model | API Route | API Hook | Frontend Page | Real-time Events | Status |
|--------|---------------|-----------|----------|---------------|------------------|---------|
| **Sources** | ✅ Source | ✅ /api/sources | ✅ useSourcesAPI | ✅ Sources.tsx | ✅ Yes | **COMPLETE** |
| **Sends** | ✅ Send | ✅ /api/sends | ✅ useSendsAPI | ✅ Sends.tsx | ✅ Yes | **COMPLETE** |
| **Cameras** | ✅ Camera | ✅ /api/cameras | ✅ useCamerasAPI | ✅ Cameras.tsx | ✅ Yes | **COMPLETE** |
| **CCUs** | ✅ CCU | ✅ /api/ccus | ✅ useCCUsAPI | ✅ CCUs.tsx | ✅ Yes | **COMPLETE** |
| **Computers** | ✅ Source (type filter) | ✅ /api/sources | ✅ useSourcesAPI | ✅ Computers.tsx | ✅ Yes | **COMPLETE** |
| **Productions** | ✅ Production | ✅ /api/productions | ✅ apiClient methods | ✅ Projects.tsx | ✅ Yes | **COMPLETE** |
| Media Servers | ❌ None | ❌ None | ❌ None | ⚠️ MediaServers.tsx | ❌ No | **NOT STARTED** |
| Routers | ❌ None | ❌ None | ❌ None | ⚠️ Routers.tsx | ❌ No | **NOT STARTED** |
| Cable Snakes | ❌ None | ❌ None | ❌ None | ⚠️ Snakes.tsx | ❌ No | **NOT STARTED** |
| Records/Streams | ❌ None | ❌ None | ❌ None | ⚠️ Records/Streams.tsx | ❌ No | **NOT STARTED** |
| **IP Addresses** | ✅ IPAddress | ❌ None | ❌ None | ⚠️ IPManagement.tsx | ❌ No | **DATABASE ONLY** |
| **Checklist** | ✅ ChecklistItem | ❌ None | ❌ None | ⚠️ Checklist.tsx | ❌ No | **DATABASE ONLY** |
| **Connections** | ✅ Connection | ❌ None | ❌ None | ❌ None | ❌ No | **DATABASE ONLY** |
| **Equipment** | ✅ EquipmentSpec | ✅ /api/equipment | ✅ apiClient methods | ✅ Equipment.tsx | ❌ No | **NO EVENTS** |

---

## Architecture Patterns Analysis

### ✅ **GOOD PATTERNS (Reusable & Consistent)**

#### 1. **API Route Pattern** (sources.ts, sends.ts, cameras.ts, ccus.ts)
```typescript
// Standard CRUD with event recording + WebSocket broadcasting
router.get('/production/:productionId', async (req, res) => {
  const entities = await prisma.entity.findMany({ where: { productionId, isDeleted: false }});
  res.json(entities);
});

router.post('/', async (req, res) => {
  const entity = await prisma.entity.create({ data: req.body });
  await recordEvent({ productionId, eventType, operation: CREATE, entityId, entityData: entity });
  io.to(`production:${productionId}`).emit('entity:created', { entityType, entity, userId, userName });
  res.status(201).json(entity);
});

router.put('/:id', async (req, res) => {
  // Version check for conflict detection
  if (current.version !== clientVersion) return res.status(409).json({ conflict });
  const updated = await prisma.entity.update({ data: { ...updates, version: clientVersion + 1 }});
  await recordEvent({ operation: UPDATE, changes: calculateDiff(current, updated) });
  io.to(`production:${productionId}`).emit('entity:updated', { entityType, entity: updated });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  await prisma.entity.update({ where: { id }, data: { isDeleted: true }});
  await recordEvent({ operation: DELETE });
  io.to(`production:${productionId}`).emit('entity:deleted', { entityType, entityId });
  res.json({ success: true });
});
```

**Reusability:** 9/10 - This pattern is highly reusable. To add a new entity:
1. Copy/paste a route file (e.g., sends.ts → routers.ts)
2. Find/replace entity name
3. Register route in server.ts
4. Done in <5 minutes

#### 2. **API Hook Pattern** (useSourcesAPI, useSendsAPI, etc.)
```typescript
export function useEntityAPI() {
  const fetchEntities = useCallback(async (productionId: string) => {
    return await apiClient.get<Entity[]>(`/entities/production/${productionId}`);
  }, []);

  const createEntity = useCallback(async (input: EntityInput) => {
    const { userId, userName } = getUserInfo();
    return await apiClient.post<Entity>('/entities', { ...input, userId, userName });
  }, []);

  const updateEntity = useCallback(async (id: string, updates: Partial<Entity>) => {
    try {
      return await apiClient.put<Entity>(`/entities/${id}`, { ...updates, version });
    } catch (err) {
      if (err.response?.status === 409) return { error: 'Conflict', ...err.response.data };
      throw err;
    }
  }, []);

  const deleteEntity = useCallback(async (id: string) => {
    return await apiClient.delete(`/entities/${id}`);
  }, []);

  return { fetchEntities, createEntity, updateEntity, deleteEntity };
}
```

**Reusability:** 9/10 - Consistent pattern across all entity types

#### 3. **Frontend Page Pattern** (Sources.tsx, Sends.tsx, Computers.tsx)
```typescript
export const EntityPage: React.FC = () => {
  const entitiesAPI = useEntitiesAPI();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [conflictError, setConflictError] = useState(null);
  
  // Load from API on mount
  useEffect(() => {
    if (productionId) {
      entitiesAPI.fetchEntities(productionId).then(setEntities);
    }
  }, [productionId]);

  // Real-time WebSocket subscriptions
  useProductionEvents({
    productionId,
    onEntityCreated: (event) => {
      if (event.entityType === 'entity') {
        setEntities(prev => [...prev, event.entity]);
      }
    },
    onEntityUpdated: (event) => {
      if (event.entityType === 'entity') {
        setEntities(prev => prev.map(e => e.id === event.entity.id ? event.entity : e));
      }
    },
    onEntityDeleted: (event) => {
      if (event.entityType === 'entity') {
        setEntities(prev => prev.filter(e => e.id !== event.entityId));
      }
    }
  });

  // CRUD handlers with API calls
  const handleSave = async (entity: Entity) => {
    const result = await entitiesAPI.updateEntity(id, entity);
    if ('error' in result && result.error === 'Conflict') {
      setConflictError(result);
      return;
    }
    setEntities(prev => prev.map(e => e.id === id ? entity : e));
  };
  
  // ... UI with conflict detection alert
};
```

**Reusability:** 8/10 - Pattern is consistent but has some boilerplate

#### 4. **WebSocket Event System**
```typescript
// Server-side (in routes after recordEvent)
io.to(`production:${productionId}`).emit('entity:created', {
  entityType: 'source',
  entity,
  userId,
  userName
});

// Client-side (useProductionEvents hook)
useProductionEvents({
  productionId,
  onEntityCreated: (event) => { /* handle */ },
  onEntityUpdated: (event) => { /* handle */ },
  onEntityDeleted: (event) => { /* handle */ }
});
```

**Reusability:** 10/10 - Perfect abstraction, no per-entity code needed

---

### ❌ **BAD PATTERNS (Should Be Refactored)**

#### 1. **Inconsistent API Path Structure**
```typescript
// ❌ HAD: Inconsistent /api/ prefix handling
baseURL: 'http://localhost:3010'           // Missing /api
methods: '/api/sources', '/api/sends'      // Has /api prefix
result: '/api/api/sources' → 404

// ✅ NOW: Consistent structure
baseURL: 'http://localhost:3010/api'
methods: '/sources', '/sends'
result: '/api/sources' ✓
```

**Fixed:** Yes, in this session

#### 2. **Mixed Store/API Pattern**
Some pages use old store methods, others use API hooks:
- ❌ MediaServers.tsx → uses `oldStore.addMediaServer()` → IndexedDB only
- ✅ Sources.tsx → uses `sourcesAPI.createSource()` → Database + Events + WebSocket

**Issue:** Inconsistent behavior, no cross-device sync for non-migrated entities

#### 3. **Manual CRUD in apiClient Helper Methods**
```typescript
// Redundant helper methods that duplicate what hooks do
async getSources(productionId: string) { ... }
async getSource(id: string) { ... }
async createSource(data: any) { ... }
async updateSource(id: string, data: any) { ... }
async deleteSource(id: string) { ... }
// ... repeated for every entity
```

**Better Approach:** Generic typed methods + entity-specific hooks

---

## Reusability Assessment

### Can we easily add Sends signal flow group?

**Answer: YES, with current patterns**

**Step-by-step to add "Routers" entity:**

#### 1. Add Database Model (if not exists)
```prisma
model Router {
  id              String   @id @default(uuid())
  productionId    String   @map("production_id")
  production      Production @relation(fields: [productionId], references: [id])
  name            String
  manufacturer    String?
  model           String?
  inputCount      Int?     @map("input_count")
  outputCount     Int?     @map("output_count")
  note            String?
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  version          Int @default(1)
  isDeleted        Boolean @default(false)
  
  @@map("routers")
  @@index([productionId])
}
```

#### 2. Add EventType enum value
```prisma
enum EventType {
  SOURCE
  SEND
  CAMERA
  CCU
  ROUTER  // ← Add this
  // ...
}
```

#### 3. Create API Route (5 minutes)
```bash
cp api/src/routes/sends.ts api/src/routes/routers.ts
# Find/replace: Send → Router, send → router, sends → routers
```

#### 4. Register Route (1 line)
```typescript
// api/src/server.ts
import routersRouter from './routes/routers';
app.use('/api/routers', routersRouter);
```

#### 5. Create API Hook (5 minutes)
```bash
cp src/hooks/useSendsAPI.ts src/hooks/useRoutersAPI.ts
# Find/replace: Send → Router, send → router, sends → routers
```

#### 6. Update Frontend Page (10 minutes)
```typescript
// src/pages/Routers.tsx
import { useRoutersAPI } from '@/hooks/useRoutersAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';

const routersAPI = useRoutersAPI();
const [routers, setRouters] = useState<Router[]>([]);

useEffect(() => {
  routersAPI.fetchRouters(productionId).then(setRouters);
}, [productionId]);

useProductionEvents({
  productionId,
  onEntityCreated: (e) => { if (e.entityType === 'router') setRouters(p => [...p, e.entity]); },
  onEntityUpdated: (e) => { if (e.entityType === 'router') setRouters(p => p.map(r => r.id === e.entity.id ? e.entity : r)); },
  onEntityDeleted: (e) => { if (e.entityType === 'router') setRouters(p => p.filter(r => r.id !== e.entityId)); }
});
```

**Total Time: ~20 minutes per entity**

---

## Recommendations

### Immediate Priorities

1. **Complete Migration** (High Priority)
   - Add API routes for: IPAddress, ChecklistItem, Connections
   - Migrate MediaServers, Routers, Snakes to use Source/Send pattern (if they're just specialized sources)
   - Add event recording to Equipment API

2. **Create Code Generator** (Medium Priority)
   ```bash
   ./scripts/generate-entity.sh Router router routers ROUTER
   # Generates: route, hook, updates schema enum, updates server.ts
   ```

3. **Refactor apiClient** (Low Priority)
   - Remove redundant helper methods (getSources, getSends, etc.)
   - Keep only generic methods (get, post, put, delete)
   - Let hooks handle entity-specific logic

### Long-term Improvements

1. **Generic EntityPage Component**
   ```typescript
   <EntityPage<Router>
     entityType="router"
     fetchEntities={routersAPI.fetchRouters}
     createEntity={routersAPI.createRouter}
     renderCard={(router) => <RouterCard router={router} />}
   />
   ```

2. **Typed Event System**
   ```typescript
   type EntityEvent<T> = {
     entityType: string;
     entity: T;
     operation: 'CREATE' | 'UPDATE' | 'DELETE';
     userId: string;
     userName: string;
   };
   ```

3. **Batch Operations**
   ```typescript
   routersAPI.batchCreate([router1, router2, router3]);
   // Single DB transaction + single event + single WebSocket broadcast
   ```

---

## Conclusion

**Architecture Quality: B+ (85%)**

✅ **Strengths:**
- Excellent reusable patterns for API routes, hooks, and pages
- Clean event sourcing implementation
- Good separation of concerns
- Real-time sync works well

⚠️ **Weaknesses:**
- Incomplete migration (60% entities not migrated)
- Some inconsistency in URL structure (now fixed)
- Boilerplate code (could use generators)
- No generic components (lots of copy/paste)

**Ready for Sends Group & Signal Flow?**
**YES** - Current patterns are solid. Adding new entity types is straightforward with existing templates. Estimate 20-30 minutes per entity type with current approach, or 5 minutes with a code generator.
