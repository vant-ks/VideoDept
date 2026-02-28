# 🚨 STOP - Read Before Creating Migrations

**Last Updated:** February 27, 2026

**This project has experienced MULTIPLE VS Code crashes from `prisma migrate dev`.**

---

## ✅ RECOMMENDED: Use `prisma db push` for Local Development

**DO NOT use `prisma migrate dev` for local schema changes. It crashes VS Code.**

```bash
# CORRECT approach for local development:
# 1. Edit schema.prisma
# 2. Validate
npx prisma validate

# 3. Push to database (no migration file, no crashes)
npx prisma db push

# 4. Restart dev server to load new Prisma Client
pkill -9 -f 'tsx watch' && sleep 2 && cd ../../ && npm run dev
```

**Why:**
- ✅ No VS Code crashes (bypasses schema-engine)
- ✅ Fast (70ms vs 30+ seconds)
- ✅ Perfect for iterative development
- ✅ No migration file clutter during WIP

**Create migrations ONLY for production deployment:**
```bash
# When feature is complete and ready to deploy:
npx prisma migrate dev --name feature_name
git add prisma/migrations/
git commit -m "feat: add feature_name"
```

See [DB_DEVELOPMENT_LESSONS.md](../../../docs/DB_DEVELOPMENT_LESSONS.md) for full context.

---

## ⚠️ IF YOU MUST CREATE MIGRATIONS (Production Only)

---

## ✅ Pre-Migration Safety Checklist

**Run these commands IN ORDER before running `prisma migrate`:**

```bash
# 1. Validate schema syntax (catches common errors)
npx prisma validate
# Expected: "The schema is valid ✔"

# 2. Check migration status (ensures no drift)
npx prisma migrate status
# Expected: "Database schema is up to date!"

# 3. Run automated safety check
npm run db:migrate:check
# This script kills zombie processes and verifies system readiness

# 4. MANUALLY verify no Prisma processes running
ps aux | grep -E '(prisma|schema-engine)' | grep -v grep
# Expected: NO OUTPUT (0 processes)
```

---

## 🛑 STOP CONDITIONS - Never Proceed When:

### 1. Prisma Asks to Reset Schema

If you see this message:
```
⚠️ We need to reset the "public" schema at...
Do you want to continue? All data will be lost.
```

**→ STOP IMMEDIATELY. DO NOT ANSWER "yes".**

**This means:**
- Your `schema.prisma` doesn't match the database
- Schema drift detected (previous migration failed or schema changed without migration)
- Invalid syntax in schema file
- Previous migration was reverted in git

**What to do:**
1. Run `npx prisma migrate status` to see which migrations are applied
2. Check git history: `git log --oneline -10 -- prisma/schema.prisma`
3. If drift is from development changes, run `npm run db:reset` to start fresh
4. If drift is from production, investigate carefully - DO NOT reset

### 2. Migration Fails

**Never retry immediately.** Each retry without investigation increases crash risk.

**What to do:**
1. Document the error message
2. Check the generated migration SQL file
3. Verify schema syntax with `npx prisma validate`
4. Kill any hung processes: `pkill -9 -f 'schema-engine'`
5. Investigate root cause before retrying

### 3. Schema Validation Fails

If `npx prisma validate` shows errors, **fix schema.prisma BEFORE creating migration.**

---

## 🚫 Common Mistakes That Cause Crashes

### ❌ Wrong: PostgreSQL UUID syntax
```prisma
uuid String @id @default(uuid())  // INVALID - causes reset prompt
```

### ✅ Correct: PostgreSQL UUID syntax
```prisma
uuid String @id @default(dbgenerated("gen_random_uuid()"))  // VALID
```

### ❌ Wrong: Running migrations with zombie processes
```bash
# Multiple schema-engine processes running
prisma migrate dev  # Will cause crash
```

### ✅ Correct: Kill zombies first
```bash
pkill -9 -f 'schema-engine'
sleep 2
prisma migrate dev  # Safe
```

### ❌ Wrong: Multiple concurrent migrations
```bash
prisma migrate dev --name change1 & 
prisma migrate dev --name change2  # CRASH RISK
```

### ✅ Correct: ONE migration at a time
```bash
prisma migrate dev --name change1
sleep 2  # Wait between migrations
prisma migrate dev --name change2
```

---

## 📋 Safe Migration Workflow

**Follow this pattern EVERY TIME:**

```bash
# Step 1: Pre-flight checks (from project root)
cd video-production-manager/api
npm run db:migrate:check

# Step 2: Validate schema
npx prisma validate

# Step 3: Create migration (development only)
npx prisma migrate dev --name descriptive_name

# Step 4: Wait for completion message
# Look for: "Your database is now in sync with your schema"

# Step 5: Verify success
npx prisma migrate status

# Step 6: Verify no hung processes
ps aux | grep -E '(prisma|schema-engine)' | grep -v grep
# Expected: NO OUTPUT

# Step 7: Regenerate client
npx prisma generate

# Step 8: If doing multiple migrations, PAUSE
sleep 2

# Then repeat from Step 2 for next migration
```

---

## 🔍 Troubleshooting Guide

### VS Code Crashes (Exit Code 137)
**Cause:** Memory exhaustion from multiple schema-engine processes  
**Solution:** Kill all Prisma processes before migration

### Migration Hangs Indefinitely
**Cause:** Database locked by another process  
**Solution:** Close Prisma Studio, DB tools, identify locking process

### "Schema drift detected"
**Cause:** Schema.prisma changed without migration, or migration reverted  
**Solution:** Check git history, consider `npm run db:reset` in development

### Invalid Migration SQL Generated
**Cause:** Incorrect Prisma syntax (especially `@default` functions)  
**Solution:** Review schema.prisma for PostgreSQL-specific syntax

---

## 📖 Complete Documentation

**For comprehensive rules and crash scenarios:**
- [MIGRATION_CRASH_PREVENTION_RULE.md](../../../../../_Utilities/MIGRATION_CRASH_PREVENTION_RULE.md)
- [PROJECT_RULES.md](../../docs/PROJECT_RULES.md) - See Pillar #13
- [AI_AGENT_PROTOCOL.md](../../../../../_Utilities/AI_AGENT_PROTOCOL.md) - See "Database Migration Safety"

---

## 🎯 Remember

**The #1 cause of migration crashes:**
- Proceeding when Prisma asks to "reset schema"
- This is NEVER normal migration behavior
- It's a warning sign that something is wrong

**When in doubt:**
1. STOP
2. Document the state
3. Check git history
4. Ask for help
5. Never retry blindly

---

**Last Updated:** February 26, 2026  
**Authority:** This is a MANDATORY safety protocol for all database work
