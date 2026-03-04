# VS Code Crash Prevention - Implementation Summary

**Date:** February 12, 2026  
**Issue:** VS Code repeatedly crashing during database migrations (exit code 137 - SIGKILL)  
**Git Commit:** 5f4bddf

---

## 🔴 Problem Diagnosed

### The Crash
VS Code crashed with exit code 137 (SIGKILL = forced termination due to memory pressure) when attempting a database migration.

### Root Cause
**7 zombie Prisma processes** running simultaneously:
1. **PID 26833**: schema-engine (since Monday 7PM - 40+ hours) consuming **103.7% CPU**
2. **PID 50257**: `prisma migrate` (add_uuid_and_field_versions) - hung
3. **PID 48424**: `prisma studio --port 5555` - **protocol violation** ❌
4. **PID 40782**: `prisma migrate` (add_uuid_primary_keys_to_entities) - hung
5. **PID 33997**: `prisma migrate` (add_field_versions_to_entities) - hung
6. **PID 32601**: `prisma migrate` (add_uuid_to_cameras_ccus) - hung
7. **PID 58205**: `prisma migrate` (add_field_versions) - final attempt that triggered crash

### Why It Happened
- **No pre-migration cleanup** - zombies accumulated across sessions
- **Prisma Studio running from terminal** (explicitly forbidden by existing protocols)
- **Multiple concurrent migrations** (each hung, never terminated)
- **New migration spawned** while 6 others hung → memory exhaustion → SIGKILL
- **Existing protocols were documented but not enforced** - no automated checks

### Protocol Violations
Despite having documentation in 3 files, protocols weren't followed:
- ❌ [CRASH_AUDIT_2026-01-30.md](docs/CRASH_AUDIT_2026-01-30.md#L56): "Never run Prisma Studio from terminal"
- ❌ [DB_DEVELOPMENT_LESSONS.md](docs/DB_DEVELOPMENT_LESSONS.md#L142): "Check memory before operations"
- ❌ [AI_AGENT_PROTOCOL.md](_Utilities/AI_AGENT_PROTOCOL.md#L454): "Sequential operations only"
- ❌ [AI_AGENT_PROTOCOL.md](_Utilities/AI_AGENT_PROTOCOL.md#L466): "Kill existing processes first"

**Key Insight:** Documentation alone is insufficient - automation required.

---

## ✅ Solutions Implemented

### 1. Automated Pre-Migration Safety Script

**File:** [video-production-manager/api/scripts/pre-migration-check.sh](video-production-manager/api/scripts/pre-migration-check.sh)

**Automated 6-step checklist:**
1. ✅ Detect and terminate zombie Prisma/schema-engine processes
2. ✅ Validate Prisma schema syntax
3. ✅ Test database connection
4. ✅ Check available system memory (requires 500MB+)
5. ✅ Warn about concurrent heavy processes (dev servers)
6. ✅ Verify migrations directory exists

**Features:**
- Interactive confirmations for risky states (low memory, many processes)
- User can cancel if conditions aren't ideal
- Clear success/failure messages
- Executable bash script (chmod +x)

**Usage:**
```bash
# Option 1: Direct
./scripts/pre-migration-check.sh && npx prisma migrate dev --name migration_name

# Option 2: Via npm
npm run db:migrate:check && npx prisma migrate dev --name migration_name
```

### 2. NPM Script Integration

**File:** [video-production-manager/api/package.json](video-production-manager/api/package.json)

**Added scripts:**
- `db:migrate:check` - Run pre-migration safety checks
- `db:migrate:safe` - Alias for safety script

### 3. Comprehensive Scripts Documentation

**File:** [video-production-manager/api/scripts/README.md](video-production-manager/api/scripts/README.md)

**Contents:**
- Safety scripts documentation
- Database scripts reference
- Entity generation scripts guide
- npm scripts quick reference
- Critical production rules
- Links to related crash documentation

### 4. Enhanced AI_AGENT_PROTOCOL

**File:** [_Utilities/AI_AGENT_PROTOCOL.md](_Utilities/AI_AGENT_PROTOCOL.md) (not in git)

**Added new section:** "Database Migration Safety Protocol"

**Contents:**
- Pre-Migration Mandatory Checklist (explicit commands)
- Migration Execution Rules (❌ NEVER / ✅ ALWAYS lists)
- Common Migration Crash Scenarios (with prevention/recovery)
- Post-Migration Verification procedures
- Recovery steps when migrations fail

### 5. Updated DB_DEVELOPMENT_LESSONS

**File:** [docs/DB_DEVELOPMENT_LESSONS.md](docs/DB_DEVELOPMENT_LESSONS.md) (not in git - in .gitignore)

**Added section:** "CRITICAL: February 12, 2026 - Zombie Process Migration Crash"

**Contents:**
- Complete incident documentation (all 7 zombie processes with PIDs)
- Specific protocol violations with file references
- Why protocols weren't followed (lack of automation)
- Solutions implemented (script, protocol updates, workflow)
- New mandatory protocol for all migrations
- Testing verification commands

### 6. Updated DEVLOG

**File:** [video-production-manager/DEVLOG.md](video-production-manager/DEVLOG.md)

**Added entry:** "February 12, 2026 - VS Code Crash - Zombie Process Migration Failure"

**Contents:**
- Full investigation process (protocol-driven)
- Root cause analysis
- Protocol violation assessment
- Solutions implemented (5 deliverables documented)
- Key lessons learned
- New mandatory workflow
- Files modified
- Prevention going forward
- System status and next steps

---

## 📋 New Mandatory Workflow

Every AI agent and developer **MUST** follow this workflow:

### BEFORE Every Migration
```bash
npm run db:migrate:check
# Or: ./scripts/pre-migration-check.sh
```

**Script will:**
- Kill any zombie processes
- Validate schema
- Check database connection
- Verify sufficient memory
- Warn about concurrent processes
- Confirm migrations directory exists

### DURING Migration
- Monitor for completion message: "Your database is now in sync with your schema"
- DO NOT start other heavy operations (dev servers, Prisma Studio, etc.)
- Watch for process hangs (max 30 seconds)

### AFTER Migration
```bash
# Verify no zombie processes remain
ps aux | grep -E '(prisma|schema-engine)' | grep -v grep
# Expected: 0 processes (empty output)

# Verify migration succeeded
npx prisma migrate status
# Expected: All migrations listed as "Applied"
```

### If Migration Hangs > 30 Seconds
```bash
# Kill hung processes
pkill -9 -f 'prisma migrate'
pkill -9 -f 'schema-engine'

# Investigate before retry
npx prisma migrate status
# Check database state, resolve conflicts

# Run safety check before retry
npm run db:migrate:check
```

---

## 🎯 Key Lessons Learned

### 1. Documentation ≠ Execution
Even with detailed protocols in multiple files, manual checklists get skipped under time pressure or forgetfulness. **Automation is mandatory for crash-prone operations.**

### 2. Zombie Processes Are Invisible
Processes can hang for **days** silently consuming resources (CPU, memory) without obvious symptoms until system crashes. **Proactive checking required.**

### 3. Prisma Studio Must Never Run From Terminal
Running Prisma Studio from integrated terminal loads entire database into memory, keeps WebSocket connections open, and triggers file system watchers. **Use VS Code extension or separate app.**

### 4. Exit Code 137 = Memory Pressure
SIGKILL (exit code 137) always means forced termination due to resource exhaustion. **First action: check for resource hogs** (zombie processes, memory leaks).

### 5. Multiple Concurrent Migrations = Guaranteed Crash
Each Prisma migration spawns schema-engine process. Multiple concurrent = multiple schema-engines = memory exhaustion. **Always sequential, never parallel.**

### 6. Protocol Consolidation Critical
Migration rules were spread across 3 files (CRASH_AUDIT, DB_DEVELOPMENT_LESSONS, AI_AGENT_PROTOCOL). **Centralized in AI_AGENT_PROTOCOL with mandatory automated script.**

---

## 📁 Files Modified/Created

### Created
- ✅ `video-production-manager/api/scripts/pre-migration-check.sh` - Automated safety checks
- ✅ `video-production-manager/api/scripts/README.md` - Comprehensive script documentation
- ✅ `UUID_MIGRATION_RECOVERY.md` - (from previous session work)
- ✅ `video-production-manager/api/scripts/check-local-data.ts` - (from previous session work)
- ✅ `video-production-manager/api/scripts/check-table-schema.ts` - (from previous session work)

### Modified
- ✅ `video-production-manager/api/package.json` - Added db:migrate:check/safe scripts
- ✅ `video-production-manager/DEVLOG.md` - February 12 crash incident documentation
- ✅ `video-production-manager/api/prisma/schema.prisma` - (schema changes from previous work)

### Modified (Not in Git)
- ✅ `_Utilities/AI_AGENT_PROTOCOL.md` - Database Migration Safety Protocol section
- ✅ `docs/DB_DEVELOPMENT_LESSONS.md` - February 12 zombie process incident (.gitignored)

---

## 🚀 Testing & Verification

### Test Script Execution
```bash
cd video-production-manager/api
./scripts/pre-migration-check.sh
```

**Expected Output:**
```
🔍 Pre-Migration Safety Check
==============================

1️⃣  Checking for existing Prisma processes...
   ✅ No zombie Prisma processes found

2️⃣  Validating Prisma schema...
   ✅ Schema is valid

3️⃣  Testing database connection...
   ✅ Database connection successful

4️⃣  Checking available system memory...
   ✅ Sufficient memory: XXXXmb available

5️⃣  Checking for heavy concurrent processes...
   ✅ No excessive concurrent processes

6️⃣  Checking migrations directory...
   ✅ Migrations directory exists (7 existing migrations)

==============================
✅ All pre-flight checks passed
🚀 Safe to proceed with migration

Next step:
  npx prisma migrate dev --name your_migration_name
```

### Current System Status
- ✅ All zombie processes terminated (verified)
- ✅ Pre-migration safety script created and tested
- ✅ Protocols updated with mandatory automation
- ✅ Documentation comprehensive and cross-referenced
- ✅ Dev servers running cleanly (API: 3010, Frontend: 3011)
- ⚠️  Original migration NOT completed (needs retry with safety script if still needed)

---

## 📚 References

### Related Documentation
- [DEVLOG.md](video-production-manager/DEVLOG.md) - February 12, 2026 entry
- [docs/CRASH_AUDIT_2026-01-30.md](docs/CRASH_AUDIT_2026-01-30.md) - Previous crash analysis
- [docs/DB_DEVELOPMENT_LESSONS.md](docs/DB_DEVELOPMENT_LESSONS.md) - Database best practices
- [_Utilities/AI_AGENT_PROTOCOL.md](_Utilities/AI_AGENT_PROTOCOL.md) - Universal protocols
- [video-production-manager/api/scripts/README.md](video-production-manager/api/scripts/README.md) - Scripts guide

### Git Commit
- **Hash:** 5f4bddf
- **Message:** "feat: add automated pre-migration safety checks to prevent VS Code crashes"
- **Files:** 8 changed, 896 insertions
- **Branch:** main

---

## 🔮 Future Improvements

### Potential Enhancements
1. **Pre-commit hook** - Check for zombie processes before allowing commits
2. **CI/CD integration** - Run pre-migration checks in GitHub Actions
3. **VS Code extension** - Visual indicator of zombie processes in status bar
4. **Automated cleanup** - Cron job to kill hung Prisma processes daily
5. **Memory monitoring** - Track memory usage trends over time
6. **Process timeout** - Automatically kill Prisma processes that hang > 5 minutes

### Protocol Evolution
- Monitor protocol compliance in future sessions
- Collect metrics on crash prevention effectiveness
- Iterate on safety checks based on real-world usage
- Consider additional automated guards for other crash-prone operations

---

**Status:** ✅ COMPLETE  
**Next Migration:** Must use `npm run db:migrate:check` first  
**Documentation:** Comprehensive and cross-referenced  
**Automation:** Mandatory safety checks in place  
**Prevention:** Protocols updated and enforced
