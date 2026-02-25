-- Fix cameras and ccus FK relationship
ALTER TABLE "cameras" DROP CONSTRAINT IF EXISTS "cameras_ccu_id_fkey";
DROP INDEX IF EXISTS "cameras_ccu_id_idx";

-- Now drop ccus PRIMARY KEY
ALTER TABLE "ccus" DROP CONSTRAINT "ccus_pkey";
ALTER TABLE "ccus" ADD CONSTRAINT "ccus_pkey" PRIMARY KEY ("uuid");

-- Same for cameras
ALTER TABLE "cameras" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "cameras" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "cameras" DROP CONSTRAINT IF EXISTS "cameras_pkey";
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_pkey" PRIMARY KEY ("uuid");

-- Re-create FK constraint using uuid
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_ccu_uuid_fkey" FOREIGN KEY ("ccu_uuid") REFERENCES "ccus"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "cameras_ccu_uuid_idx" ON "cameras"("ccu_uuid");
