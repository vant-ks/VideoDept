# Railway API Sync - User Guide

## What Changed

Your Video Production Manager app now **automatically syncs productions** with the Railway cloud database. This means shows you create will be accessible from **any device**, anywhere.

## How It Works

### Automatic Sync
- **Create a show**: Instantly saved to both local browser storage AND Railway database
- **Edit a show**: Changes sync to Railway every time you save
- **Delete a show**: Removed from both local and Railway
- **Open the app**: Automatically downloads any shows from Railway that aren't on your current device

### Hybrid Storage Strategy
The app uses a **hybrid approach** for best performance:

1. **Local-first**: All data is stored in your browser's IndexedDB for instant access (works offline)
2. **Cloud backup**: Every change is also sent to Railway PostgreSQL database
3. **Auto-sync on startup**: When you open the app, it checks Railway and downloads any missing shows

## Using Multiple Devices

### Scenario: Home Desktop + Work Laptop

**At Home (Desktop):**
1. Open the app
2. Create a new show: "Client Event 2026"
3. ✅ Show is saved locally AND to Railway

**At Work (Laptop):**
1. Open the app
2. 🔄 App automatically syncs with Railway
3. ✅ "Client Event 2026" appears in your Projects list
4. Click to open and work on it
5. All changes sync back to Railway

**Back at Home (Desktop):**
1. Refresh the app
2. 🔄 Syncs with Railway
3. ✅ All changes you made at work are now available

## Technical Details

### What Gets Synced
- Production/Show metadata (name, client, venue, dates, status)
- Full project data (sources, sends, equipment, IP addresses, etc.)
- All stored in the `metadata` field of the production record

### API Endpoints Used
- `GET /api/productions` - List all productions
- `POST /api/productions` - Create new production
- `PUT /api/productions/:id` - Update production
- `DELETE /api/productions/:id` - Delete production

### Data Flow
```
Browser (IndexedDB) ←→ React State (Zustand) ←→ Railway API ←→ PostgreSQL
```

## Troubleshooting

### "I don't see my show on another device"

**Check these:**
1. **Wait for sync**: The app syncs on startup. Refresh the page if needed.
2. **Check browser console**: Open DevTools (F12) → Console tab
   - Look for: `✅ Sync complete` (successful)
   - Or: `⚠️ Failed to sync with API` (error)
3. **Verify Railway API**: Check that `VITE_API_URL` is set to Railway URL
4. **Check Network tab**: Verify API calls are going to Railway, not localhost

### "Sync Failed" Messages

If you see warnings in the console:
- **Internet connection**: Check you're online
- **Railway status**: API might be temporarily down
- **Don't worry**: Data is still saved locally and will sync when possible

### Manual Sync

To force a sync, refresh the page. The app checks Railway on every startup.

## Code Changes Made

### Files Modified

1. **src/hooks/useProjectStore.ts**
   - Added `apiClient` import
   - Modified `createProject()` to call `apiClient.createProduction()`
   - Modified `saveProject()` to call `apiClient.updateProduction()`
   - Modified `deleteProject()` to call `apiClient.deleteProduction()`
   - Added `syncWithAPI()` method to download remote productions

2. **src/App.tsx**
   - Added `syncWithAPI()` call during app initialization
   - Runs after equipment data fetch, before loading last project

### Implementation Notes

- Uses **fire-and-forget** pattern: Local saves happen first, API sync in background
- Graceful degradation: If API fails, app still works with local data
- Console logging: All sync operations logged for debugging
- Production ID: Used as unique identifier across devices

## Database Structure

### Railway PostgreSQL Schema

```sql
-- productions table
id            String    @id @default(uuid())
name          String
client        String?
location      String?
productionDate DateTime?
status        String?   @default("planning")
notes         String?
metadata      Json?     -- Full VideoDepProject stored here
createdAt     DateTime  @default(now())
updatedAt     DateTime  @updatedAt
```

The `metadata` field contains the complete project data structure as JSON, preserving all your sources, sends, equipment, etc.

## Future Enhancements

Potential improvements:
- Real-time sync with WebSockets
- Conflict resolution for concurrent edits
- Selective sync (only changed fields)
- Offline queue (store failed syncs and retry)
- Sync indicator in UI (show sync status)

## Testing Your Setup

### Test 1: Create and Verify
1. Create a new show in browser
2. Open browser console
3. Look for: `✅ Production synced to Railway API`
4. Run in terminal: `curl https://videodept-api-production.up.railway.app/api/productions`
5. Should see your new production in the JSON response

### Test 2: Cross-Device
1. Create show on Device A
2. Note the show name
3. Open app on Device B (different browser/computer)
4. Check console for: `🔄 Syncing with Railway API...`
5. Show should appear in Projects list

### Test 3: Edit Sync
1. Open existing show
2. Make changes (add source, change venue, etc.)
3. Save (changes auto-save)
4. Check console for: `✅ Production updated on Railway API`
5. Open on another device to verify changes appear

## Support

If sync isn't working:
1. Check Railway logs: `railway logs --service api`
2. Verify VITE_API_URL in Railway Frontend service variables
3. Test API health: `curl https://videodept-api-production.up.railway.app/health`
4. Check browser console for error messages
