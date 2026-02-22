# UUID vs ID Architecture - Sources Table

## Overview

The `sources` table uses a **dual-identifier architecture** that differs from other entity tables in the application.

## Architecture

### Sources Table Structure

```sql
sources (
  uuid           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  id             TEXT NOT NULL,
  production_id  TEXT NOT NULL,
  -- other fields...
  UNIQUE (id, production_id)
)
```

- **`uuid`** - Primary key, auto-generated UUID, internal database identifier
- **`id`** - User-friendly identifier (e.g., "SRC 1", "SRC 2"), unique within production
- **Unique Constraint**: (id, production_id) ensures user-friendly IDs are unique per production

### Related Tables

#### source_outputs
```sql
source_outputs (
  id         TEXT PRIMARY KEY,
  source_id  TEXT REFERENCES sources(uuid),  -- ← References UUID, not id
  -- other fields...
)
```

#### connections
```sql
connections (
  id               TEXT PRIMARY KEY,
  source_id        TEXT REFERENCES sources(uuid),  -- ← References UUID, not id
  source_output_id TEXT,
  -- other fields...
)
```

## Why This Architecture?

This architecture was introduced via the `migrate-uuid.ts` script to:

1. **Maintain user-friendly IDs**: Users see "SRC 1" not "677359b5-..."
2. **Enable reliable foreign keys**: UUID primary keys prevent issues with user-friendly ID changes
3. **Support soft deletes**: UUID prevents ID conflicts when sources are deleted and recreated

## Other Entity Tables

**All other entity tables** (cameras, ccus, sends, etc.) use the simple architecture:

```sql
entity_table (
  id             TEXT PRIMARY KEY,  -- ← User-friendly ID is the primary key
  production_id  TEXT NOT NULL,
  -- other fields...
)
```

## Query Patterns

### ✅ Correct Patterns

#### Creating a Source
```typescript
const uuid = crypto.randomUUID();
await prisma.$executeRaw`
  INSERT INTO sources (uuid, id, production_id, ...)
  VALUES (${uuid}, ${userFriendlyId}, ${productionId}, ...)
`;
// source_outputs.source_id stores the uuid
```

#### Reading by User-Friendly ID (API endpoints)
```typescript
// API receives user-friendly ID: "SRC 1"
const source = await prisma.sources.findFirst({
  where: { 
    id: req.params.id,  // user-friendly ID
    is_deleted: false 
  }
});
```

#### Joining source_outputs
```sql
SELECT s.*, so.*
FROM sources s
LEFT JOIN source_outputs so ON so.source_id = s.uuid  -- ← Use s.uuid
WHERE s.id = 'SRC 1'  -- ← Query by user-friendly id
```

### ❌ Common Mistakes

#### Wrong: Using findUnique with id
```typescript
// ❌ WRONG - id is not the primary key
await prisma.sources.findUnique({ where: { id: "SRC 1" } });
// Error: id is not a unique field, need uuid or compound unique key
```

#### Wrong: Joining with s.id instead of s.uuid
```sql
-- ❌ WRONG
LEFT JOIN source_outputs so ON so.source_id = s.id
-- source_outputs.source_id stores uuid, not user-friendly id
```

## Prisma Schema

```prisma
model sources {
  uuid                   String           @id @default(uuid())
  id                     String           
  production_id          String
  // ...other fields
  source_outputs         source_outputs[]
  connections            connections[]
  
  @@unique([id, production_id])
}

model source_outputs {
  id         String   @id
  source_id  String   // ← Stores uuid
  sources    sources  @relation(fields: [source_id], references: [uuid])
}

model connections {
  id        String   @id
  source_id String?  // ← Stores uuid
  sources   sources? @relation(fields: [source_id], references: [uuid])
}
```

## Migration History

### Manual Migration Applied
The `migrate-uuid.ts` script was run manually (NOT via Prisma migrations):

1. Added `uuid` column to sources
2. Changed primary key from `id` to `uuid`
3. Added unique constraint on (id, production_id)
4. Updated `source_outputs.source_id` to reference uuid
5. Updated `connections.source_id` to reference uuid

**Important**: This was done ONLY for the sources table. Other tables remain unchanged.

### Schema Drift Fixed (2026-02-21)

Prior to this fix, the Prisma schema showed `id` as `@id`, but the database had `uuid` as the actual primary key. This was corrected by:

1. Updating schema.prisma to show `uuid` as `@id`
2. Fixing all routes to use `findFirst` instead of `findUnique` for user-friendly ID lookups
3. Fixing JOIN queries to use `s.uuid` instead of `s.id`
4. Updating validation-helpers.ts to use findFirst for sources

## Future Considerations

### If Adding New Tables That Reference Sources

Always reference `sources.uuid`, not `sources.id`:

```prisma
model your_table {
  source_id String
  sources   sources @relation(fields: [source_id], references: [uuid])
}
```

### If Extending to Other Tables

**Do NOT apply this architecture to other tables without explicit planning.** The UUID_MIGRATION_RECOVERY incident report documents the risks of attempting to migrate all tables at once.

## Related Documentation

- [UUID_MIGRATION_RECOVERY.md](../../docs/incident-reports/UUID_MIGRATION_RECOVERY.md) - Failed migration attempt and lessons learned
- [migrate-uuid.ts](../migrate-uuid.ts) - Migration script that created the current architecture
- [DEVLOG.md](../DEVLOG.md#line-318) - Notes about sources using uuid vs id

## Quick Reference

| Scenario | Use |
|----------|-----|
| API endpoint parameter | User-friendly `id` ("SRC 1") |
| Database primary key | `uuid` (auto-generated) |
| Foreign key references | `uuid` |
| User display | User-friendly `id` |
| Prisma findUnique | ❌ Can't use with just `id` |
| Prisma findFirst | ✅ Use with `{ where: { id, is_deleted: false } }` |
| JOIN to source_outputs | `so.source_id = s.uuid` |
| Compound unique lookup | `{ id_production_id: { id, production_id } }` |
