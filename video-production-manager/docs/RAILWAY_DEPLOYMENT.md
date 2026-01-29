# Railway Deployment Guide - Split Services

This project deploys as two separate Railway services:
1. **Frontend** - Vite React app  
2. **API** - Express/Prisma backend

## Current Status

- Frontend service "VideoDept" is already deployed ✅
- Need to add API service

## Setup Instructions

### 1. Add PostgreSQL Database

In Railway dashboard (project "video-dept"):
1. Click **+ New**
2. Select **Database** → **Add PostgreSQL**
3. This creates a database and auto-generates `DATABASE_URL`

### 2. Create API Service

In Railway dashboard:
1. Click **+ New** → **GitHub Repo**
2. Select your VideoDept repository
3. **Service Settings:**
   - Name: `VideoDept-API` (or similar)
   - **Root Directory**: `video-production-manager/api`
   - **Watch Paths**: `video-production-manager/api/**`
4. **Environment Variables** (in service settings):
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}  # Link to your PostgreSQL
   NODE_ENV=production
   ENABLE_MDNS=false
   ```
5. Deploy service

### 3. Update Frontend Service

In your existing "VideoDept" frontend service:
1. Go to **Settings** → **Variables**
2. Add environment variable:
   ```
   VITE_API_URL=https://<your-api-service-domain>.railway.app
   ```
   (Get this URL from your API service after it deploys)
3. **Settings** → **Service**:
   - Verify **Root Directory**: `video-production-manager`
   - **Watch Paths**: `video-production-manager/**` (but not `**/api/**`)
4. Redeploy

## Deployment Files

- **Frontend**: `video-production-manager/nixpacks.toml`
- **API**: `video-production-manager/api/nixpacks.toml`

## Database Migrations

API service automatically runs migrations on deploy:
```bash
npx prisma migrate deploy
```

## Manual Deploy Commands (if needed)

```bash
# Deploy API
cd api
railway up

# Deploy Frontend  
cd ..
railway up
```

## GitHub Auto-Deploy

Connect both services to your GitHub repo and enable auto-deploy on push to `main`.
