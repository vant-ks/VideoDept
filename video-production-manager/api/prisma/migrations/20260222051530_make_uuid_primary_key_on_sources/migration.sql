-- Step 1.5: Make uuid the PRIMARY KEY on sources table
-- WARNING: This is a critical migration that changes the PRIMARY KEY

-- Step 1: Make uuid NOT NULL
ALTER TABLE "sources" ALTER COLUMN "uuid" SET NOT NULL;

-- Step 2: Make source_uuid NOT NULL in source_outputs (since it has onDelete: Cascade)
ALTER TABLE "source_outputs" ALTER COLUMN "source_uuid" SET NOT NULL;

-- Step 3: Drop existing foreign key constraints
ALTER TABLE "connections" DROP CONSTRAINT IF EXISTS "connections_source_id_fkey";
ALTER TABLE "source_outputs" DROP CONSTRAINT IF EXISTS "source_outputs_source_id_fkey";

-- Step 4: Drop the old PRIMARY KEY on sources.id
ALTER TABLE "sources" DROP CONSTRAINT "sources_pkey";

-- Step 5: Make uuid  the new PRIMARY KEY
ALTER TABLE "sources" ADD CONSTRAINT "sources_pkey" PRIMARY KEY ("uuid");

-- Step 6: Add unique constraint on (production_id, id)
ALTER TABLE "sources" ADD CONSTRAINT "sources_production_id_id_key" UNIQUE ("production_id", "id");

-- Step 7: Create new foreign key constraints pointing to uuid
ALTER TABLE "connections" ADD CONSTRAINT "connections_source_uuid_fkey" 
  FOREIGN KEY ("source_uuid") REFERENCES "sources"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "source_outputs" ADD CONSTRAINT "source_outputs_source_uuid_fkey" 
  FOREIGN KEY ("source_uuid") REFERENCES "sources"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Drop old indices on source_id and create new ones on source_uuid
DROP INDEX IF EXISTS "connections_source_id_idx";
DROP INDEX IF EXISTS "source_outputs_source_id_idx";

CREATE INDEX "connections_source_uuid_idx" ON "connections"("source_uuid");
CREATE INDEX "source_outputs_source_uuid_idx" ON "source_outputs"("source_uuid");
