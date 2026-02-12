# API Scripts

Utility scripts for database operations, migrations, and safety checks.

---

## 🛡️ Safety Scripts

### pre-migration-check.sh

**Purpose:** Automated pre-flight safety check for database migrations. Prevents VS Code crashes caused by zombie Prisma processes, memory exhaustion, and concurrent operations.

**When to Use:** **ALWAYS** before running any `prisma migrate` command.

**What It Checks:**
1. ✅ Detects and terminates zombie Prisma/schema-engine processes
2. ✅ Validates Prisma schema syntax
3. ✅ Tests database connection
4. ✅ Verifies sufficient system memory (500MB+ required)
5. ✅ Warns about concurrent heavy processes (dev servers)
6. ✅ Confirms migrations directory exists

**Usage:**

```bash
# Option 1: Direct execution
./scripts/pre-migration-check.sh && npx prisma migrate dev --name your_migration

# Option 2: Via npm script
npm run db:migrate:check && npx prisma migrate dev --name your_migration
```

**Exit Codes:**
- `0` - All checks passed, safe to proceed with migration
- `1` - Check failed or user cancelled (low memory, schema invalid, etc.)

**Background:** 
Created February 12, 2026 in response to recurring VS Code crashes during migrations. See [DEVLOG.md](../DEVLOG.md) "VS Code Crash - Zombie Process Migration Failure" and [docs/DB_DEVELOPMENT_LESSONS.md](../../docs/DB_DEVELOPMENT_LESSONS.md) "February 12, 2026 - Zombie Process Migration Crash" for full incident documentation.

**Related Protocols:**
- [AI_AGENT_PROTOCOL.md](../../../_Utilities/AI_AGENT_PROTOCOL.md) - "Database Migration Safety Protocol"
- [DB_DEVELOPMENT_LESSONS.md](../../docs/DB_DEVELOPMENT_LESSONS.md) - "New Mandatory Protocol"
- [CRASH_AUDIT_2026-01-30.md](../../docs/CRASH_AUDIT_2026-01-30.md) - "Safe Command Design Principles"

---

## 🗃️ Database Scripts

### seed-*.ts

**Purpose:** Seed database with initial/test data

**Scripts:**
- `seed-settings-simple.ts` - Initialize settings (source types, connector types, etc.)
- `seed-equipment.ts` - Import equipment specifications from JSON
- `seed-sample-productions.ts` - Create sample productions for testing

**Usage:**
```bash
npm run seed:settings     # Settings only
npm run seed:equipment    # Equipment only (exports first, then imports)
npm run seed:all          # Both settings and equipment
npm run seed:all:prod     # Production mode (no export, imports from static JSON)
```

### export-equipment-data.ts

**Purpose:** Export equipment specifications from database to JSON file

**Usage:**
```bash
npm run equipment:export
```

**Output:** `prisma/equipment-data.json`

---

## 🔧 Entity Generation Scripts

### generate-entity.sh

**Purpose:** Generate REST API route files for new entities

**Usage:**
```bash
./scripts/generate-entity.sh entity-name
```

**Pre-Requisites:**
1. Entity must exist in `prisma/schema.prisma`
2. Migration must be applied (`npx prisma migrate dev`)
3. Prisma Client must be generated (`npx prisma generate`)

**Known Issues:**
- See [DB_DEVELOPMENT_LESSONS.md](../../docs/DB_DEVELOPMENT_LESSONS.md#L9) "Entity Generation Script Bug"
- Hyphenated entity names create invalid JavaScript variables
- Always test server startup after generation

---

## 📝 npm Scripts Reference

Quick reference for commonly used npm scripts:

### Migration & Database

```bash
npm run db:migrate:check           # ⚠️  Run pre-migration safety check (MANDATORY before migrations)
npm run prisma:migrate             # Run Prisma migration (ONLY after safety check)
npm run db:migrate                 # Deploy migrations (production)
npm run db:push                    # Push schema changes without migration
npm run db:reset                   # ⚠️  DANGER: Drop all data, re-migrate, re-seed
```

### Seeding

```bash
npm run seed:settings              # Initialize settings
npm run seed:equipment             # Export then import equipment specs
npm run seed:all                   # Settings + equipment (dev mode)
npm run seed:all:prod              # Settings + equipment (production mode, no export)
```

### Development

```bash
npm run dev                        # Start API dev server with hot reload
npm run build                      # Compile TypeScript to dist/
npm run start                      # Start production server (post-build)
```

### Testing

```bash
npm test                           # Run all tests
npm run test:watch                 # Watch mode
npm run test:coverage              # Generate coverage report
```

---

## 🚨 Critical Production Rules

**NEVER in Production:**
- ❌ Run `db:reset` (deletes all data)
- ❌ Run `equipment:export` (reads from database)
- ❌ Use `seed:all` (exports first)

**ALWAYS in Production:**
- ✅ Use `seed:all:prod` (seeds from static JSON)
- ✅ Use `db:migrate` for migrations (not `prisma:migrate`)
- ✅ Test migrations in staging first

---

## 📚 Additional Documentation

- [DEVLOG.md](../DEVLOG.md) - Chronological development history
- [docs/DB_DEVELOPMENT_LESSONS.md](../../docs/DB_DEVELOPMENT_LESSONS.md) - Database development best practices
- [docs/CRASH_AUDIT_2026-01-30.md](../../docs/CRASH_AUDIT_2026-01-30.md) - VS Code crash analysis
- [_Utilities/AI_AGENT_PROTOCOL.md](../../../_Utilities/AI_AGENT_PROTOCOL.md) - Universal development protocols
