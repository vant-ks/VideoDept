# Railway Deployment Guide - Full Stack Setup

## Architecture Overview
- **API Service**: Node.js/Express backend with PostgreSQL
- **Frontend Service**: Vite/React SPA
- **Database**: PostgreSQL (managed by Railway)

---

## 🚀 Step-by-Step Deployment

### Step 1: Create PostgreSQL Database

1. In Railway dashboard, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway auto-generates `DATABASE_URL` variable
3. Note: This will be automatically linked to services

### Step 2: Deploy API Service (Backend)

#### Configure Existing Service (the one that failed):
1. Click on the failed service
2. Go to **Settings** tab
3. **Service Name**: Rename to `VideoDept-API` (optional but recommended)
4. **Root Directory**: Set to `video-production-manager/api`
5. **Watch Paths**: Leave default (Railway auto-detects)

#### Set Environment Variables for API:
1. Click on **Variables** tab
2. Add/verify these:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (click "Add Reference" → select PostgreSQL → DATABASE_URL)
   - `PORT` = Railway auto-sets, no action needed

#### Deploy:
1. Click **"Deploy"** or **"Redeploy"** 
2. Watch logs for:
   - ✅ npm install
   - ✅ Prisma generate
   - ✅ Build completed
   - ✅ Migrations deployed
   - ✅ Seeds completed
   - ✅ Server listening

3. Once deployed, copy your API URL: `https://[service-name].railway.app`

### Step 3: Deploy Frontend Service

#### Create New Service:
1. Go back to your project dashboard
2. Click **"+ New"** → **"GitHub Repo"**
3. Select repository: `vant-ks/VideoDept`
4. Railway creates a new service

#### Configure Frontend Service:
1. Click on the new service
2. Go to **Settings** tab
3. **Service Name**: Rename to `VideoDept-Frontend`
4. **Root Directory**: Set to `video-production-manager`
5. **Build Command** (optional): Leave empty (uses nixpacks.toml)
6. **Start Command** (optional): Leave empty (uses nixpacks.toml)

#### Set Environment Variables for Frontend:
1. Click on **Variables** tab
2. Add:
   - `VITE_API_URL` = `https://[your-api-service].railway.app/api`
     (Use the URL from Step 2, add `/api` at the end)

Example: If API is `https://videodept-api-production.up.railway.app`
Then set: `VITE_API_URL=https://videodept-api-production.up.railway.app/api`

#### Deploy:
1. Service should auto-deploy
2. Watch logs for:
   - ✅ npm install
   - ✅ Vite build completed
   - ✅ Preview server started

3. Your frontend URL: `https://[frontend-service-name].railway.app`

---

## 🧪 Testing Your Deployment

### Test API:
```bash
# Health check
curl https://[api-url].railway.app/health

# List sources (should return empty array initially)
curl https://[api-url].railway.app/api/sources
```

### Test Frontend:
1. Open `https://[frontend-url].railway.app` in browser
2. Create a new production
3. Add a source in the Computers page
4. Verify real-time sync works

### Test WebSocket Connection:
- Open browser console → Network tab → WS filter
- Should see Socket.io connection to API service
- Try creating/editing sources in multiple browser tabs

---

## 📋 Current Deployment Status

✅ **Commits Pushed:**
- 90855c3: Duplicate ID handling + source creation fixes  
- 0b0cbb2: Save & Duplicate modal fix
- 7200d4a: Railway deployment guide

✅ **Configuration Files:**
- `video-production-manager/api/nixpacks.toml` - Backend build config
- `video-production-manager/nixpacks.toml` - Frontend build config

---

## 🔧 Service Configuration Summary

| Service | Root Directory | Env Vars | URL |
|---------|---------------|----------|-----|
| PostgreSQL | N/A | Auto-configured | Internal |
| API | `video-production-manager/api` | `NODE_ENV`, `DATABASE_URL` | `https://[api].railway.app` |
| Frontend | `video-production-manager` | `VITE_API_URL` | `https://[frontend].railway.app` |

---

## 🐛 Troubleshooting

### API Issues:

**Build fails at Prisma:** 
- Check `DATABASE_URL` is connected to PostgreSQL service
- Verify PostgreSQL service is running

**Migration fails:**
- Check database credentials
- Ensure migrations folder is committed to git

**Server won't start:**
- Check logs for `PORT` variable
- Verify all dependencies installed

### Frontend Issues:

**Build fails:**
- Check `package.json` in `video-production-manager/` folder
- Verify TypeScript has no errors

**Can't connect to API:**
- Verify `VITE_API_URL` is set correctly
- Check API service is running
- Try API health endpoint manually

**CORS errors:**
- API should allow Railway frontend domain
- Check API CORS configuration in `src/server.ts`

---

## 🔄 Updating After Code Changes

1. Commit changes locally: `git commit -m "Your message"`
2. Push to GitHub: `git push origin main`
3. Railway auto-deploys both services
4. Monitor logs in Railway dashboard

---

## 💡 Tips

- **Custom Domains**: Add custom domains in Railway service settings
- **Environment Variables**: Use Railway's environment groups to share vars
- **Logs**: Click any service → View logs for real-time debugging
- **Metrics**: Monitor CPU/Memory usage in service metrics tab
- **Rollback**: Click deployments tab to rollback to previous version

---

## 🎯 Next Steps After Deploy

1. Test all CRUD operations (Create, Read, Update, Delete)
2. Test multi-user sync (open app in multiple browser tabs)
3. Monitor logs for any errors
4. Set up custom domain (optional)
5. Enable Railway's built-in monitoring/alerting
