# Bug Prevention Rules

## CRITICAL: Reset App & Production Deletion Flow

### The Recurring Bug Pattern
**SYMPTOM**: When Reset App runs in Browser A, Browser B gets 404 errors trying to load deleted productions.

**ROOT CAUSE**: Production deletion doesn't properly clear all cached data and references.

### Required Components (DO NOT BREAK)

#### 1. WebSocket Event Listener (Projects.tsx)
```typescript
onProductionDeleted: useCallback(async (productionId: string) => {
  console.log('🔔 Production deleted:', productionId);
  setShows(prev => prev.filter(s => s.id !== productionId));
  
  // Remove from IndexedDB cache
  const allProjects = await listProjects();
  const projectToDelete = allProjects.find(p => p.production.id === productionId);
  if (projectToDelete?.id) {
    await deleteProject(projectToDelete.id);
    console.log('🗑️ Removed deleted production from cache');
    
    // Clear lastOpenedProjectId if it matches
    const { lastOpenedProjectId } = usePreferencesStore.getState();
    if (lastOpenedProjectId === projectToDelete.id) {
      console.log('🧹 Clearing lastOpenedProjectId for deleted production');
      setLastOpenedProjectId(null);
    }
  }
}, [setLastOpenedProjectId])
```

**REQUIRED IMPORTS**:
- `listProjects` from useProjectStore
- `deleteProject` from useProjectStore  
- `usePreferencesStore`

#### 2. 404 Error Handler (useProjectStore.ts - loadProject)
```typescript
// Handle production not found (deleted)
if (!production || production.is_deleted) {
  await projectDB.deleteProject(id);
  throw new Error('PRODUCTION_DELETED');
}
```

**THREE LOCATIONS** where this check is needed:
1. Cached path (line ~159)
2. Non-cached API fetch path (line ~245)
3. After entity loading (line ~350)

#### 3. App-Level Error Handler (App.tsx)
```typescript
if (error?.message === 'PRODUCTION_DELETED') {
  console.log('🧹 Production was deleted, clearing reference');
  setLastOpenedProjectId(null);
  navigate('/projects');
  return;
}
```

#### 4. Sync Cleanup (useProjectStore.ts - syncWithAPI)
```typescript
// Remove productions that were deleted from API
for (const localProject of localProjects) {
  const existsRemotely = remoteProductions.some(p => p.id === localProject.production.id);
  if (!existsRemotely) {
    await projectDB.deleteProject(localProject.id!);
    console.log(`🗑️ Removed deleted production: ${localProject.production.showName}`);
    
    // Clear lastOpenedProjectId if it matches the deleted production
    const { lastOpenedProjectId, setLastOpenedProjectId } = await import('./usePreferencesStore').then(m => m.usePreferencesStore.getState());
    if (lastOpenedProjectId === localProject.id) {
      console.log('🧹 Clearing lastOpenedProjectId for deleted production');
      setLastOpenedProjectId(null);
    }
  }
}
```

---

## Rules for Code Changes

### BEFORE Making Changes

**1. Search for Affected Components**
```bash
# Check if your change affects production deletion flow
grep -r "PRODUCTION_DELETED" src/
grep -r "onProductionDeleted" src/
grep -r "production:deleted" src/
grep -r "lastOpenedProjectId" src/
```

**2. Check for Import Dependencies**
If modifying Projects.tsx, verify these imports exist:
- `listProjects, deleteProject` from useProjectStore
- `setLastOpenedProjectId` from usePreferencesStore

**3. Test Reset App Flow**
After ANY change to:
- `useProjectStore.ts` (especially loadProject)
- `Projects.tsx` (especially WebSocket listeners)
- `App.tsx` (especially error handlers)
- `useProductionSync.ts` (WebSocket event handling)

MUST test:
1. Reset App in Browser A
2. Hard refresh Browser B
3. Verify no 404 errors
4. Verify production list updates
5. Verify no stale lastOpenedProjectId

### Field Mapping Changes

**When adding/modifying entity fields:**

1. **Update ALL THREE mapping locations**:
   - `loadProject` cached path (~line 207)
   - `loadProject` non-cached path (~line 299)
   - `useProductionSync` WebSocket listeners (~line 130, 175)

2. **Verify field name consistency**:
   - API returns `snake_case` (e.g., `days_before_show`)
   - Frontend uses `camelCase` (e.g., `daysBeforeShow`)
   - Mapping must convert: `daysBeforeShow: item.days_before_show`

3. **Check all entity types**:
   - checklist_items
   - sources
   - sends
   - cameras
   - ccus
   - connections

**Example Field Mapping Template**:
```typescript
checklist: (checklistItems || []).map((item: any) => ({
  id: item.id,
  category: item.category || 'NOTES',
  item: item.title,
  title: item.title,
  completed: item.completed || false,
  completedAt: item.completed_at,
  moreInfo: item.more_info,
  completionNote: item.completion_note,
  daysBeforeShow: item.days_before_show,
  dueDate: item.due_date,
  completionDate: item.completion_date,
  assignedTo: item.assigned_to,
  reference: item.reference
}))
```

### WebSocket Event Changes

**When adding new WebSocket events:**

1. **Check if API broadcasts the event**
   - Look in `api/src/utils/sync-helpers.ts`
   - Events: `{entity}:created`, `{entity}:updated`, `{entity}:deleted`

2. **Add listener in useProductionSync.ts**
   - Subscribe to event
   - Map snake_case → camelCase
   - Update local state
   - Update IndexedDB cache
   - Return unsubscribe function

3. **Test real-time sync**
   - Action in Browser A
   - Verify update in Browser B
   - Check console for broadcast/receive logs

### API Route Changes

**When modifying API routes:**

1. **Check for `synced_at` field usage**
   - Not all tables have this field
   - Use `prepareVersionedUpdate()` only for tables that have it
   - For checklist_items: manually set `version`, `last_modified_by`, `updated_at`

2. **Verify WebSocket broadcasts**
   - After CREATE: call `broadcastEntityCreated()`
   - After UPDATE: call `broadcastEntityUpdate()`
   - After DELETE: call `broadcastEntityDeleted()`

3. **Add error logging**
   - Log request body on errors
   - Include snake_case data if applicable
   - Use null checks for optional variables

---

## Testing Checklist

### For Production Deletion Flow
- [ ] Reset App in Browser A deletes all productions
- [ ] Browser B receives production:deleted event
- [ ] Browser B clears IndexedDB cache
- [ ] Browser B clears lastOpenedProjectId
- [ ] Browser B navigates to /projects
- [ ] No 404 errors in console
- [ ] Production list updates in both browsers

### For Field Mapping Changes
- [ ] Data loads correctly from API
- [ ] Data appears in UI with all fields
- [ ] Due dates/timestamps display
- [ ] WebSocket sync includes all fields
- [ ] No undefined/null values for expected fields

### For Real-Time Sync
- [ ] Create entity in Browser A → appears in Browser B
- [ ] Update entity in Browser A → updates in Browser B
- [ ] Delete entity in Browser A → removes in Browser B
- [ ] Progress/stats update correctly
- [ ] No duplicate items
- [ ] Console shows broadcast/receive logs

---

## Common Mistakes to Avoid

1. **Incomplete field mapping**
   - Adding fields to one location but not others
   - Forgetting to convert snake_case → camelCase

2. **Missing imports**
   - Adding functionality without importing required functions
   - Forgetting to destructure from hooks

3. **WebSocket listener cleanup**
   - Not returning unsubscribe function
   - Not including dependencies in useEffect array

4. **Error scope issues**
   - Referencing variables in catch blocks that might not exist
   - Use null checks or move variable declaration outside try block

5. **Testing only happy path**
   - Not testing deletion flow
   - Not testing multi-browser scenarios
   - Not testing after hard refresh

---

## Recovery Steps

**If Reset App breaks again:**

1. Check console logs in Browser B for exact error
2. Verify production:deleted event is received (🔔 emoji)
3. Check if IndexedDB is cleared (🗑️ emoji)
4. Check if lastOpenedProjectId is cleared (🧹 emoji)
5. Look for 404 errors in network tab
6. Check all 4 components listed at top of this document
7. Run grep commands to find affected code
8. Trace through deletion flow step by step

**Quick Fix Verification**:
```bash
# Check all 4 critical components
grep -A 15 "onProductionDeleted:" src/pages/Projects.tsx
grep -B 2 -A 2 "PRODUCTION_DELETED" src/hooks/useProjectStore.ts
grep -A 10 "PRODUCTION_DELETED" src/App.tsx
grep -A 20 "Remove productions that were deleted" src/hooks/useProjectStore.ts
```

---

## Architecture Notes

### Why This Bug Keeps Happening

1. **Distributed State**: Production data exists in 3 places:
   - PostgreSQL database
   - IndexedDB cache (per browser)
   - localStorage (lastOpenedProjectId)

2. **Async Deletion**: WebSocket event must travel:
   - API deletes from DB → broadcasts event → Browser receives → clears cache

3. **Race Conditions**: Browser B might:
   - Load before receiving deletion event
   - Have stale lastOpenedProjectId
   - Try to fetch deleted production

4. **Multiple Code Paths**: loadProject has 2 paths:
   - Cached (reads IndexedDB first)
   - Non-cached (fetches from API)
   Both need 404 handling

### Design Principles

1. **Fail Gracefully**: Always handle 404 with cache cleanup
2. **Clear Everywhere**: Delete from DB + IndexedDB + localStorage
3. **Event-Driven**: Use WebSocket for real-time cleanup
4. **Defensive Checks**: Verify production exists before using
5. **Consistent Mapping**: All 3 locations use same field mapping

---

## Future Improvements

1. **Centralized Mapping Function**
   - Create `mapChecklistItemFromAPI(item)` helper
   - Use in all 3 locations
   - Single source of truth

2. **Type Safety**
   - Define ChecklistItemAPI type (snake_case)
   - Define ChecklistItem type (camelCase)
   - TypeScript will catch mapping errors

3. **Integration Tests**
   - Automated multi-browser testing
   - Reset App flow verification
   - Field mapping validation

4. **Cache Invalidation Strategy**
   - Time-based expiry
   - Version checking
   - Automatic background sync
