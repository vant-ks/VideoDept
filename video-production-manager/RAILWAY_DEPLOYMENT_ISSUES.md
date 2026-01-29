# Railway Deployment Issues & Fixes

## 🚨 Critical Issues Found

### 1. **NO MIGRATIONS DIRECTORY** ❌
**Problem**: Railway's start command runs `npx prisma migrate deploy` but you have NO migrations folder!
- Location checked: `api/prisma/migrations` - **DOES NOT EXIST**
- Railway will fail to start because `migrate deploy` needs migration files

**Impact**: API service will crash on Railway deployment

---

### 2. **API .env Points to Local Database** ❌
**Problem**: `api/.env` has `DATABASE_URL="postgresql://kevin@localhost:5432/video_production"`
- Railway will use environment variables, but local dev will break
- Risk of accidentally pushing local DB URL

**Impact**: Confusion between local and production environments

---

### 3. **Frontend nixpacks Missing VITE_API_URL** ❌
**Problem**: Frontend nixpacks.toml doesn't set `VITE_API_URL`
- Frontend will default to `http://localhost:3010` in production
- Frontend deployed to Railway won't be able to reach API

**Impact**: Frontend cannot communicate with API - CRITICAL FAILURE

---

### 4. **API nixpacks Start Command Issue** ⚠️
**Problem**: Uses `npx prisma migrate deploy` but no migrations exist
- Should use `npx prisma db push` or create migrations first

**Impact**: API deployment will fail immediately

---

## 🔧 Required Fixes

### Fix 1: Create Initial Migration

You need to create a proper migration from your current schema:

```bash
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"

# Generate initial migration from current schema
npx prisma migrate dev --name init --create-only

# This will create: prisma/migrations/TIMESTAMP_init/migration.sql
```

This creates a migration file that Railway can use with `migrate deploy`.

---

### Fix 2: Update API nixpacks.toml

The start command needs adjustment:

**Option A: Keep using migrations (recommended for production)**
```toml
[start]
cmd = 'npx prisma migrate deploy && npm run start'
```
✅ This is fine IF you have migrations created (Fix 1)

**Option B: Use db push (simpler for now)**
```toml
[start]
cmd = 'npx prisma db push --accept-data-loss && npm run start'
```
⚠️ This works but doesn't track migration history

---

### Fix 3: Update Frontend nixpacks.toml

Add environment variable configuration:

```toml
[phases.setup]
nixPkgs = ['nodejs_20']

[phases.install]
cmds = ['npm install']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'npm run preview'

[variables]
VITE_API_URL = 'https://your-api-service.up.railway.app'
```

**OR** Set in Railway Dashboard:
1. Go to Frontend service → Variables
2. Add: `VITE_API_URL` = `https://your-api-service.up.railway.app`
3. Redeploy

---

### Fix 4: Create .env.railway for Local Development

Keep environments separate:

```bash
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"

cat > .env.railway << 'EOF'
# Railway PostgreSQL Connection
DATABASE_URL="postgresql://postgres:tpWjHEWsoEXHRVDyFMHcAzFlvpYWWnme@shinkansen.proxy.rlwy.net:25023/railway"

# Server
PORT=3010
NODE_ENV=production
ENABLE_MDNS=false

# Optional: Authentication
JWT_SECRET="your-production-secret-change-this"
EOF

# Add to .gitignore
echo ".env.railway" >> .gitignore
```

Use it: `export $(cat .env.railway | xargs) && npm run dev`

---

## 📋 Complete Deployment Checklist

### Step 1: Create Migrations
```bash
cd api
npx prisma migrate dev --name init --create-only
git add prisma/migrations/
git commit -m "Add initial database migration"
```

### Step 2: Update API nixpacks.toml
```bash
# File: api/nixpacks.toml
[phases.setup]
nixPkgs = ['nodejs_20', 'openssl']

[phases.install]
cmds = [
  'npm install',
  'npx prisma generate'
]

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'npx prisma migrate deploy && npm run start'
```

### Step 3: Configure Railway Services

**API Service:**
1. Go to Railway Dashboard → API Service → Variables
2. Verify `DATABASE_URL` is linked to PostgreSQL service
3. Set `NODE_ENV=production`
4. Set `ENABLE_MDNS=false`

**Frontend Service:**
1. Go to Railway Dashboard → Frontend Service → Variables
2. Add `VITE_API_URL` = `https://your-api-service-name.up.railway.app`
   - Get URL from API service's "Settings" → "Networking"
3. Redeploy frontend

### Step 4: Push to Railway
```bash
git add .
git commit -m "Fix Railway deployment configuration"
git push origin main
```

Railway will auto-deploy both services.

### Step 5: Verify Deployment

**Check API:**
```bash
curl https://your-api-service.up.railway.app/health
# Should return: {"status":"ok","timestamp":"...","server":"Video Production API","version":"1.0.0"}

curl https://your-api-service.up.railway.app/api/equipment | jq '. | length'
# Should return: 133

curl https://your-api-service.up.railway.app/api/settings/connector-types
# Should return: array of 17 connector types
```

**Check Frontend:**
- Visit your frontend URL
- Open browser DevTools → Network tab
- Should see successful API calls to Railway API service
- Equipment page should show 133 equipment specs

---

## 🔍 Current Database Verification

Your Railway database currently has:
- ✅ 133 Equipment Specs
- ✅ 17 Connector Types
- ✅ 8 Source Types
- ✅ 8 Frame Rates
- ✅ 9 Resolutions

**Data is intact!** The issue is just configuration.

---

## 🚀 Quick Fix Script

Run this to fix everything at once:

```bash
#!/bin/bash
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager"

echo "🔧 Creating initial migration..."
cd api
npx prisma migrate dev --name init --create-only

echo "✅ Migration created!"
echo ""
echo "📝 Next steps:"
echo "1. Go to Railway Dashboard"
echo "2. Frontend Service → Variables → Add VITE_API_URL"
echo "3. Set to your API service URL (check API service → Settings → Networking)"
echo "4. Git commit and push:"
echo "   git add ."
echo "   git commit -m 'Fix Railway deployment'"
echo "   git push"
```

---

## 🎯 Expected Result

After fixes:
1. ✅ API deploys successfully with migrations
2. ✅ Frontend connects to Railway API
3. ✅ Equipment library loads 133 specs
4. ✅ All settings (connectors, sources, etc.) available
5. ✅ Can create/edit productions with full data

---

## 🐛 Troubleshooting

### If API fails to start on Railway:
- Check Railway logs: "View Logs" button
- Look for Prisma errors
- Verify `DATABASE_URL` is set correctly

### If Frontend shows empty equipment:
- Check browser console for CORS errors
- Verify `VITE_API_URL` is set in Railway
- Check Network tab - API calls should go to Railway, not localhost

### If "filter is not a function" error:
- Frontend is receiving non-array data
- Check API endpoint returns arrays
- Verify equipment fetch is successful

---

## 📊 Service URLs Reference

**Find your service URLs in Railway Dashboard:**

1. **API Service URL:**
   - Click API service → Settings → Networking
   - Copy the public URL (e.g., `video-dept-api-production-abc123.up.railway.app`)
   - Use with https: `https://video-dept-api-production-abc123.up.railway.app`

2. **Frontend Service URL:**
   - Click Frontend service → Settings → Networking
   - Copy the public URL
   - This is where users access your app

3. **Database:**
   - PostgreSQL service → Connect
   - DATABASE_URL is automatically injected into API service
