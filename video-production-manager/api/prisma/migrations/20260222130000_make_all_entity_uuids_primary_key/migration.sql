-- Step 1: Add uuid FK columns that don't exist yet
ALTER TABLE "cameras" ADD COLUMN IF NOT EXISTS "ccu_uuid" TEXT;
ALTER TABLE "equipment_card_io" ADD COLUMN IF NOT EXISTS "card_uuid" TEXT;
ALTER TABLE "equipment_cards" ADD COLUMN IF NOT EXISTS "equipment_uuid" TEXT;
ALTER TABLE "equipment_io_ports" ADD COLUMN IF NOT EXISTS "equipment_uuid" TEXT;

-- Step 2: Populate FK uuid columns based on existing id FKs
UPDATE "cameras" c SET "ccu_uuid" = (SELECT uuid FROM ccus WHERE id = c.ccu_id) WHERE c.ccu_id IS NOT NULL;
UPDATE "equipment_card_io" ec SET "card_uuid" = (SELECT uuid FROM equipment_cards WHERE id = ec.card_id) WHERE ec.card_id IS NOT NULL;
UPDATE "equipment_cards" ec SET "equipment_uuid" = (SELECT uuid FROM equipment_specs WHERE id = ec.equipment_id) WHERE ec.equipment_id IS NOT NULL;
UPDATE "equipment_io_ports" p SET "equipment_uuid" = (SELECT uuid FROM equipment_specs WHERE id = p.equipment_id) WHERE p.equipment_id IS NOT NULL;

-- Step 3: Drop FK constraints that reference id fields (which will become non-unique)
ALTER TABLE "cameras" DROP CONSTRAINT IF EXISTS "cameras_ccu_id_fkey";
ALTER TABLE "equipment_card_io" DROP CONSTRAINT IF EXISTS "equipment_card_io_card_id_fkey";
ALTER TABLE "equipment_cards" DROP CONSTRAINT IF EXISTS "equipment_cards_equipment_id_fkey";
ALTER TABLE "equipment_io_ports" DROP CONSTRAINT IF EXISTS "equipment_io_ports_equipment_id_fkey";

-- Step 4: Drop old indexes on ccu_id, card_id, equipment_id
DROP INDEX IF EXISTS "cameras_ccu_id_idx";
DROP INDEX IF EXISTS "equipment_card_io_card_id_idx";

-- Step 5: Make uuid column NOT NULL for all entity tables
ALTER TABLE "cameras" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "ccus" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "cable_snakes" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "cam_switchers" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "vision_switchers" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "led_screens" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "media_servers" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "projection_screens" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "records" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "routers" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "streams" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "checklist_items" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "connections" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "equipment_card_io" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "equipment_cards" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "equipment_io_ports" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "equipment_specs" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "events" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "ip_addresses" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "sends" ALTER COLUMN "uuid" SET NOT NULL;

-- Step 6: Add DEFAULT gen_random_uuid() to uuid columns
ALTER TABLE "cameras" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "ccus" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "cable_snakes" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "cam_switchers" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "vision_switchers" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "led_screens" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "media_servers" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "projection_screens" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "records" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "routers" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "streams" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "checklist_items" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "connections" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "equipment_card_io" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "equipment_cards" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "equipment_io_ports" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "equipment_specs" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "events" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "ip_addresses" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
ALTER TABLE "sends" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();

-- Step 7: Drop old PRIMARY KEY constraints on id
ALTER TABLE "cameras" DROP CONSTRAINT "cameras_pkey";
ALTER TABLE "ccus" DROP CONSTRAINT "ccus_pkey";
ALTER TABLE "cable_snakes" DROP CONSTRAINT "cable_snakes_pkey";
ALTER TABLE "cam_switchers" DROP CONSTRAINT "cam_switchers_pkey";
ALTER TABLE "vision_switchers" DROP CONSTRAINT "vision_switchers_pkey";
ALTER TABLE "led_screens" DROP CONSTRAINT "led_screens_pkey";
ALTER TABLE "media_servers" DROP CONSTRAINT "media_servers_pkey";
ALTER TABLE "projection_screens" DROP CONSTRAINT "projection_screens_pkey";
ALTER TABLE "records" DROP CONSTRAINT "records_pkey";
ALTER TABLE "routers" DROP CONSTRAINT "routers_pkey";
ALTER TABLE "streams" DROP CONSTRAINT "streams_pkey";
ALTER TABLE "checklist_items" DROP CONSTRAINT "checklist_items_pkey";
ALTER TABLE "connections" DROP CONSTRAINT "connections_pkey";
ALTER TABLE "equipment_card_io" DROP CONSTRAINT "equipment_card_io_pkey";
ALTER TABLE "equipment_cards" DROP CONSTRAINT "equipment_cards_pkey";
ALTER TABLE "equipment_io_ports" DROP CONSTRAINT "equipment_io_ports_pkey";
ALTER TABLE "equipment_specs" DROP CONSTRAINT "equipment_specs_pkey";
ALTER TABLE "events" DROP CONSTRAINT "events_pkey";
ALTER TABLE "ip_addresses" DROP CONSTRAINT "ip_addresses_pkey";
ALTER TABLE "sends" DROP CONSTRAINT "sends_pkey";

-- Step 8: Add new PRIMARY KEY constraints on uuid
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "ccus" ADD CONSTRAINT "ccus_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "cable_snakes" ADD CONSTRAINT "cable_snakes_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "cam_switchers" ADD CONSTRAINT "cam_switchers_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "vision_switchers" ADD CONSTRAINT "vision_switchers_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "led_screens" ADD CONSTRAINT "led_screens_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "media_servers" ADD CONSTRAINT "media_servers_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "projection_screens" ADD CONSTRAINT "projection_screens_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "records" ADD CONSTRAINT "records_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "routers" ADD CONSTRAINT "routers_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "streams" ADD CONSTRAINT "streams_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "connections" ADD CONSTRAINT "connections_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "equipment_card_io" ADD CONSTRAINT "equipment_card_io_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "equipment_cards" ADD CONSTRAINT "equipment_cards_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "equipment_io_ports" ADD CONSTRAINT "equipment_io_ports_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "equipment_specs" ADD CONSTRAINT "equipment_specs_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "events" ADD CONSTRAINT "events_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "ip_addresses" ADD CONSTRAINT "ip_addresses_pkey" PRIMARY KEY ("uuid");
ALTER TABLE "sends" ADD CONSTRAINT "sends_pkey" PRIMARY KEY ("uuid");

-- Step 9: Add new FK constraints referencing uuid fields
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_ccu_uuid_fkey" FOREIGN KEY ("ccu_uuid") REFERENCES "ccus"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_card_io" ADD CONSTRAINT "equipment_card_io_card_uuid_fkey" FOREIGN KEY ("card_uuid") REFERENCES "equipment_cards"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_cards" ADD CONSTRAINT "equipment_cards_equipment_uuid_fkey" FOREIGN KEY ("equipment_uuid") REFERENCES "equipment_specs"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_io_ports" ADD CONSTRAINT "equipment_io_ports_equipment_uuid_fkey" FOREIGN KEY ("equipment_uuid") REFERENCES "equipment_specs"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Create indexes on new FK columns
CREATE INDEX "cameras_ccu_uuid_idx" ON "cameras"("ccu_uuid");
CREATE INDEX "equipment_card_io_card_uuid_idx" ON "equipment_card_io"("card_uuid");
