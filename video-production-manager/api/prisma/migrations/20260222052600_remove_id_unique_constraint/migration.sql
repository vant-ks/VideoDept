-- Remove UNIQUE constraint on (production_id, id)
-- IDs are user-editable display identifiers and can be duplicated
-- uuid is the true immutable PRIMARY KEY
ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_production_id_id_key";
