# ID Architecture Conflict Investigation - Feb 21, 2026

## 🚨 CRITICAL ISSUE: Architectural Mismatch

**User Statement**: "id should be a non-conflicting property as it is user assignable and editable and was never meant to be a unique property"

**Current Implementation**: `id` is marked as `@id` (PRIMARY KEY) in Prisma schema, which **requires uniqueness**.

**Conflict**: These two facts are **mutually exclusive**. A PRIMARY KEY cannot be non-unique.

---

## 📊 Historical Context

### What Happened (Feb 10, 2026)

From [UUID_MIGRATION_RECOVERY.md](UUID_MIGRATION_RECOVERY.md):

1. **Original Design Intent**:
   - IDs like "CAM 1", "SRC 1", "CCU A" are **user-friendly identifiers**
   - Users can presumably edit them (e.g., rename "CAM 1" to "CAM A")
   - System was designed with UUID as the actual PRIMARY KEY

2. **UUID Migration Attempt**:
   - Schema was changed to use `uuid` as @id (PRIMARY KEY)
   - Code was updated to use uuid fields
   - **BUT**: Migration crashed, database never got uuid columns
   - System was broken - code expected uuid, database had id

3. **Emergency Rollback**:
   - Reverted schema to use `id` as @id (PRIMARY KEY)
   - Removed all uuid references from code
   - **Result**: System works BUT architectural intent is violated

### Decision Made (Feb 10, 2026)

From UUID_MIGRATION_RECOVERY.md line 289:
```
**Question**: Do we actually NEED uuid as primary keys?

**Current system uses:**
- User-friendly IDs like "CAM 1", "CCU A"
- Already handling soft deletes with is_deleted
- Already handling ID conflicts with validation

**Decision Point**: 
- If uuid is critical → Proceed to Phase 3
- If current system works → Skip UUID migration entirely
```

**What was NOT decided**: Whether to fully commit to ID-as-PRIMARY-KEY or add UUID back properly.

---

## 🔍 Current State Analysis

### Database Schema (Prisma)

```prisma
model sources {
  id            String   @id        // ← PRIMARY KEY (must be unique)
  production_id String
  name          String
  type          String
  // ...
}
```

### Frontend Implementation (Sources.tsx lines 75-96)

```typescript
onEntityCreated: useCallback((event) => {
  if (event.entityType === 'source') {
    setSources(prev => {
      // Avoid duplicates using id (PRIMARY KEY)
      if (prev.some(s => s.id === event.entity.id)) {
        console.log('⚠️ Duplicate detected - skipping add');
        return prev;  // ← PREVENTS duplicate IDs
      }
      return [...prev, event.entity];
    });
  }
}, []),

onEntityUpdated: useCallback((event) => {
  if (event.entityType === 'source') {
    setSources(prev => prev.map(s => 
      s.id === event.entity.id ? event.entity : s  // ← Uses ID for matching
    ));
  }
}, []),

onEntityDeleted: useCallback((event) => {
  if (event.entityType === 'source') {
    setSources(prev => prev.filter(s => s.id !== event.entityId));  // ← Uses ID for matching
  }
}, [])
```

### What This Means

**IF** ID is user-editable and non-unique:
- ❌ Cannot be used as PRIMARY KEY in database
- ❌ Cannot be used for duplicate detection in WebSocket handlers
- ❌ Cannot be used for matching in update/delete operations
- ❌ Editing an ID would break all references

**IF** ID is treated as PRIMARY KEY (current reality):
- ✅ Database enforces uniqueness
- ✅ WebSocket handlers work correctly
- ✅ Update/delete operations work correctly
- ❌ **BUT**: Users cannot edit IDs (would violate PRIMARY KEY constraint)
- ❌ **BUT**: Violates stated design intent

---

## 🎯 The Core Question

**From the user**: "id...was never meant to be a unique property"

**But reality**: If ID is not unique, what IS the unique identifier?

### Possible Interpretations

**Interpretation A: ID Should Be Editable Display Name**
- ID is like a "label" or "display name" that users can change
- Something ELSE should be the PRIMARY KEY (uuid? auto-increment?)
- Multiple entities could theoretically have the same ID
- **Requirement**: Need a hidden unique identifier

**Interpretation B: ID Is Unique Within Production**
- ID must be unique within a production (e.g., "SRC 1" only once per show)
- ID can be changed, but new ID must not conflict with existing IDs in that production
- PRIMARY KEY is still technically ID, but with validation
- **Current implementation matches this**

**Interpretation C: ID Was Never Supposed To Be In Database**
- ID is generated client-side for display only
- Database uses UUID or integer as PRIMARY KEY
- ID is computed from actual PK (e.g., "SRC " + sequence_number)
- **Would require major refactor**

---

## 📋 Evidence From Codebase

### 1. Sources API Route (sources.ts)

```typescript
// POST create source
router.post('/', async (req: Request, res: Response) => {
  const { outputs, productionId, userId, userName, category, ...sourceData } = req.body;
  const snakeCaseData = toSnakeCase(sourceData);
  
  await prisma.$executeRaw`
    INSERT INTO sources (
      id, production_id, name, type, ...
    ) VALUES (
      ${snakeCaseData.id},  // ← ID comes from client
      ${productionId},
      ...
    )
  `;
});
```

**Finding**: Client sends ID, API stores it directly as PRIMARY KEY.

### 2. Entity Data Flow Standard (Created Feb 21, 2026)

From [ENTITY_DATA_FLOW_STANDARD.md](../ENTITY_DATA_FLOW_STANDARD.md) line 28:

```
id            String   @id        // PK: user-friendly (e.g., "SRC 1")
```

Line 45:
```
- ✅ **ALWAYS** use `id` as PRIMARY KEY (text, user-friendly like "SRC 1")
- ❌ **NEVER** use `uuid` as PRIMARY KEY (unless explicitly architected system-wide)
```

**Finding**: Standard created TODAY explicitly says to use ID as PRIMARY KEY and NOT use UUID.

### 3. Frontend Sources Page

Sources.tsx uses `id` for:
- Duplicate detection (line 77)
- Update matching (line 89)
- Delete filtering (line 96)

**Finding**: Entire sync system depends on ID being unique.

---

## 🚨 THE CONFLICT

**User's statement** (Feb 21, 2026): "id should be a non-conflicting property as it is user assignable and editable and was never meant to be a unique property"

**Standard created today** (Feb 21, 2026): "ALWAYS use `id` as PRIMARY KEY"

**These are contradictory.**

---

## 🔍 Questions For User

Before we can fix this, we need clarity:

### Question 1: ID Edit Capability
**Can users rename/edit an entity's ID after creation?**
- A) Yes - users can change "SRC 1" to "SRC A" anytime
- B) No - ID is assigned at creation and never changes
- C) Conditional - ID can change but must remain unique within production

### Question 2: ID Uniqueness
**Must IDs be unique within a production?**
- A) Yes - no two sources can have ID "SRC 1" in same production
- B) No - multiple sources could have ID "SRC 1" (distinguished by something else)
- C) Don't know - need to review design intent

### Question 3: Primary Key
**If ID is not the PRIMARY KEY, what should be?**
- A) UUID - add uuid column back as @id (was attempted Feb 10)
- B) Auto-increment integer - add serial id column
- C) Composite key - combination of fields
- D) ID IS the primary key, but it's immutable after creation

### Question 4: Historical Design
**Was there documentation about the original ID design intent?**
- Where can we find the original specification for how IDs should work?
- Were IDs always meant to be user-assigned strings, or generated by system?

---

## 🛠️ Possible Solutions (Pending Answers)

### Solution 1: ID Is Immutable Primary Key (Simplest)
**IF** IDs are assigned once at creation and never edited:

**Changes Needed**: NONE
**Rationale**: Current implementation is correct, just clarify that IDs are immutable

**Pros**:
- ✅ No code changes needed
- ✅ No database migration
- ✅ System already works this way

**Cons**:
- ❌ Violates stated design intent if users need to edit IDs

### Solution 2: Add UUID as True Primary Key
**IF** IDs need to be editable and non-unique:

**Changes Needed**:
1. Add `uuid` column as PRIMARY KEY
2. Change Prisma schema to `uuid String @id @default(uuid())`
3. Change ID to regular field `id String` (not @id)
4. Update all WebSocket handlers to use uuid for matching
5. Update all queries to locate by uuid, not id
6. Migration to add uuid to existing rows

**Pros**:
- ✅ IDs can be edited freely
- ✅ Proper database design (immutable PK)
- ✅ Matches original architecture intent

**Cons**:
- ❌ Large refactor (this was attempted and rolled back Feb 10)
- ❌ Risk of breaking WebSocket sync
- ❌ Affects all entity tables

### Solution 3: ID Unique Within Production
**IF** IDs must be unique per production but can be edited:

**Changes Needed**:
1. Add validation that prevents ID conflicts within production
2. Allow ID editing with conflict check
3. Keep ID as PRIMARY KEY
4. Add `@@unique([production_id, id])` constraint

**Pros**:
- ✅ Minimal code changes
- ✅ IDs stay unique within context
- ✅ Can edit IDs (with validation)

**Cons**:
- ❌ Still uses ID as PRIMARY KEY (may violate intent)
- ❌ ID changes would need to update all foreign keys

### Solution 4: Composite Primary Key
**IF** ID is truly not unique but we don't want UUID:

**Changes Needed**:
1. Use composite PRIMARY KEY: `@@id([production_id, id])`
2. Update all foreign key references to use both fields
3. Update WebSocket handlers to match on both fields

**Pros**:
- ✅ No UUID needed
- ✅ Allows non-unique IDs across productions

**Cons**:
- ❌ Complex foreign key relationships
- ❌ WebSocket payload must include both fields
- ❌ More error-prone

---

## 📝 Recommended Investigation Steps

1. **Search for original design docs**:
   ```bash
   grep -r "user.*edit.*id" docs/
   grep -r "rename.*source" docs/
   grep -r "id.*mutable" docs/
   ```

2. **Check if ID editing exists in UI**:
   - Is there an "Edit ID" field in source/camera/CCU modals?
   - Can users change the ID after creation?

3. **Review git history**:
   ```bash
   git log --all --grep="id design"
   git log --all --grep="primary key"
   ```

4. **Test current behavior**:
   - Try to create two sources with same ID - does it fail?
   - Try to update a source's ID - does API allow it?

5. **Check PROJECT_RULES.md for ID conventions**:
   - What does it say about ID mutability?
   - What does it say about uniqueness?

---

## 🎯 AWAITING USER CLARIFICATION

**Cannot proceed with fix until we understand:**
1. ✋ Is ID meant to be editable after creation?
2. ✋ Must IDs be unique within a production?
3. ✋ If ID is not PRIMARY KEY, what should be?
4. ✋ Was UUID rollback because of technical issues, or because UUID wasn't needed?

**Once clarified, we can implement the appropriate solution.**

---

## 📚 Related Documents

- [UUID_MIGRATION_RECOVERY.md](UUID_MIGRATION_RECOVERY.md) - Feb 10 rollback
- [ENTITY_DATA_FLOW_STANDARD.md](../ENTITY_DATA_FLOW_STANDARD.md) - Created today (conflicts with user statement)
- [PROJECT_RULES.md](../../video-production-manager/docs/PROJECT_RULES.md) - Core architecture rules

**Status**: 🔴 INVESTIGATION OPEN - Awaiting architectural clarification
