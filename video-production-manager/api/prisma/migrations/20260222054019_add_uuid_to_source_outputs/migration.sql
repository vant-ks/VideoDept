-- Add uuid column to source_outputs (nullable for now)
ALTER TABLE "source_outputs" ADD COLUMN "uuid" TEXT;
