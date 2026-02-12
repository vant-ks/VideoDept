# 🚨 MIGRATION SAFETY - Quick Reference

**ALWAYS run BEFORE any database migration:**

```bash
npm run db:migrate:check
```

---

## What This Prevents

❌ VS Code crashes (exit code 137)  
❌ Zombie Prisma processes consuming CPU/memory  
❌ Memory exhaustion  
❌ Concurrent migration conflicts  

---

## The Check Script Does

✅ Kills zombie processes  
✅ Validates schema  
✅ Tests database connection  
✅ Checks system memory (need 500MB+)  
✅ Warns about heavy concurrent processes  

---

## Full Migration Workflow

```bash
# 1. BEFORE migration
npm run db:migrate:check

# 2. Run migration
npx prisma migrate dev --name your_migration_name

# 3. AFTER migration - verify cleanup
ps aux | grep -E '(prisma|schema-engine)' | grep -v grep
# Must return 0 processes
```

---

## If Migration Hangs

```bash
# Kill after 30 seconds
pkill -9 -f 'prisma migrate'
pkill -9 -f 'schema-engine'

# Check status
npx prisma migrate status

# Run safety check before retry
npm run db:migrate:check
```

---

## Never Do This

❌ Run Prisma Studio from terminal during migrations  
❌ Run multiple migrations concurrently  
❌ Skip the safety check  
❌ Ignore low memory warnings  

---

## Learn More

- Full details: [CRASH_PREVENTION_SUMMARY.md](CRASH_PREVENTION_SUMMARY.md)
- Script docs: [api/scripts/README.md](video-production-manager/api/scripts/README.md)
- Incident report: [DEVLOG.md](video-production-manager/DEVLOG.md) (Feb 12, 2026)
- Safety protocol: `_Utilities/AI_AGENT_PROTOCOL.md` (Database Migration Safety Protocol)
