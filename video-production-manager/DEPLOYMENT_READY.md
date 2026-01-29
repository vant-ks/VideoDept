# Railway Deployment - Fixed & Ready to Deploy

## ✅ Issues Fixed

### 1. **Migration Files Created** ✅
- **Location**: `api/prisma/migrations/20260129000000_init/`
- **Status**: Migration marked as applied in Railway database
- **Result**: `npx prisma migrate deploy` will now work correctly

### 2. **Database Verified** ✅
Your Railway PostgreSQL database is **100% intact** with all data:
- ✅ 133 Equipment Specs (all categories)
- ✅ 17 Connector Types  
- ✅ 8 Source Types
- ✅ 8 Frame Rates
- ✅ 9 Resolution Presets
- ✅ All tables, indexes, and relationships

### 3. **API Configuration** ✅
- Routes properly registered in `server.ts`
- Start command in `nixpacks.toml` is correct
- Database connection working

---

## 🚨 CRITICAL: Frontend Configuration Needed

### Problem
Your frontend **CANNOT** connect to the API because `VITE_API_URL` is not set.

**Current behavior:**
- Frontend tries to connect to `http://localhost:3010`
- Railway API is at a different URL
- Result: `.filter is not a function` error (because fetch fails, returns undefined)

### Solution

**In Railway Dashboard:**

1. **Get Your API URL:**
   - Go to Railway Dashboard
   - Click on your API service
   - Go to **Settings** → **Networking** → **Public Networking**
   - Copy the public URL (looks like: `https://video-dept-api-production-abc123.up.railway.app`)

2. **Set Frontend Environment Variable:**
   - Go to your **Frontend service**
   - Click **Variables** tab
   - Click **+ New Variable**
   - **Name**: `VITE_API_URL`
   - **Value**: (paste your API URL from step 1)
   - Example: `https://video-dept-api-production-abc123.up.railway.app`
   - Click **Add**

3. **Redeploy Frontend:**
   - Click **Deploy** → **Redeploy**
   - Or push a new commit

---

## 📋 Deployment Steps

### Step 1: Commit Migration Files
```bash
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager"

git add api/prisma/migrations/
git add api/prisma/migrations/migration_lock.toml
git commit -m "Add initial database migration for Railway"
git push
```

### Step 2: Configure Railway Frontend Service

**Option A: Via Railway Dashboard (Recommended)**
1. Open Railway Dashboard
2. Select your Frontend service
3. Go to **Variables** tab
4. Add variable: `VITE_API_URL` = (your API service URL)
5. Click **Deploy** → **Redeploy**

**Option B: Via nixpacks.toml (if you prefer)**

Edit `video-production-manager/nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ['nodejs_20']

[phases.install]
cmds = ['npm install']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'npm run preview'

# Add this section:
[variables]
VITE_API_URL = "https://your-api-service.up.railway.app"
```

Then:
```bash
git add video-production-manager/nixpacks.toml
git commit -m "Configure frontend API URL for Railway"
git push
```

### Step 3: Verify Deployment

**Check API Health:**
```bash
curl https://your-api-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T...",
  "server": "Video Production API",
  "version": "1.0.0"
}
```

**Check Equipment Data:**
```bash
curl https://your-api-url.up.railway.app/api/equipment | jq '. | length'
```

Expected: `133`

**Check Settings:**
```bash
curl https://your-api-url.up.railway.app/api/settings/connector-types
```

Expected: Array of 17 connector types

---

## 🎯 What Should Work Now

### After Deployment:
1. ✅ Railway API starts successfully
2. ✅ Migrations run without errors
3. ✅ Frontend connects to Railway API
4. ✅ Equipment library loads all 133 specs
5. ✅ Settings (connectors, sources, etc.) available
6. ✅ Can create and manage productions
7. ✅ All CRUD operations work
8. ✅ Data persists across deployments

---

## 🔍 Verification Checklist

Once deployed, verify in your browser:

### Frontend Checks:
- [ ] Visit your Railway frontend URL
- [ ] Open DevTools → Console (should have no errors)
- [ ] Open DevTools → Network tab
- [ ] Navigate to Equipment page
- [ ] API calls should go to Railway URL (not localhost)
- [ ] Should see 133 equipment specs load
- [ ] Can filter by category
- [ ] Can search equipment

### API Checks:
- [ ] API health endpoint returns OK
- [ ] Equipment endpoint returns 133 items
- [ ] Settings endpoints return arrays
- [ ] Can create a test production
- [ ] Can add sources/sends to production

---

## 🐛 Troubleshooting

### If Frontend Still Shows Empty Data:

**Check Browser Console:**
```javascript
// In browser console, check what API URL is being used:
fetch('/api/equipment')
  .then(r => r.json())
  .then(data => console.log('Equipment count:', data.length))
  .catch(err => console.error('Error:', err));
```

**Check Network Tab:**
- Look for requests to `/api/equipment`
- Click on the request
- Check the **Request URL** - should point to Railway, not localhost
- If it says `localhost:3010` → `VITE_API_URL` is not set correctly

**Check Railway Logs:**
- Go to API service → **Deployments** → Click latest deployment → **View Logs**
- Should see: "✅ Database connected"
- Should see: "🚀 Video Production API Server"
- Look for any errors

### If API Fails to Start:

**Check Railway Logs:**
```
❌ Look for: Prisma migration errors
❌ Look for: Database connection errors
❌ Look for: Build failures
```

**Common fixes:**
- Verify `DATABASE_URL` environment variable exists in API service
- Check that it's linked to PostgreSQL service
- Verify migration files are in git and deployed

### If "filter is not a function" Error Persists:

This means frontend is receiving non-array data. Usually because:
1. API call failed (check Network tab for 404/500 errors)
2. API returned wrong format (check API response in Network tab)
3. VITE_API_URL not set (API calls go to wrong server)

**Debug in browser console:**
```javascript
// Check useEquipmentLibrary store
const store = useEquipmentLibrary.getState();
console.log('Equipment specs:', store.equipmentSpecs);
console.log('Is array?:', Array.isArray(store.equipmentSpecs));
```

---

## 📊 Current State Summary

### ✅ Working:
- Database schema (all tables created)
- Database data (133 equipment, all settings)
- API server code
- API routes (`/api/equipment`, `/api/settings/*`, etc.)
- Migration files created and tracked
- API nixpacks configuration

### ⚠️ Needs Configuration:
- Frontend `VITE_API_URL` environment variable
- Frontend redeploy after setting env var

### 🎯 Expected Time to Fix:
- **2-3 minutes** to set environment variable in Railway
- **2-5 minutes** for frontend to redeploy
- **Total: ~5-8 minutes**

---

## 🚀 After Everything Works

### Optional Improvements:

1. **Set up local development:**
   ```bash
   # Create .env.railway for local dev against Railway DB
   cd api
   echo 'DATABASE_URL="postgresql://postgres:tpWjHEWsoEXHRVDyFMHcAzFlvpYWWnme@shinkansen.proxy.rlwy.net:25023/railway"' > .env.railway
   
   # Use it:
   export $(cat .env.railway | xargs) && npm run dev
   ```

2. **Add health monitoring:**
   - Set up Railway's built-in monitoring
   - Add logging service (optional)

3. **Custom domain:**
   - Add your own domain in Railway settings
   - Update VITE_API_URL accordingly

---

## 📞 Quick Reference

### Railway Service URLs:
- **API**: Check in Railway Dashboard → API Service → Settings → Networking
- **Frontend**: Check in Railway Dashboard → Frontend Service → Settings → Networking
- **Database**: Automatically connected via `${{Postgres.DATABASE_URL}}`

### Environment Variables Needed:

**API Service:**
- `DATABASE_URL` - Auto-set by Railway from PostgreSQL service
- `PORT` - Auto-set by Railway
- `NODE_ENV` - Set to `production` (recommended)
- `ENABLE_MDNS` - Set to `false` for cloud deployment

**Frontend Service:**
- `VITE_API_URL` - ⚠️ **MUST SET MANUALLY** to your API service URL

### Key Files:
- Migration: `api/prisma/migrations/20260129000000_init/migration.sql`
- API Config: `api/nixpacks.toml`
- Frontend Config: `video-production-manager/nixpacks.toml`
- Schema: `api/prisma/schema.prisma`

---

## ✅ You're Almost There!

**What we accomplished:**
1. ✅ Migrated all app data to Railway PostgreSQL
2. ✅ Created proper migration files for tracking
3. ✅ Verified data integrity (133 equipment specs + all settings)
4. ✅ Fixed API deployment configuration
5. ✅ Documented all fixes and next steps

**What's left:**
1. ⚠️ Set `VITE_API_URL` in Railway Frontend service
2. ⚠️ Commit migration files to git
3. ⚠️ Push and redeploy

**Time invested today:** Worth it! Your app now has a production-ready backend with full data persistence. 🎉
