# Railway Setup Checklist

Use this as you configure Railway. Check off each step as you complete it.

## ☑️ Pre-Deployment
- [x] Code committed and pushed to GitHub
- [x] Repository: `vant-ks/VideoDept`
- [x] Main branch is up to date

## 📦 Step 1: Database
- [ ] Create PostgreSQL service in Railway
- [ ] Verify `DATABASE_URL` variable was auto-created
- [ ] Note database name for reference

## 🔧 Step 2: API Service
- [ ] Click on the failed/existing service
- [ ] Rename service to `VideoDept-API` (optional)
- [ ] Set Root Directory: `video-production-manager/api`
- [ ] Add environment variable: `NODE_ENV` = `production`
- [ ] Link to PostgreSQL (add reference to `DATABASE_URL`)
- [ ] Deploy/Redeploy the service
- [ ] Wait for build to complete (watch logs)
- [ ] Verify migrations ran successfully
- [ ] Verify seeds completed
- [ ] Copy API URL: `https://__________.railway.app`
- [ ] Test: `curl https://[api-url]/health`

## 🎨 Step 3: Frontend Service
- [ ] Create new service from GitHub repo
- [ ] Select repository: `vant-ks/VideoDept`
- [ ] Rename service to `VideoDept-Frontend` (optional)
- [ ] Set Root Directory: `video-production-manager`
- [ ] Add environment variable: `VITE_API_URL` = `https://[API-URL]/api`
  - Your URL: `https://________________________________/api`
- [ ] Deploy the service
- [ ] Wait for build to complete
- [ ] Copy Frontend URL: `https://__________.railway.app`
- [ ] Open in browser

## ✅ Step 4: Testing
- [ ] Frontend loads in browser
- [ ] Can create a new production
- [ ] Can add sources in Computers page
- [ ] Can edit sources
- [ ] Can delete sources
- [ ] "Save & Duplicate" works
- [ ] Duplicate ID warnings show in red
- [ ] Open in second browser tab - verify real-time sync
- [ ] Check WebSocket connection in browser console (Network → WS)

## 🎯 Final Configuration
- [ ] All services showing "Active" status
- [ ] No errors in logs
- [ ] API health endpoint responding
- [ ] Frontend connects to API successfully

---

## 📝 Notes / URLs

**PostgreSQL:**
- Connection string: (in Railway variables)

**API Service:**
- URL: https://
- Status: 
- Notes:

**Frontend Service:**
- URL: https://
- Status:
- Notes:

---

## 🚨 If Something Fails

**Build Error?**
1. Check logs in Railway dashboard
2. Verify Root Directory is correct
3. Check environment variables are set

**API Won't Start?**
1. Verify DATABASE_URL is connected
2. Check migrations completed
3. Look for errors in logs

**Frontend Can't Reach API?**
1. Verify VITE_API_URL has `/api` at the end
2. Check API service is running
3. Test API health endpoint directly

**WebSocket Issues?**
1. Check API logs for Socket.io startup
2. Verify no CORS errors in browser console
3. Confirm API URL is correct

---

✅ **Setup Complete!** 

Both services are deployed and syncing. You can now access your app at the Frontend URL.
