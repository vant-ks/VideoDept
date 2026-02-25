ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "category" TEXT;
CREATE INDEX IF NOT EXISTS "sources_category_idx" ON "sources"("category");
