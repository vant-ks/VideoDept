# Database-First Architecture for Team Collaboration

## Overview

The Video Production Manager now uses **Railway PostgreSQL as the primary database** for all production data. This enables proper team collaboration with access control as productions develop.

## Architecture Change

### Before (Local-First)
```
IndexedDB (Primary) → Railway API (Optional Sync)
❌ Each browser had isolated data
❌ Railway sync was "nice to have"
❌ Could work offline but data fragmented
```

### After (Database-First)
```
Railway PostgreSQL (PRIMARY) ← All Clients
         ↓
Local IndexedDB (Cache Only)
✅ Railway is single source of truth
✅ All team members see same data
✅ Proper foundation for access control
✅ Internet required (production management is collaborative)
```

## Key Changes

### 1. Create Production
**Old:** Save to IndexedDB, try to sync to Railway (ignore failures)
**New:** 
1. Save to Railway database (REQUIRED - throws error if fails)
2. Cache locally for fast loading (optional, non-critical)

```typescript
// PRIMARY: Save to Railway database first
await apiClient.createProduction({...});
console.log('✅ Production saved to Railway database');

// SECONDARY: Cache locally for offline access
try {
  await projectDB.createProject({...});
  console.log('✅ Production cached locally');
} catch (cacheError) {
  console.warn('⚠️ Failed to cache locally (non-critical):', cacheError);
}
```

### 2. Update Production
**Old:** Save to IndexedDB, try to sync to Railway (ignore failures)
**New:** 
1. Update Railway database (REQUIRED)
2. Update local cache (optional)

### 3. Delete Production
**Old:** Delete from IndexedDB, try to delete from Railway (ignore failures)
**New:** 
1. Delete from Railway database (REQUIRED)
2. Remove from local cache (optional)

### 4. Load Production
**Old:** Load from IndexedDB only
**New:** 
1. Load from local cache for instant display
2. Refresh from Railway in background to get latest changes
3. Update local cache with fresh data

### 5. Sync on Startup
**Old:** Download missing productions from Railway
**New:** 
1. Download new productions
2. Update existing productions with latest from Railway
3. Remove productions deleted from Railway
4. Railway database is authoritative source

## Error Handling

### Critical Errors (Operations Fail)
- `❌ Failed to save production to database`
- `❌ Failed to update production in database`
- `❌ Failed to delete production from database`
- `❌ Failed to sync with Railway database`

Users will see: **"Failed to save to database. Please check your internet connection and try again."**

### Non-Critical Warnings (Operations Continue)
- `⚠️ Failed to cache locally (non-critical)`
- `⚠️ Failed to update local cache (non-critical)`
- `⚠️ Using cached version, could not refresh from database`

These don't block the operation - Railway database operation succeeded.

## Benefits for Team Collaboration

### 1. Single Source of Truth
- Railway database is authoritative
- No data conflicts between team members
- Latest changes always available to everyone

### 2. Foundation for Access Control
- All operations go through Railway API
- Can add authentication/authorization later
- Track who made what changes (audit trail)
- Control who can view/edit productions

### 3. Real-Time Collaboration Ready
- Database-first architecture enables future WebSocket integration
- Easy to add real-time updates
- Proper foundation for collaborative editing

### 4. Data Integrity
- Centralized validation
- Consistent business rules
- Transaction support for complex operations

### 5. Backup & Recovery
- Railway database has automated backups
- Point-in-time recovery available
- No risk of losing data in browser cache

## Network Requirements

### Required Internet Connection
- **Creating productions** - Must reach Railway database
- **Editing productions** - Must reach Railway database
- **Deleting productions** - Must reach Railway database
- **Initial load** - Must sync with Railway

### Cached Viewing Only
If Railway is temporarily unreachable:
- Can view previously loaded productions (from cache)
- Cannot create, edit, or delete
- Will show error messages for write operations

## Future Enhancements

Now that Railway is primary storage, we can add:

### User Authentication
```typescript
// Add to production record
userId: string
teamId: string
permissions: {
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
}
```

### Access Control Lists
```typescript
// Share productions with specific users
shares: [
  { userId: 'user1', role: 'editor' },
  { userId: 'user2', role: 'viewer' }
]
```

### Audit Trail
```typescript
// Track all changes
history: [
  {
    timestamp: Date,
    userId: string,
    action: 'created' | 'updated' | 'deleted',
    changes: {...}
  }
]
```

### Real-Time Sync
```typescript
// WebSocket connection to Railway
socket.on('production:updated', (production) => {
  // Update local cache
  // Notify user of changes
});
```

### Conflict Resolution
- Last-write-wins (current)
- Operational transforms (advanced)
- Manual merge (user decides)

## Testing

### Test 1: Create Show (Both Devices See It)
1. Device A: Create "Test Show 2026"
2. Console shows: `✅ Production saved to Railway database`
3. Device B: Refresh page
4. Console shows: `✅ Downloaded production: Test Show 2026`
5. Both devices see the show

### Test 2: Edit Show (Changes Sync)
1. Device A: Edit show, change venue
2. Console shows: `✅ Production updated in Railway database`
3. Device B: Refresh page
4. Console shows: `✅ Updated production: Test Show 2026`
5. Device B sees venue change

### Test 3: Delete Show (Removed Everywhere)
1. Device A: Delete show
2. Console shows: `✅ Production deleted from Railway database`
3. Device B: Refresh page
4. Console shows: `🗑️ Removed deleted production: Test Show 2026`
5. Show removed from both devices

### Test 4: Offline Behavior
1. Disconnect internet
2. Try to create show
3. See error: "Failed to save to database. Please check your internet connection and try again."
4. Can still view cached shows (read-only)

## Migration Path

### Existing Users with Local Data
If users have productions stored only in IndexedDB:

**Option 1: Automatic on First Edit**
- User opens local show
- Makes any change
- Save operation uploads to Railway
- Now available on all devices

**Option 2: Manual Export/Import**
- Export from IndexedDB as JSON
- Import via Railway API
- Clears local cache, syncs from Railway

**Option 3: Gradual Migration**
- Create new shows → automatically in Railway
- Edit old shows → automatically uploaded to Railway
- Eventually all data migrates naturally

## Console Logging

Users can monitor sync status in browser console:

### Success Flow
```
🔄 Syncing with Railway database...
✅ Downloaded production: Show A
✅ Updated production: Show B
✅ Sync complete - Railway database is source of truth
```

### Create Flow
```
✅ Production saved to Railway database
✅ Production cached locally
```

### Update Flow
```
✅ Production updated in Railway database
✅ Local cache updated
```

### Load Flow
```
✅ Loaded latest version from Railway database
```

## Deployment

Committed and pushed to GitHub: **commit b7e0af9**

Railway auto-deployment triggered for:
- Frontend: New database-first logic
- Backend: Existing production endpoints (no changes needed)

## Summary

✅ **Railway PostgreSQL is now the primary database**
✅ **All devices sync from single source of truth**
✅ **Foundation for multi-user access control**
✅ **Internet connection required for production management**
✅ **Local cache for performance, not primary storage**
✅ **Clear error messages guide users**
✅ **Ready for future collaboration features**

This architecture enables proper team collaboration as productions develop, allowing access control, audit trails, and real-time collaboration features in the future.
