# Data Layer Protocol & Project Rules

**Last Updated:** January 31, 2026  
**Status:** Active Protocol

---

## Table of Contents
1. [Critical Learnings](#critical-learnings)
2. [Database Schema Rules](#database-schema-rules)
3. [API Route Requirements](#api-route-requirements)
4. [Case Conversion Protocol](#case-conversion-protocol)
5. [Field Naming Standards](#field-naming-standards)
6. [Type Safety Requirements](#type-safety-requirements)
7. [Testing Checklist](#testing-checklist)
8. [Common Pitfalls](#common-pitfalls)

---

## Critical Learnings

### The Root Issue: No Automatic Case Conversion
**Discovery:** Prisma returns database fields exactly as defined in `schema.prisma` (snake_case), but frontend TypeScript interfaces expect camelCase. **There is no automatic transformation.**

**Impact:** 
- All GET responses returned snake_case fields to frontend expecting camelCase
- All POST/PUT requests sent camelCase fields to database expecting snake_case
- Field mismatches caused silent failures and 500 errors

### Architecture Gap
The stack has **three distinct layers** with different naming conventions:
```
┌─────────────────────────────────────────────────┐
│  Frontend (TypeScript)                          │
│  Convention: camelCase                          │
│  Example: productionId, updatedAt, isDeleted   │
└─────────────────────────────────────────────────┘
                     ↕
        [MISSING TRANSFORMATION LAYER]
                     ↕
┌─────────────────────────────────────────────────┐
│  API Routes (Express)                           │
│  Mixed: Used both conventions incorrectly       │
└─────────────────────────────────────────────────┘
                     ↕
┌─────────────────────────────────────────────────┐
│  Database (PostgreSQL via Prisma)               │
│  Convention: snake_case                         │
│  Example: production_id, updated_at, is_deleted │
└─────────────────────────────────────────────────┘
```

**Solution:** Explicit bidirectional transformation using `toCamelCase()` and `toSnakeCase()` helpers.

---

## Database Schema Rules

### 1. Field Naming Convention
**Rule:** ALL database fields MUST use `snake_case`

✅ **Correct:**
```prisma
model sources {
  id             String
  production_id  String
  updated_at     DateTime
  is_deleted     Boolean
}
```

❌ **Incorrect:**
```prisma
model sources {
  id            String
  productionId  String    // ❌ camelCase
  updatedAt     DateTime  // ❌ camelCase
  isDeleted     Boolean   // ❌ camelCase
}
```

### 2. Required Metadata Fields
**Rule:** Every entity table MUST include these fields:

```prisma
created_at       DateTime  @default(now())
updated_at       DateTime  @updatedAt
version          Int       @default(1)
```

**Optional but recommended for soft deletes:**
```prisma
is_deleted       Boolean   @default(false)
```

### 3. Foreign Key Naming
**Rule:** Foreign keys MUST follow pattern: `{entity}_id`

✅ **Correct:**
```prisma
production_id  String
camera_id      String
user_id        String
```

❌ **Incorrect:**
```prisma
productionId   String  // ❌ camelCase
production     String  // ❌ Missing _id suffix
prod_id        String  // ❌ Abbreviated
```

### 4. Model Name Convention
**Rule:** Model names MUST be `lowercase_plural`

✅ **Correct:**
```prisma
model sources { }
model checklist_items { }
model ip_addresses { }
```

❌ **Incorrect:**
```prisma
model Source { }         // ❌ Singular
model ChecklistItems { } // ❌ PascalCase
model cCU { }           // ❌ Mixed case
```

---

## API Route Requirements

### 1. Mandatory Imports
**Rule:** EVERY route file MUST import case converters:

```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';  // ✅ REQUIRED
```

### 2. GET Response Transformation
**Rule:** ALL Prisma query results MUST be converted to camelCase before sending:

✅ **Correct:**
```typescript
router.get('/production/:productionId', async (req, res) => {
  const cameras = await prisma.cameras.findMany({
    where: {
      production_id: req.params.productionId,  // ✅ Use snake_case
      is_deleted: false                         // ✅ Use snake_case
    }
  });
  res.json(toCamelCase(cameras));  // ✅ Convert before sending
});
```

❌ **Incorrect:**
```typescript
router.get('/production/:productionId', async (req, res) => {
  const cameras = await prisma.cameras.findMany({
    where: {
      productionId: req.params.productionId,  // ❌ Wrong field name
      isDeleted: false                         // ❌ Field doesn't exist
    }
  });
  res.json(cameras);  // ❌ Returns snake_case to frontend
});
```

### 3. POST/PUT Request Body Handling
**Rule:** Incoming request bodies should be handled in two ways:

**Option A: Manual Destructuring (Preferred for clarity)**
```typescript
router.post('/', async (req, res) => {
  const { productionId, userId, userName, ...cameraData } = req.body;
  
  const camera = await prisma.cameras.create({
    data: {
      ...cameraData,
      production_id: productionId,  // ✅ Manual mapping
      version: 1
    }
  });
  
  res.status(201).json(toCamelCase(camera));  // ✅ Convert response
});
```

**Option B: Bulk Conversion (For complex objects)**
```typescript
router.post('/', async (req, res) => {
  const { userId, userName, ...entityData } = req.body;
  const snakeData = toSnakeCase(entityData);  // ✅ Convert all fields
  
  const entity = await prisma.entities.create({ data: snakeData });
  res.status(201).json(toCamelCase(entity));
});
```

### 4. Field Existence Validation
**Rule:** ALWAYS verify field exists in schema before querying

✅ **Correct - Check schema first:**
```prisma
// In schema.prisma
model ip_addresses {
  id             String
  production_id  String
  // Note: NO is_deleted field
}
```

```typescript
// In route - use hard delete
await prisma.ip_addresses.delete({ where: { id } });  // ✅
```

❌ **Incorrect - Assuming field exists:**
```typescript
await prisma.ip_addresses.update({
  where: { id },
  data: { is_deleted: true }  // ❌ Field doesn't exist in schema!
});
```

### 5. Prisma Model Name Validation
**Rule:** Use EXACT model names from `schema.prisma`

✅ **Correct:**
```typescript
await prisma.ccus.findMany()      // ✅ Matches "model ccus"
await prisma.sources.findMany()   // ✅ Matches "model sources"
await prisma.cameras.findMany()   // ✅ Matches "model cameras"
```

❌ **Incorrect:**
```typescript
await prisma.cCU.findMany()       // ❌ Wrong capitalization
await prisma.CCU.findMany()       // ❌ Wrong case
await prisma.camera.findMany()    // ❌ Singular instead of plural
```

---

## Case Conversion Protocol

### 1. Case Converter Location
**File:** `/api/src/utils/caseConverter.ts`

### 2. Conversion Functions

#### `toCamelCase(obj, entityType?)`
**Purpose:** Convert database snake_case to frontend camelCase  
**Usage:** Apply to ALL data leaving the API

```typescript
// Single object
const camera = await prisma.cameras.findUnique({ where: { id } });
res.json(toCamelCase(camera));

// Array of objects
const cameras = await prisma.cameras.findMany();
res.json(toCamelCase(cameras));

// Nested objects (automatically handled)
const source = await prisma.sources.findUnique({
  where: { id },
  include: { source_outputs: true }
});
res.json(toCamelCase(source));  // Converts nested arrays too
```

#### `toSnakeCase(obj, entityType?)`
**Purpose:** Convert frontend camelCase to database snake_case  
**Usage:** Apply to incoming request data before Prisma operations

```typescript
const { userId, userName, ...entityData } = req.body;
const dbData = toSnakeCase(entityData);
await prisma.entities.create({ data: dbData });
```

### 3. Special Field Mappings
**Rule:** Some fields have non-standard mappings defined in `caseConverter.ts`

**Current Special Mappings:**
```typescript
const SPECIAL_MAPPINGS = {
  'output_connector': 'output',      // Sends entity
  'device_name': 'device',           // IP addresses entity
  'note': 'notes',                   // IP addresses entity (plural)
};
```

**Protocol:** When adding new special mappings:
1. Document the reason in comments
2. Add to `SPECIAL_MAPPINGS` object
3. Update this document
4. Test both directions (to/from database)

### 4. Fields That Should NOT Be Converted
**Exceptions to case conversion:**
- `id` - Always lowercase
- Date objects - Preserved as-is
- `null` / `undefined` - Passed through
- Enum values - Case preserved

---

## Field Naming Standards

### 1. Standard Field Patterns

| Pattern | Database (snake_case) | Frontend (camelCase) | Example Entity |
|---------|----------------------|---------------------|----------------|
| Primary Key | `id` | `id` | All |
| Foreign Key | `{entity}_id` | `{entity}Id` | `production_id` → `productionId` |
| Boolean | `is_{state}` | `is{State}` | `is_deleted` → `isDeleted` |
| Timestamp | `{action}_at` | `{action}At` | `created_at` → `createdAt` |
| Metadata | `last_modified_by` | `lastModifiedBy` | Users |
| Dimensions | `h_res`, `v_res` | `hRes`, `vRes` | Sources, Cameras |

### 2. Common Field Mismatches Found

| Database Field | Frontend Field | Entity | Status |
|---------------|---------------|--------|--------|
| `production_id` | `productionId` | All | ✅ Fixed with converter |
| `is_deleted` | `isDeleted` | Most entities | ✅ Fixed with converter |
| `created_at` | `createdAt` | All | ✅ Fixed with converter |
| `updated_at` | `updatedAt` | All | ✅ Fixed with converter |
| `output_connector` | `output` | Sends | ✅ Fixed with special mapping |
| `device_name` | `device` | IP Addresses | ✅ Fixed with special mapping |
| `note` | `notes` | IP Addresses | ✅ Fixed with special mapping |

### 3. Fields That Must Always Be Present

**For CREATE operations:**
```typescript
{
  id: string,              // Generated client-side
  production_id: string,   // Required foreign key
  updated_at: string,      // ISO timestamp
  version: 1               // Initial version
}
```

**For UPDATE operations:**
```typescript
{
  version: number,         // For conflict detection
  updated_at: string,      // New timestamp
}
```

---

## Type Safety Requirements

### 1. TypeScript Interface Rules
**Rule:** Frontend interfaces MUST use camelCase

✅ **Correct:**
```typescript
export interface Camera {
  id: string;
  productionId: string;      // ✅ camelCase
  name: string;
  formatMode?: string;       // ✅ camelCase
  hasTrip?: boolean;        // ✅ camelCase
  createdAt: string;         // ✅ camelCase
  updatedAt: string;         // ✅ camelCase
  version: number;
}
```

❌ **Incorrect:**
```typescript
export interface Camera {
  id: string;
  production_id: string;     // ❌ snake_case
  name: string;
  format_mode?: string;      // ❌ snake_case
}
```

### 2. Schema-Interface Alignment
**Rule:** Every database model MUST have a corresponding TypeScript interface

**Checklist:**
- [ ] Field names follow camelCase convention
- [ ] All required fields marked as non-optional
- [ ] Optional fields use `?` operator
- [ ] Metadata fields included (createdAt, updatedAt, version)
- [ ] Foreign keys named consistently (e.g., `productionId`)

### 3. Sample Data Validation
**Rule:** Sample data MUST match CURRENT schema structure

**Before adding/updating sample data:**
1. Check `schema.prisma` for current field names
2. Verify required vs optional fields
3. Include all metadata fields
4. Test creating entity with sample data

✅ **Correct:**
```typescript
export const sampleCamera: Camera = {
  id: 'cam-1',
  productionId: 'prod-123',   // ✅ Matches interface
  name: 'Camera 1',
  formatMode: 'HD',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1
};
```

### 4. Type Guards for API Responses
**Rule:** Create type guards when case conversion might fail

```typescript
function isCameraResponse(obj: any): obj is Camera {
  return (
    typeof obj.id === 'string' &&
    typeof obj.productionId === 'string' &&  // Verify camelCase
    typeof obj.name === 'string'
  );
}
```

---

## Testing Checklist

### When Adding/Modifying an Entity

#### 1. Schema Changes
- [ ] Added/modified model in `schema.prisma`
- [ ] Used snake_case for all fields
- [ ] Included metadata fields (created_at, updated_at, version)
- [ ] Ran `npx prisma format`
- [ ] Created migration: `npx prisma migrate dev --name <description>`
- [ ] Verified migration applied successfully

#### 2. Frontend Types
- [ ] Created/updated TypeScript interface in `src/types/index.ts`
- [ ] Used camelCase for all fields
- [ ] Marked optional fields with `?`
- [ ] Included metadata fields (createdAt, updatedAt, version)
- [ ] Documented any special field mappings

#### 3. API Routes
- [ ] Created route file in `api/src/routes/`
- [ ] Imported `toCamelCase` and `toSnakeCase`
- [ ] Applied `toCamelCase()` to ALL GET responses
- [ ] Used correct snake_case field names in Prisma queries
- [ ] Handled POST/PUT request body conversion
- [ ] Used exact Prisma model name (check `schema.prisma`)
- [ ] Verified field existence before soft delete operations

#### 4. Sample Data
- [ ] Updated `src/data/sampleData.ts` if applicable
- [ ] Used camelCase matching TypeScript interface
- [ ] Included all required fields
- [ ] Tested creating entity with sample data

#### 5. Manual Testing
- [ ] Restarted API server (port 3010)
- [ ] Restarted frontend server (port 3011)
- [ ] Tested GET endpoint - verified camelCase response
- [ ] Tested POST endpoint - verified creation succeeds
- [ ] Tested PUT endpoint - verified update succeeds
- [ ] Checked browser console for errors
- [ ] Verified data in Prisma Studio

---

## Common Pitfalls

### 1. ❌ Using Wrong Field Names in Queries
**Problem:**
```typescript
const cameras = await prisma.cameras.findMany({
  where: {
    productionId: id,  // ❌ Field doesn't exist!
    isDeleted: false   // ❌ Field doesn't exist!
  }
});
```

**Solution:**
```typescript
const cameras = await prisma.cameras.findMany({
  where: {
    production_id: id,  // ✅ Correct field name
    is_deleted: false   // ✅ Correct field name
  }
});
```

### 2. ❌ Forgetting Response Conversion
**Problem:**
```typescript
router.get('/:id', async (req, res) => {
  const camera = await prisma.cameras.findUnique({ where: { id } });
  res.json(camera);  // ❌ Sends snake_case to frontend!
});
```

**Solution:**
```typescript
router.get('/:id', async (req, res) => {
  const camera = await prisma.cameras.findUnique({ where: { id } });
  res.json(toCamelCase(camera));  // ✅ Converts to camelCase
});
```

### 3. ❌ Using Wrong Prisma Model Name
**Problem:**
```typescript
await prisma.cCU.findMany();  // ❌ Model doesn't exist!
```

**Solution:**
```typescript
await prisma.ccus.findMany();  // ✅ Matches schema: "model ccus"
```

**How to avoid:** Always check `schema.prisma` for exact model name

### 4. ❌ Checking Non-Existent Fields
**Problem:**
```typescript
// ip_addresses table has NO is_deleted field
const ipAddresses = await prisma.ip_addresses.findMany({
  where: { isDeleted: false }  // ❌ Field doesn't exist!
});
```

**Solution:**
```typescript
// Check schema first, then adjust query
const ipAddresses = await prisma.ip_addresses.findMany({
  where: { production_id: id }  // ✅ Only query existing fields
});
```

### 5. ❌ Missing Required Fields in Creates
**Problem:**
```typescript
const item = await prisma.checklist_items.create({
  data: {
    id: 'chk-1',
    production_id: 'prod-1',
    completed: false
    // ❌ Missing: title, updated_at
  }
});
```

**Solution:**
```typescript
const item = await prisma.checklist_items.create({
  data: {
    id: 'chk-1',
    production_id: 'prod-1',
    title: 'Review setup',        // ✅ Required field
    completed: false,
    updated_at: new Date().toISOString(),  // ✅ Required field
    version: 1
  }
});
```

### 6. ❌ Inconsistent Foreign Key Naming
**Problem:**
```typescript
// Different patterns in different models
production_id: string   // In cameras
prod_id: string        // In sends (inconsistent!)
productionId: string   // In sources (wrong case!)
```

**Solution:**
```typescript
// Always use {entity}_id pattern
production_id: string  // ✅ Everywhere
camera_id: string      // ✅ Consistent
user_id: string        // ✅ Consistent
```

---

## Protocol Enforcement

### Pre-Commit Checklist
Before committing changes that affect data layer:
1. Run TypeScript compiler: `npm run build`
2. Check for console errors in browser
3. Test affected endpoints with curl/Postman
4. Verify Prisma Studio shows correct data structure
5. Document any new special field mappings

### Code Review Focus Areas
When reviewing data layer changes:
1. Verify case conversion applied to all responses
2. Check Prisma queries use snake_case field names
3. Confirm model names match schema exactly
4. Validate field existence in schema
5. Ensure TypeScript interfaces use camelCase

### Continuous Monitoring
Set up automated checks:
- [ ] TypeScript strict mode enabled
- [ ] Prisma validation on pre-commit hook
- [ ] API integration tests for case conversion
- [ ] Schema-interface alignment validator

---

## Quick Reference

### DO's ✅
- Use snake_case in database schema
- Use camelCase in TypeScript interfaces
- Apply `toCamelCase()` to ALL API responses
- Verify field names in schema before querying
- Use exact Prisma model names from schema
- Include metadata fields (created_at, updated_at, version)
- Test after every schema change

### DON'Ts ❌
- Don't assume Prisma converts case automatically
- Don't use camelCase in Prisma queries
- Don't skip response transformation
- Don't create entities without required fields
- Don't modify schema without updating types
- Don't soft delete if is_deleted doesn't exist
- Don't abbreviate foreign key names

---

## Additional Resources

- **Prisma Documentation:** https://www.prisma.io/docs
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/
- **Project Schema:** `video-production-manager/api/prisma/schema.prisma`
- **Case Converter:** `video-production-manager/api/src/utils/caseConverter.ts`
- **Type Definitions:** `video-production-manager/src/types/index.ts`

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-31 | Initial protocol creation based on data layer audit | System |
| 2026-01-31 | Added special field mappings for sends, ip_addresses | System |
| 2026-01-31 | Documented case conversion requirements | System |

---

**This is a living document. Update as new patterns emerge or exceptions are discovered.**
