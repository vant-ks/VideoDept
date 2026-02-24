-- Make uuid NOT NULL
ALTER TABLE "source_outputs" ALTER COLUMN "uuid" SET NOT NULL;

-- Add DEFAULT gen_random_uuid() to uuid
ALTER TABLE "source_outputs" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();

-- Drop old PRIMARY KEY constraint from id
ALTER TABLE "source_outputs" DROP CONSTRAINT "source_outputs_pkey";

-- Add PRIMARY KEY constraint to uuid
ALTER TABLE "source_outputs" ADD CONSTRAINT "source_outputs_pkey" PRIMARY KEY ("uuid");
