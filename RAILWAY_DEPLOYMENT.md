# Railway Deployment Guide

## Quick Setup (First Time)

Railway detected your monorepo but didn't know which service to build. Follow these steps:

### 1. Create Database Service
1. In Railway dashboard, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway will automatically create a `DATABASE_URL` variable

### 2. Configure API Service
1. Click on your existing service (the one that failed)
2. Go to **Settings** tab
3. Under **"Root Directory"**, set: `video-production-manager/api`
4. Under **"Build Command"** (optional override): Leave empty (uses nixpacks.toml)
5. Under **"Start Command"** (optional override): Leave empty (uses nixpacks.toml)
6. Click **"Deploy"** to trigger a new build

### 3. Set Environment Variables
In the API service, add these variables:
- `NODE_ENV` = `production`
- `DATABASE_URL` = (auto-set from PostgreSQL service, but verify it's connected)
- `PORT` = (Railway auto-sets this, but you can reference it as `$PORT`)

### 4. Frontend Service (Optional - for later)
If deploying frontend separately:
1. Click **"+ New"** → **"GitHub Repo"** → Select same repo
2. Set **"Root Directory"** to: `video-production-manager`
3. Add environment variable: `VITE_API_URL` = `https://[your-api-service].railway.app`

## Current Status
✅ Commits ready to push:
- 90855c3: Duplicate ID handling and source creation bugs fixed
- 0b0cbb2: Save & Duplicate keeps modal open

## Before First Deploy
Ensure database credentials are set properly. The API will automatically:
1. Run `prisma migrate deploy` (apply all migrations)
2. Run `npm run seed:all:prod` (seed equipment types and settings)
3. Start server on port assigned by Railway

## Testing After Deploy
Once deployed, your API will be available at: `https://[your-service].railway.app`

Test endpoints:
- `GET /health` - Should return health status
- `GET /api/sources` - Should return empty array (or existing sources)

## Common Issues

**Build fails at Prisma**: Database might not be connected. Check `DATABASE_URL` is set.

**Migration fails**: Check PostgreSQL service is running and connection string is correct.

**Port errors**: Railway automatically sets `PORT` env var. Make sure your server uses `process.env.PORT`.

## Next Steps After API Deploys
1. Test API endpoints in browser/Postman
2. Create a production in the UI
3. Test WebSocket connections (Socket.io)
4. Optionally deploy frontend service

---
**Note**: For development, continue using `npm run dev` locally. Railway is for production only.
