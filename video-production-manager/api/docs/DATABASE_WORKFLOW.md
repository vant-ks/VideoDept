# 🗄️ Database Development Guide

## Quick Start

### Starting Fresh on a New Branch
```bash
# After pulling a new branch
cd video-production-manager/api
npm run db:reset

# This will:
# 1. Drop all tables and data
# 2. Run all migrations (recreate schema)
# 3. Seed equipment library
# 4. Seed settings
# 5. Create 2 sample productions
```

### Daily Development
```bash
npm run dev              # Start API (auto-connects to local DB)
```

## 📊 Understanding Data Flow

### The Two Databases

```
┌──────────────────────────────────────────────────────────────┐
│  LOCAL DEVELOPMENT DATABASE                                   │
│  postgresql://localhost:5432/video_production                │
│                                                               │
│  - Your private sandbox                                       │
│  - Create/delete test data freely                            │
│  - Never affects production                                   │
│  - Reset anytime with npm run db:reset                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PRODUCTION DATABASE (Railway)                                │
│  postgresql://shinkansen.proxy.rlwy.net:25023/railway        │
│                                                               │
│  - Real client data                                           │
│  - Never connect from local machine                          │
│  - Only accessed by deployed Railway app                     │
│  - Managed through Railway dashboard                         │
└──────────────────────────────────────────────────────────────┘
```

### What Git Tracks

```
✅ IN GIT:
  - Code files (.ts, .tsx)
  - Schema (prisma/schema.prisma)
  - Migrations (prisma/migrations/**/migration.sql)
  - Seed scripts (.ts files)
  - Equipment data (equipment-data.json)

❌ NOT IN GIT:
  - Database data (productions, settings)
  - .env files (contains DATABASE_URL)
  - node_modules
```

## 🛠️ Database Scripts

### Reset Database (Clean Slate)
```bash
npm run db:reset
```
**When to use:**
- Starting work on a new branch
- Database is in a weird state
- Want fresh sample data
- After pulling new migrations

**What it does:**
1. Warns you (3 second countdown)
2. Drops all tables
3. Runs all migrations
4. Seeds equipment library
5. Seeds settings
6. Creates sample productions

### Individual Operations

```bash
# Run only migrations (no data)
npm run db:migrate

# Seed only equipment
npm run seed:equipment

# Seed only settings
npm run seed:settings

# Seed only sample productions
npm run seed:sample

# Seed equipment + settings (for production)
npm run seed:all
```

## 🔧 Environment Setup

### First Time Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Update DATABASE_URL in .env:**
   ```bash
   # Use your PostgreSQL username
   DATABASE_URL="postgresql://kevin@localhost:5432/video_production"
   ```

3. **Create local database:**
   ```bash
   # macOS (with Postgres.app or Homebrew)
   createdb video_production
   
   # Or use PostgreSQL GUI (Postico, pgAdmin, etc.)
   ```

4. **Run initial setup:**
   ```bash
   npm run db:reset
   ```

### Environment Files

```
api/
  ├─ .env.example       ← Template (in Git)
  ├─ .env              ← Your local config (NOT in Git)
  └─ .env.production   ← Railway sets this automatically
```

## 📋 Workflow Examples

### Example 1: Starting a New Feature

```bash
# 1. Pull branch
git checkout feature/signal-flow-enhancement
git pull origin feature/signal-flow-enhancement

# 2. Reset database to clean state
cd video-production-manager/api
npm run db:reset

# 3. Start development
npm run dev

# 4. Create test productions in the app
# ... use the UI to add productions for testing ...

# 5. Done! Commit your code changes
git add src/routes/signals.ts
git commit -m "Add signal flow enhancement"
git push
```

### Example 2: After Pulling New Migrations

```bash
# Someone added a new table/field
git pull origin main

# Your local DB is now out of sync
# Reset to apply new migrations
cd api
npm run db:reset
```

### Example 3: Testing with Clean Data

```bash
# Your test data is messy
npm run db:reset

# Fresh start with 2 sample productions
npm run dev
```

## 🎯 Sample Data

### Sample Productions

The `seed-sample-productions.ts` creates:

1. **Morning News Show**
   - Client: ABC Network
   - Venue: Studio A
   - Status: Planning

2. **Live Concert Special**
   - Client: XYZ Productions
   - Venue: Madison Square Garden
   - Status: Active

### Equipment Library

Seeded from `equipment-data.json`:
- ~30+ equipment specs
- Cameras, switchers, routers, etc.
- Real manufacturer/model data

### Settings

Seeded from `seed-settings.ts`:
- Connector types
- Resolution presets
- Frame rates
- Source types

## 🚨 Safety Features

### Can't Accidentally Touch Production

- `.env` file is in `.gitignore` (never committed)
- Production DATABASE_URL is different from local
- Railway environment is isolated
- No deploy scripts from local machine

### Warning Before Reset

```bash
$ npm run db:reset

⚠️  WARNING: This will delete ALL data in your LOCAL database!
Press Ctrl+C to cancel, or wait 3 seconds...
```

## 🐛 Troubleshooting

### "Database does not exist"
```bash
createdb video_production
npm run db:reset
```

### "Migration failed"
```bash
# Nuclear option - drops everything
npm run db:drop
npm run db:migrate
npm run db:seed:dev
```

### "Can't connect to database"
```bash
# Check PostgreSQL is running
pg_isready

# Check your .env DATABASE_URL
cat .env | grep DATABASE_URL
```

### "Equipment not showing up"
```bash
# Re-export and seed
npm run seed:equipment
```

## 📚 Related Documentation

- [Database Architecture](./DATABASE_ARCHITECTURE.md)
- [Project Rules](./PROJECT_RULES.md)
- [Getting Started Guide](./GETTING_STARTED_DATABASE.md)

## 🎓 Key Concepts

### Migrations vs Seeds

**Migrations** = Schema (tables, columns, indexes)
- Versioned history of schema changes
- Applied in order
- Committed to Git

**Seeds** = Data (rows in tables)
- Populate fresh databases
- Run after migrations
- Scripts committed to Git, data is not

### Local vs Production

**Local Development:**
- Your private database
- Break things safely
- Reset anytime
- Sample/test data

**Production (Railway):**
- Real client data
- High availability
- Automatic backups
- Only accessed by deployed app

### The Source of Truth

When you start the app:
1. Frontend loads (Vite dev server)
2. Frontend calls API (Express server)
3. API connects to database (local PostgreSQL)
4. Database is source of truth
5. Frontend caches in browser storage

**Database → API → Frontend**

Browser storage is just a cache for offline support.
