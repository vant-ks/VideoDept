# Migration Protocol Enforcement

**Created:** February 26, 2026  
**Purpose:** Mandatory protocol that AI agents MUST follow before any migration  
**Severity:** CRITICAL - Violations cause crashes and data loss

---

## 🚨 ABSOLUTE RULE

**NO AI AGENT may run `npx prisma migrate` without completing ALL steps below AND receiving explicit user approval.**

---

## MANDATORY PRE-MIGRATION WORKFLOW

### Step 1: Validate Schema (ALWAYS FIRST)

```bash
cd video-production-manager/api
npx prisma validate
```

**Expected Output:** `The schema at prisma/schema.prisma is valid 🚀`

**If error:** STOP. Fix schema syntax. Common issues:
- ❌ `@default(uuid())` → Should be `@default(dbgenerated("gen_random_uuid()"))`
- ❌ Missing relation fields
- ❌ Invalid field types

### Step 2: Check Migration Status

```bash
npx prisma migrate status
```

**Expected Output:** `Database schema is up to date!`

**If NOT up to date:** STOP. Investigate why before creating new migrations.

### Step 3: Kill Zombie Processes

```bash
pkill -9 -f 'schema-engine'
sleep 2
ps aux | grep -E '(prisma|schema-engine)' | grep -v grep
```

**Expected Output:** No processes found (empty)

### Step 4: Create Migration (DO NOT APPLY YET)

```bash
npx prisma migrate dev --create-only --name descriptive_migration_name
```

This generates the migration SQL file WITHOUT applying it.

### Step 5: Review Generated SQL

```bash
# Find the latest migration directory
ls -lt prisma/migrations/ | head -2

# Read the migration.sql file
cat prisma/migrations/[TIMESTAMP]_descriptive_migration_name/migration.sql
```

**Review checklist:**
- [ ] Does SQL match what you intended?
- [ ] Are there any DROP TABLE statements? (dangerous!)
- [ ] Are there any ALTER TYPE statements? (can cause issues)
- [ ] Do all foreign keys reference existing tables?
- [ ] Are defaults correct for PostgreSQL syntax?

### Step 6: Present Evidence to User

**Create a message showing:**

1. ✅ Schema validation passed
2. ✅ Migration status clean
3. ✅ No zombie processes
4. 📄 **Full SQL content** of migration (use code block)
5. 📝 **Plain English explanation** of what the migration does
6. ⚠️ **Potential risks** (data loss, breaking changes, etc.)

### Step 7: Request Permission

**Use this exact format:**

```
## Migration Ready for Review

**Migration Name:** `descriptive_migration_name`

**Pre-flight Checks:**
✅ Schema validation: PASSED
✅ Migration status: Clean (all applied)
✅ Zombie processes: None found

**Generated SQL:**
```sql
[PASTE FULL SQL HERE]
```

**What This Does:**
[Plain English explanation]

**Potential Risks:**
[List any risks, or "Low risk - additive change only"]

**May I proceed with running this migration?**
```

### Step 8: Wait for User Response

**DO NOT proceed unless user explicitly says:**
- "yes"
- "proceed"
- "run it"
- "apply the migration"

### Step 9: Apply Migration (ONLY AFTER APPROVAL)

```bash
npx prisma migrate deploy
```

**Monitor output for:**
- ✅ "The following migration(s) have been applied"
- ❌ Any error messages
- ⚠️ **"We need to reset the schema"** = STOP IMMEDIATELY, report error

### Step 10: Verify Success

```bash
npx prisma migrate status
```

**Expected:** All migrations shown as "Applied"

---

## ⛔ ABSOLUTE STOP CONDITIONS

**IF ANY OF THESE OCCUR, STOP IMMEDIATELY AND REPORT TO USER:**

1. Prisma asks to "reset schema" or "reset database"
2. Migration failure on first attempt
3. Schema validation fails
4. Migration status shows unapplied migrations
5. Generated SQL contains unexpected operations

**NEVER:**
- Retry failed migrations without investigation
- Proceed when Prisma requests schema reset
- Skip the validation step
- Skip the user approval step
- Run migrations without presenting the SQL first

---

## WHY THIS PROTOCOL EXISTS

**Historical Issues:**
- Feb 25, 2026: 3 consecutive crashes from UUID migration
- Feb 26, 2026: Schema mismatch caused reset prompt (caught this time)
- Multiple incidents of data loss from unreviewed migrations
- VS Code crashes from zombie schema-engine processes

**User Directive:**
> "I do not want to see that happen again. Even if it means you are not allowed to run any migration until you show me evidence that you have reviewed and tested it and ask me for permission to run it."

---

## COMPLIANCE

This protocol is MANDATORY. AI agents that violate it will be:
1. Immediately corrected
2. Required to revert changes
3. Documented in incident reports

**No exceptions. No shortcuts.**
