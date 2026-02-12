# Data Flow Analysis - Source Creation

## Current Architecture Problems

### Flow 1: Source Creation via Frontend
```
1. User clicks "Add Source" → SourceFormModal opens
2. Modal generates ID via SourceService.generateId(existingSources)
3. User fills form, clicks Save
4. Sources.tsx handleSave() calls sourcesAPI.createSource()
5. API creates source in database
6. API returns new source with { id, uuid, ... }
7. **CIRCULAR ACTION #1**: Sources.tsx adds to state: setSources(prev => [...prev, newSource])
8. API broadcasts WebSocket event: io.emit('entity:created', { entity: source })
9. **CIRCULAR ACTION #2**: useProductionEvents receives event, tries to add to state again
10. Duplicate check: if (prev.some(s => s.id === event.entity.id)) return prev;
```

### Problem: Double State Update
- Line 137 in Sources.tsx: `setSources(prev => [...prev, newSource])`
- Line 53 in Sources.tsx: WebSocket handler also calls `setSources(prev => [...prev, event.entity])`
- Even with duplicate check, there's a race condition window

### Flow 2: ID Generation Dependency
```
1. SourceFormModal receives existingSources prop from Sources.tsx
2. useEffect dependency: [isOpen, existingSources, ...]
3. When existingSources changes, useEffect re-runs
4. Regenerates ID even if modal is already open
```

### Problem: Stale existingSources
When modal opens for SRC 2:
- existingSources might not include SRC 1 yet (WebSocket hasn't fired?)
- Or existingSources includes SRC 1 but with wrong structure?
- generateId() reads from stale existingSources

### Flow 3: Frontend Validation vs API Validation
```
Frontend (SourceFormModal line 247):
- SourceService.idExists(formData.id, existingSources, ...)
- Checks against local state only

API (sources.ts line 128):
- Checks database: if (error.code === 'P2002')
- BUT: checks if 'id' is in target array
- Should check if target is ['id', 'production_id']
```

### Problem: Validation Mismatch
- Frontend checks local state (may be stale)
- API checks database (source of truth)
- API error handler checks wrong constraint

## Root Cause Hypothesis

**The API is correctly checking the composite unique constraint** (my curl tests proved this).

**The frontend validation is blocking on stale state:**
1. User creates SRC 1
2. setSources adds it to state
3. BUT WebSocket event hasn't fired yet (or fires after modal closes)
4. User opens modal for SRC 2
5. existingSources doesn't include SRC 1 (timing issue)
6. generateId() sees no sources, generates "SRC 1" again
7. Frontend validation sees no conflict (existingSources is empty)
8. API call tries to create "SRC 1" again
9. Database rejects it (correct behavior)

## Test Plan

### Test 1: Log State Timing
Check if existingSources is updated before modal reopens:
```
- Log sources state when handleAddNew is called
- Log existingSources when SourceFormModal useEffect runs
- Compare timestamps
```

### Test 2: Verify WebSocket Handler
Check if WebSocket duplicate prevention works:
```
- Log when WebSocket event received
- Log current state before adding
- Log if duplicate detected
- Log final state after adding
```

### Test 3: Check API Response Structure
Verify the source returned from API matches frontend expectations:
```
- Log API response in createSource
- Check if id, uuid, productionId are all present
- Verify field names (camelCase vs snake_case)
```

## Solution Options

### Option A: Remove Frontend State Update After API Call
**Don't add to state in handleSave** - rely only on WebSocket:
```typescript
// Remove this line:
setSources(prev => [...prev, newSource]);

// Let WebSocket handler do it exclusively
```

### Option B: Remove WebSocket Handler for Own Actions
**Don't add via WebSocket if it's your own creation:**
```typescript
onEntityCreated: useCallback((event) => {
  if (event.userId === currentUserId) return; // Skip own actions
  setSources(prev => [...prev, event.entity]);
}, [currentUserId])
```

### Option C: Use UUID for Comparison Instead of ID
**Change duplicate check to use uuid:**
```typescript
if (prev.some(s => s.uuid === event.entity.uuid)) return prev;
```

### Option D: Fetch Sources After Modal Closes
**Force re-fetch to ensure fresh state:**
```typescript
setIsModalOpen(false);
await sourcesAPI.fetchSources(productionId).then(setSources);
```

## Recommended Fix

**Combination of A + C:**

1. Remove manual state update after API call (let WebSocket handle it)
2. Change duplicate check to use uuid (more reliable than human-readable id)
3. Add optimistic update with rollback on error

This ensures:
- Single source of truth (WebSocket)
- No race conditions
- UUID comparison is more reliable
- Optimistic UI for better UX
