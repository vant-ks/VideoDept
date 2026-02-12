# Comprehensive Type System Audit - Checklist Items

**Date:** February 4, 2026  
**Issue:** Circular BigInt serialization errors and type mismatches

---

## 🔴 CRITICAL ISSUES FOUND

### 1. **BigInt Handling in Transform Functions**

**Problem:** `toCamelCase()` and `toSnakeCase()` don't handle BigInt values from Prisma.

**Location:** `api/src/utils/caseConverter.ts`

**Impact:** When Prisma returns `completed_at` as BigInt, it gets passed through untransformed, causing:
- JSON.stringify() errors in event recording
- Socket.IO serialization errors during WebSocket broadcasts
- Type mismatches between API and frontend

**Root Cause:**
```typescript
// Current code DOES NOT handle BigInt
export function toCamelCase(obj: any, entityType?: string): any {
  if (typeof obj === 'object') {
    // BigInt values pass through unchanged!
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key], entityType); // Recursion doesn't convert BigInt
      return acc;
    }, {} as any);
  }
  return obj; // BigInt returns unchanged!
}
```

---

### 2. **Type Mismatch: Database vs Frontend**

**Database Schema (Prisma):**
```prisma
model checklist_items {
  completed_at BigInt?     // Unix timestamp in milliseconds
  due_date DateTime?
  completion_date DateTime?
}
```

**Frontend Type (TypeScript):**
```typescript
export interface ChecklistItem {
  completedAt?: number;  // ✅ CORRECT - matches BigInt as number
  dueDate?: string;       // ❌ WRONG - Database is DateTime, frontend expects string
  completionDate?: string; // ❌ WRONG - Database is DateTime, frontend expects string
}
```

**Issue:** Frontend expects `dueDate` and `completionDate` as strings, but database stores as DateTime. Conversion is missing.

---

### 3. **Incomplete Field Mapping in GET Endpoint**

**Current Code (line 22 of checklist-items.ts):**
```typescript
router.get('/production/:productionId', async (req: Request, res: Response) => {
  const checklistItems = await prisma.checklist_items.findMany({
    where: { production_id: productionId },
    orderBy: { created_at: 'asc' }
  });
  
  res.json(toCamelCase(checklistItems)); // ❌ BigInt not converted!
}
```

**Problem:** Returns raw Prisma data with BigInt, which:
- Can't be serialized to JSON properly
- Causes "Do not know how to serialize BigInt" errors

---

### 4. **Inconsistent BigInt Handling Across Routes**

**CREATE endpoint:** Manually converts BigInt before broadcast (line 49-53) ✅  
**UPDATE endpoint:** Manually converts BigInt before broadcast (line 141-145) ✅  
**GET endpoint:** No conversion - returns raw BigInt ❌

---

## 🔧 REQUIRED FIXES

### Fix 1: Update caseConverter.ts to Handle BigInt

```typescript
export function toCamelCase(obj: any, entityType?: string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // ✅ ADD: Handle BigInt
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item, entityType));
  }
  
  if (obj instanceof Date) {
    return obj.toISOString(); // ✅ Convert DateTime to ISO string for frontend
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      if (SPECIAL_MAPPINGS[key]) {
        acc[SPECIAL_MAPPINGS[key]] = toCamelCase(obj[key], entityType);
      } else {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = toCamelCase(obj[key], entityType);
      }
      return acc;
    }, {} as any);
  }
  
  return obj;
}

export function toSnakeCase(obj: any, entityType?: string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // ✅ ADD: Handle BigInt
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item, entityType));
  }
  
  if (obj instanceof Date) {
    return obj; // Keep as Date for Prisma
  }
  
  // ✅ ADD: Handle ISO date strings from frontend
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj)) {
    return new Date(obj); // Convert ISO string to Date for Prisma
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      if (REVERSE_MAPPINGS[key]) {
        acc[REVERSE_MAPPINGS[key]] = toSnakeCase(obj[key], entityType);
      } else {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        acc[snakeKey] = toSnakeCase(obj[key], entityType);
      }
      return acc;
    }, {} as any);
  }
  
  return obj;
}
```

### Fix 2: Remove Manual BigInt Conversions (Now Redundant)

After fixing caseConverter, these manual conversions are no longer needed:

**In checklist-items.ts CREATE (lines 49-53):**
```typescript
// ❌ REMOVE: No longer needed after caseConverter fix
const broadcastData = {
  ...checklistItem,
  completed_at: checklistItem.completed_at ? Number(checklistItem.completed_at) : null
};

// ✅ SIMPLIFY TO:
res.status(201).json(toCamelCase(checklistItem));
// And broadcast:
broadcastEntityCreated({
  io,
  productionId: checklistItem.production_id,
  entityType: 'checklist-item',
  entityId: checklistItem.id,
  data: toCamelCase(checklistItem)
});
```

**In checklist-items.ts UPDATE (lines 141-145):**
```typescript
// ❌ REMOVE: Same redundancy
const broadcastData = {
  ...checklistItem,
  completed_at: checklistItem.completed_at ? Number(checklistItem.completed_at) : null
};

// ✅ SIMPLIFY TO:
broadcastEntityUpdate({
  io,
  productionId: checklistItem.production_id,
  entityType: 'checklist-item',
  entityId: checklistItem.id,
  data: toCamelCase(checklistItem)
});
```

### Fix 3: Remove BigInt Conversion in sync-helpers.ts

**In sync-helpers.ts (lines 30-46):**
```typescript
// ❌ REMOVE: Redundant after caseConverter fix
const broadcastData = {
  ...data,
  version: typeof data.version === 'bigint' ? Number(data.version) : data.version
};
io.to(room).emit(event, broadcastData);

// ✅ SIMPLIFY TO:
io.to(room).emit(event, data);
```

---

## 📋 FIELD MAPPING VERIFICATION

### Database → Frontend (via toCamelCase)

| Database Field (snake_case) | Frontend Field (camelCase) | Type Transform |
|------------------------------|----------------------------|----------------|
| `id` | `id` | string → string |
| `production_id` | `productionId` | string → string |
| `title` | `title` | string → string |
| `category` | `category` | string → string |
| `completed` | `completed` | boolean → boolean |
| `more_info` | `moreInfo` | string? → TimestampedEntry[]? |
| `completion_note` | `completionNote` | string? → TimestampedEntry[]? |
| `assigned_to` | `assignedTo` | string? → string? |
| `due_date` | `dueDate` | DateTime? → string? (ISO) ✅ |
| `completion_date` | `completionDate` | DateTime? → string? (ISO) ✅ |
| `completed_at` | `completedAt` | BigInt? → number? ✅ |
| `reference` | `reference` | string? → string? |
| `days_before_show` | `daysBeforeShow` | Int? → number? |
| `sort_order` | `sortOrder` | Int? → number? |
| `created_at` | `createdAt` | DateTime → string (ISO) ✅ |
| `updated_at` | `updatedAt` | DateTime → string (ISO) ✅ |
| `last_modified_by` | `lastModifiedBy` | string? → string? |
| `version` | `version` | Int → number |

### Frontend → Database (via toSnakeCase)

All reverse mappings work correctly after fixes.

---

## 🎯 TESTING CHECKLIST

After implementing fixes:

- [ ] GET `/api/checklist-items/production/:id` returns proper JSON (no BigInt errors)
- [ ] POST `/api/checklist-items` creates item and broadcasts correctly
- [ ] PUT `/api/checklist-items/:id` updates item and broadcasts correctly
- [ ] Toggling completion syncs between browsers without errors
- [ ] New production with `daysBeforeShow` data displays dates correctly
- [ ] `completedAt` timestamp displays as number in frontend
- [ ] `dueDate` and `completionDate` display as ISO strings in frontend
- [ ] No "Do not know how to serialize BigInt" errors in logs
- [ ] WebSocket broadcasts work without serialization errors

---

## 📝 ADDITIONAL NOTES

### Why BigInt for completed_at?

Prisma uses BigInt for large integers to store Unix timestamps in milliseconds (13 digits). JavaScript's number type can safely handle this (up to 2^53-1), so conversion to Number is safe.

### Why DateTime for due_date and completion_date?

These are actual calendar dates (year-month-day), not just timestamps. DateTime is the appropriate Prisma type. Frontend displays them as ISO strings for compatibility.

### JSON Serialization Chain

```
Prisma Query
  ↓ (returns BigInt/DateTime)
toCamelCase() 
  ↓ (converts BigInt→number, DateTime→ISO string)
JSON.stringify()
  ↓ (works because no BigInt/Date objects)
HTTP Response / WebSocket Broadcast
  ↓
Frontend receives clean JSON
```

---

## ✅ IMPLEMENTATION ORDER

1. **Fix caseConverter.ts** (adds BigInt/DateTime handling)
2. **Remove manual conversions** in checklist-items.ts (CREATE/UPDATE)
3. **Remove manual conversions** in sync-helpers.ts
4. **Test GET endpoint** - verify no BigInt in response
5. **Test CREATE/UPDATE** - verify broadcasts work
6. **Test completion toggle** - verify sync between browsers
7. **Create new production** - verify dates appear

---

## 🔒 FUTURE-PROOFING

### For All Prisma Models Using BigInt:

Check schema for other BigInt fields:
```bash
grep -n "BigInt" api/prisma/schema.prisma
```

After caseConverter fix, ALL BigInt fields across ALL models will be handled correctly.

### For All DateTime Fields:

After caseConverter fix, ALL DateTime fields will convert to ISO strings automatically when going to frontend.

---

**END OF AUDIT**
