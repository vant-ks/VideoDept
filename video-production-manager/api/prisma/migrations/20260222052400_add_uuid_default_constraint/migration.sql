-- Add DEFAULT gen_random_uuid() to sources.uuid column
-- This allows INSERT statements without uuid to auto-generate the value
ALTER TABLE "sources" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
