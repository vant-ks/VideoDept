# Railway Deployment Guide - Split Services

This project deploys as two separate Railway services:
1. **Frontend** - Vite React app
2. **API** - Express/Prisma backend

## Setup Instructions

### 1. Create API Service (Backend)

In Railway dashboard:
1. Create new service from repo
2. Set root directory: `video-production-manager/api`
3. Add PostgreSQL database (Railway will auto-provision)
4. Set environment variables:
   ```
   DATABASE_URL=${DATABASE_URL}  # Auto-set by Railway
   PORT=${PORT}                  # Auto-set by Railway
   NODE_ENV=production
   ENABLE_MDNS=false
   ```

### 2. Create Frontend Service

In Railway dashboard:
1. Create new service from repo
2. Set root directory: `video-production-manager` (root)
3. Set environment variables:
   ```
   VITE_API_URL=<your-api-service-url>
   ```

### 3. Link Services

- Frontend needs API URL as environment variable
- Update `VITE_API_URL` in frontend service to point to API service URL

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
