# Railway Database Migration Solutions

**Problem**: Running `npx prisma migrate dev` crashes VS Code when trying to migrate to Railway Postgres.

**Root Cause**: The interactive prompts in `prisma migrate dev` are causing VS Code's terminal to crash.

## Current Status

✅ `.env` file found: Currently points to local PostgreSQL  
✅ `schema.prisma` is valid and complete  
❌ No migrations directory exists yet  
❌ Need to connect to Railway Postgres and create tables

---

## 🎯 RECOMMENDED SOLUTIONS (Ordered by Success Likelihood)

### Solution 1: Use `prisma db push` (EASIEST - Try This First!)

**Why**: Non-interactive, synchronizes schema directly without migration files. Perfect for initial setup.

```bash
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"

# Set Railway DATABASE_URL temporarily for this terminal session
export DATABASE_URL="postgresql://YOUR_RAILWAY_USER:YOUR_RAILWAY_PASSWORD@YOUR_RAILWAY_HOST:PORT/railway?schema=public"

# Push schema directly (no migration files, no prompts)
npx prisma db push

# Verify tables were created
npx prisma studio
```

**Pros**: 
- ✅ Zero interaction required
- ✅ No migration files to manage initially
- ✅ Won't crash VS Code
- ✅ Perfect for development/staging

**Cons**:
- ⚠️ Doesn't create migration history (but you can add migrations later)

---

### Solution 2: Generate Migrations Locally, Deploy Non-Interactively

**Why**: Creates proper migration files without applying them, then deploys without prompts.

```bash
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"

# Step 1: Generate migration files ONLY (no database connection needed)
npx prisma migrate dev --create-only --name init

# This creates: prisma/migrations/TIMESTAMP_init/migration.sql
# VS Code might prompt for a name - just type "init" and hit Enter once

# Step 2: Set Railway connection
export DATABASE_URL="postgresql://YOUR_RAILWAY_USER:YOUR_RAILWAY_PASSWORD@YOUR_RAILWAY_HOST:PORT/railway?schema=public"

# Step 3: Deploy migrations (100% non-interactive)
npx prisma migrate deploy
```

**Pros**:
- ✅ Creates proper migration history
- ✅ `migrate deploy` is completely non-interactive
- ✅ Production-ready approach

**Cons**:
- ⚠️ Step 1 might still crash (but less likely with --create-only)

---

### Solution 3: Use External Terminal (Bypass VS Code Entirely)

**Why**: VS Code's integrated terminal is crashing. Use macOS Terminal or iTerm2 instead.

```bash
# Open Terminal.app or iTerm2 (NOT VS Code terminal)
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"

export DATABASE_URL="postgresql://YOUR_RAILWAY_USER:YOUR_RAILWAY_PASSWORD@YOUR_RAILWAY_HOST:PORT/railway?schema=public"

npx prisma migrate dev --name init
```

**Pros**:
- ✅ Completely bypasses VS Code crash issue
- ✅ Standard Prisma workflow

**Cons**:
- ⚠️ Need to use separate terminal app

---

### Solution 4: Create .env.railway File

**Why**: Keep local and Railway configs separate, explicitly load Railway config when needed.

```bash
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"

# Create Railway-specific env file
cat > .env.railway << 'EOF'
DATABASE_URL="postgresql://YOUR_RAILWAY_USER:YOUR_RAILWAY_PASSWORD@YOUR_RAILWAY_HOST:PORT/railway?schema=public"
NODE_ENV=production
ENABLE_MDNS=false
EOF

# Use it for migration (won't interfere with local .env)
npx dotenv-cli -e .env.railway -- npx prisma migrate deploy

# OR manually:
export $(cat .env.railway | xargs) && npx prisma db push
```

**Pros**:
- ✅ Keeps environments completely separate
- ✅ No risk of breaking local database
- ✅ Easy to switch contexts

---

### Solution 5: Generate SQL and Apply Manually in Railway Dashboard

**Why**: Most manual but guaranteed to work. No crashes possible.

```bash
# Step 1: Generate migration SQL locally
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"

npx prisma migrate dev --create-only --name init
# Find generated SQL in: prisma/migrations/TIMESTAMP_init/migration.sql

# Step 2: Copy the SQL content
cat prisma/migrations/*/migration.sql

# Step 3: Go to Railway Dashboard
# - Open your PostgreSQL database
# - Go to "Query" or "Data" tab
# - Paste and execute the SQL
# - Manually create _prisma_migrations table:

CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

# Insert migration record
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count, started_at)
VALUES (gen_random_uuid(), 'MIGRATION_CHECKSUM', now(), 'MIGRATION_NAME', 1, now());
```

**Pros**:
- ✅ 100% guaranteed to work
- ✅ No crashes, no terminal issues
- ✅ Full control over what gets executed

**Cons**:
- ⚠️ Most manual work
- ⚠️ Need to track checksum properly

---

### Solution 6: Use Railway CLI

**Why**: Let Railway handle everything remotely.

```bash
# Install Railway CLI
brew install railway

# Login
railway login

# Link to your project
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"
railway link

# Run migration in Railway's environment
railway run npx prisma migrate deploy

# OR just push the schema
railway run npx prisma db push
```

**Pros**:
- ✅ Uses Railway's environment directly
- ✅ No local connection issues
- ✅ Perfect for production deployments

**Cons**:
- ⚠️ Requires Railway CLI installation
- ⚠️ Need to link project first

---

## 🔧 Getting Your Railway DATABASE_URL

You need your Railway PostgreSQL connection string. Get it from:

1. **Railway Dashboard**:
   - Go to your project
   - Click on the PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` value

2. **Format** should look like:
   ```
   postgresql://postgres:PASSWORD@monorail.proxy.rlwy.net:12345/railway?schema=public
   ```

---

## 📋 Step-by-Step: My Recommended Approach

```bash
# 1. Get Railway DATABASE_URL from dashboard (copy it)

# 2. Open Terminal.app (NOT VS Code terminal)
cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"

# 3. Set the Railway connection (paste your actual URL)
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@monorail.proxy.rlwy.net:PORT/railway"

# 4. Push schema directly (easiest, no crashes)
npx prisma db push

# 5. Verify it worked
npx prisma studio
# This will open Prisma Studio - you should see all your tables

# 6. Generate Prisma Client
npx prisma generate

# 7. Test the connection
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('✅ Connected to Railway!')).catch(e => console.error('❌ Error:', e));"
```

---

## 🚀 After Migration: Update Railway Deployment

Once tables are created, your Railway API service should have this build command in `nixpacks.toml` or Railway settings:

```bash
npx prisma generate && npm run build
```

And start command:
```bash
npx prisma migrate deploy && npm start
```

This ensures migrations run automatically on each Railway deployment.

---

## 🐛 Troubleshooting

### If db push fails with "relation already exists"
```bash
# Reset the database (⚠️ DELETES ALL DATA)
npx prisma migrate reset --skip-seed

# Or drop and recreate via Railway dashboard
```

### If you get SSL errors
Add `?sslmode=require` to your DATABASE_URL:
```
postgresql://user:pass@host:port/db?sslmode=require&schema=public
```

### If connection times out
- Check Railway database is running
- Verify your IP isn't blocked (Railway allows all IPs by default)
- Test connection: `psql "YOUR_DATABASE_URL"`

---

## ✅ Success Checklist

- [ ] Railway PostgreSQL database exists
- [ ] DATABASE_URL obtained from Railway dashboard
- [ ] Schema pushed successfully (tables created)
- [ ] Prisma Studio shows all tables
- [ ] Seed scripts run successfully
- [ ] API can connect to Railway database
- [ ] Railway deployment configured with migration commands


cd "/Users/kevin/Dropbox (Personal)/Development/VideoDept/VideoDept/video-production-manager/api"

export DATABASE_URL="postgresql://postgres:tpWjHEWsoEXHRVDyFMHcAzFlvpYWWnme@shinkansen.proxy.rlwy.net:25023/railway"

npx prisma db push