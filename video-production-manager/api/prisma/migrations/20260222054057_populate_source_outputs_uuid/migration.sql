-- Populate uuid for existing source_outputs rows
UPDATE "source_outputs" SET "uuid" = gen_random_uuid() WHERE "uuid" IS NULL;
