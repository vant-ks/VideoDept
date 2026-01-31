# API Loading Analysis & Naming Convention Audit

## Date: January 31, 2026

## Problem Statement
The frontend consistently throws 404 errors on initial load, even after "fixing" API routes. This document provides a comprehensive analysis of the loading process, naming conventions, and the root cause.

---

## Root Cause Identified

### **Missing `/api` prefix in VITE_API_URL**

**Issue:** The `.env` file had:
```
VITE_API_URL=http://localhost:3010
```

**Should be:**
```
VITE_API_URL=http://localhost:3010/api
```

**Impact:** All API calls were going to `http://localhost:3010/equipment` instead of `http://localhost:3010/api/equipment`, causing 404 errors.

---

## Frontend Loading Sequence

### 1. **App.tsx Initialize (Line 83)**
```typescript
useEffect(() => {
  initialize();
}, []);
```

Calls `initialize()` function which:
1. Fetches equipment library
2. Syncs productions from API
3. Initializes old store

### 2. **Equipment Library Load (App.tsx:49)**
```typescript
await useEquipmentLibrary.getState().fetchFromAPI();
```

Calls → `apiClient.getEquipment()` → `GET /equipment`

### 3. **Productions Sync (App.tsx:59)**
```typescript
await useProjectStore.getState().syncWithAPI();
```

Calls → `apiClient.getProductions()` → `GET /productions`

### 4. **Old Store Sync (App.tsx:77)**
```typescript
await useProductionStore.getState().initializeStore();
```

Calls:
- `apiClient.getEquipment()` → `GET /equipment`
- `apiClient.getSettings()` → `GET /settings`

### 5. **Projects Page Load (Projects.tsx:52)**
```typescript
useEffect(() => {
  loadShowsList();
}, []);
```

Calls → `syncWithAPI()` → `GET /productions`

---

## API Client Configuration

### apiClient.ts - Base URL Resolution
```typescript
private getApiBaseUrl(): string {
  // 1. Check localStorage override
  const lanServer = localStorage.getItem('api_server_url');
  if (lanServer) return lanServer;

  // 2. Check environment variable (HIGHEST PRIORITY IN PRODUCTION)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;  // ← WAS MISSING /api
  }

  // 3. Default fallback
  return 'http://localhost:3010/api';
}
```

**Resolution Order:**
1. localStorage `api_server_url` (user override)
2. `VITE_API_URL` environment variable **← PROBLEM WAS HERE**
3. Hardcoded default with `/api`

---

## Naming Convention Audit

### Database Tables (PostgreSQL)
All tables use **snake_case** and are **plural**:
```
productions
sources
sends
cameras
connections
checklist_items
equipment_specs
source_outputs
connector_types
frame_rates
resolution_presets
settings
```

### Prisma Models (schema.prisma)
Models match database table names exactly:
```prisma
model productions { }
model sources { }
model sends { }
model cameras { }
model connections { }
model checklist_items { }
model equipment_specs { }
```

### Prisma Field Names
All fields use **snake_case**:
```prisma
model sources {
  production_id   String
  is_deleted      Boolean
  created_at      DateTime
  updated_at      DateTime
  last_modified_by String?
}
```

### API Routes (api/src/routes/*.ts)
**Correct Usage:**
```typescript
// ✅ Correct
await prisma.sources.findMany({
  where: {
    production_id: req.params.productionId,
    is_deleted: false
  }
});
```

**Previous Errors (FIXED):**
```typescript
// ❌ Wrong - singular model name
await prisma.source.findMany()

// ❌ Wrong - camelCase field names
where: {
  productionId: id,
  isDeleted: false
}

// ❌ Wrong - incorrect relation name
include: {
  outputs: true  // Should be: source_outputs
}
```

### API Endpoints (Express Routes)
All routes registered under `/api` prefix:
```typescript
// server.ts
app.use('/api/productions', productionsRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/sends', sendsRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/settings', settingsRouter);
```

**Full Endpoint Paths:**
- `GET /api/productions`
- `GET /api/productions/:id`
- `GET /api/sources/production/:productionId`
- `GET /api/sends/production/:productionId`
- `GET /api/equipment`
- `GET /api/settings`
- `GET /api/cameras/production/:productionId`
- `GET /api/checklist-items/production/:productionId`

### Frontend API Client (apiClient.ts)
Methods use **camelCase** and call relative paths:
```typescript
// Frontend methods
async getProductions() {
  return this.get('/productions');  // Relative path
}

async getEquipment() {
  return this.get('/equipment');
}

async getSources(productionId: string) {
  return this.get(`/sources/production/${productionId}`);
}
```

**With correct baseURL:** `http://localhost:3010/api`
- `this.get('/productions')` → `http://localhost:3010/api/productions` ✅
- `this.get('/equipment')` → `http://localhost:3010/api/equipment` ✅

**With incorrect baseURL:** `http://localhost:3010`
- `this.get('/productions')` → `http://localhost:3010/productions` ❌ 404!
- `this.get('/equipment')` → `http://localhost:3010/equipment` ❌ 404!

---

## Fixes Applied

### 1. Environment Variable (CRITICAL FIX)
**File:** `.env`
```diff
- VITE_API_URL=http://localhost:3010
+ VITE_API_URL=http://localhost:3010/api
```

### 2. Prisma Model Names
**Files:** All `api/src/routes/*.ts`
```typescript
// Changed singular to plural
prisma.source → prisma.sources
prisma.send → prisma.sends
prisma.camera → prisma.cameras
prisma.connection → prisma.connections
prisma.setting → prisma.settings
```

### 3. Field Names (snake_case)
```typescript
// Changed camelCase to snake_case
productionId → production_id
isDeleted → is_deleted
createdAt → created_at
updatedAt → updated_at
```

### 4. Relation Names
```typescript
// Fixed incorrect relation names
include: { outputs: true }
→ include: { source_outputs: true }

include: { equipment_io_ports: true }  // in cards
→ include: { equipment_card_io: true }
```

### 5. Removed Invalid Fields
```typescript
// Removed is_deleted from checklist_items (doesn't exist)
where: {
  production_id: productionId,
  // is_deleted: false  ← Removed
}
```

---

## Testing Results

### Before Fix
```bash
$ curl http://localhost:3010/equipment
Cannot GET /equipment  # 404

$ curl http://localhost:3010/productions
Cannot GET /productions  # 404
```

Frontend console:
```
GET http://localhost:3010/equipment 404 (Not Found)
GET http://localhost:3010/productions 404 (Not Found)
```

### After Fix
```bash
$ curl http://localhost:3010/api/equipment
[]  # ✅ Success

$ curl http://localhost:3010/api/productions
[]  # ✅ Success

$ curl http://localhost:3010/api/settings
{}  # ✅ Success
```

---

## Complete Naming Convention Reference

| Layer | Convention | Example |
|-------|-----------|---------|
| **Database Tables** | snake_case, plural | `productions`, `source_outputs` |
| **Database Columns** | snake_case | `production_id`, `is_deleted` |
| **Prisma Models** | snake_case, plural | `model sources { }` |
| **Prisma Fields** | snake_case | `production_id String` |
| **API Routes (Express)** | kebab-case, plural | `/api/checklist-items` |
| **API Route Params** | camelCase | `req.params.productionId` |
| **Prisma Queries** | snake_case fields | `where: { production_id: "..." }` |
| **Frontend API Methods** | camelCase | `getProductions()` |
| **Frontend Variables** | camelCase | `productionId`, `isDeleted` |

---

## Why We Were Going in Circles

1. **Initial Problem:** API routes had wrong model/field names (singular, camelCase)
2. **First Fix:** Changed Prisma queries to use correct names
3. **Tested with curl:** `curl http://localhost:3010/api/productions` ✅ Worked!
4. **Frontend Still Failed:** Because it was calling `http://localhost:3010/productions` (missing `/api`)
5. **Root Cause:** `.env` file had `VITE_API_URL=http://localhost:3010` without `/api` suffix
6. **Solution:** Add `/api` to VITE_API_URL

**The disconnect:** We fixed the API but the frontend wasn't even reaching it because of the wrong base URL!

---

## Recommendations

### 1. Environment Variable Validation
Add startup check in `App.tsx`:
```typescript
if (!import.meta.env.VITE_API_URL?.endsWith('/api')) {
  console.error('⚠️ VITE_API_URL must end with /api');
}
```

### 2. API Health Check on Load
Test connection before making data calls:
```typescript
const isHealthy = await apiClient.checkHealth();
if (!isHealthy) {
  console.error('❌ API server is not responding');
}
```

### 3. Centralized Configuration
Create `config.ts`:
```typescript
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3010/api',
  timeout: 10000,
  retries: 3
};
```

### 4. TypeScript Route Constants
```typescript
// routes.ts
export const API_ROUTES = {
  PRODUCTIONS: '/productions',
  EQUIPMENT: '/equipment',
  SOURCES: (id: string) => `/sources/production/${id}`,
} as const;
```

---

## Verification Checklist

- [x] `.env` has `VITE_API_URL=http://localhost:3010/api`
- [x] All Prisma models use plural names
- [x] All Prisma fields use snake_case
- [x] All relation names match schema
- [x] API routes registered under `/api` prefix
- [x] Frontend apiClient uses relative paths
- [x] No hardcoded URLs in frontend code
- [x] All endpoints tested with curl
- [ ] Frontend loads without 404 errors (test after restart)
- [ ] Production data can be created/read/updated/deleted
- [ ] Equipment library loads successfully

---

## Next Steps

1. **Test Frontend:** Open http://localhost:3011 and check console for errors
2. **Verify API Calls:** Ensure all requests go to `/api/*` endpoints
3. **Test CRUD Operations:** Create, read, update, delete productions
4. **Check Railway Deployment:** Ensure `VITE_API_URL` is set correctly in production

---

## Files Modified

### Configuration
- `.env` - Added `/api` to VITE_API_URL

### API Routes (all fixed)
- `api/src/routes/sources.ts`
- `api/src/routes/sends.ts`
- `api/src/routes/cameras.ts`
- `api/src/routes/connections.ts`
- `api/src/routes/checklist-items.ts`
- `api/src/routes/equipment.ts`
- `api/src/routes/settings.ts`

### Prisma
- `api/prisma/schema.prisma` - Removed metadata field

---

## Conclusion

The persistent 404 errors were caused by a **configuration mismatch**, not a code bug. The `.env` file specified `http://localhost:3010` while the API routes were mounted at `/api/*`, causing all requests to fail. 

Combined with incorrect Prisma model/field names, this created a "double fault" scenario where even after fixing the API code, the frontend still couldn't reach it.

**Resolution:** Add `/api` to VITE_API_URL and ensure all Prisma queries use correct plural model names and snake_case field names.
