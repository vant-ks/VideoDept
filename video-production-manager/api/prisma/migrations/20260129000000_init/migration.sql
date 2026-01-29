-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNING', 'READY', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('CAMERA', 'CCU', 'CAM_SWITCHER', 'VISION_SWITCHER', 'ROUTER', 'LED_PROCESSOR', 'LED_TILE', 'PROJECTOR', 'RECORDER', 'MONITOR', 'CONVERTER');

-- CreateEnum
CREATE TYPE "IoArchitecture" AS ENUM ('DIRECT', 'CARD_BASED');

-- CreateEnum
CREATE TYPE "PortType" AS ENUM ('INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('UPLOAD', 'DOWNLOAD', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ConflictResolution" AS ENUM ('PENDING', 'CLOUD_WINS', 'LOCAL_WINS', 'MANUAL');

-- CreateTable
CREATE TABLE "productions" (
    "id" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "show_name" TEXT NOT NULL,
    "venue" TEXT,
    "room" TEXT,
    "load_in" TIMESTAMP(3),
    "load_out" TIMESTAMP(3),
    "show_info_url" TEXT,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3),
    "last_modified_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "productions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_specs" (
    "id" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "io_architecture" "IoArchitecture" NOT NULL,
    "card_slots" INTEGER,
    "format_by_io" BOOLEAN NOT NULL DEFAULT true,
    "is_secondary_device" BOOLEAN NOT NULL DEFAULT false,
    "device_formats" JSONB,
    "specs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3),
    "last_modified_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "equipment_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_io_ports" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "port_type" "PortType" NOT NULL,
    "io_type" TEXT NOT NULL,
    "label" TEXT,
    "format" TEXT,
    "port_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "equipment_io_ports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_cards" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "slot_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "equipment_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_card_io" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "port_type" "PortType" NOT NULL,
    "io_type" TEXT NOT NULL,
    "label" TEXT,
    "format" TEXT,
    "port_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "equipment_card_io_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format_assignment_mode" TEXT DEFAULT 'system-wide',
    "h_res" INTEGER,
    "v_res" INTEGER,
    "rate" DOUBLE PRECISION,
    "standard" TEXT,
    "note" TEXT,
    "secondary_device" TEXT,
    "blanking" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3),
    "last_modified_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_outputs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "output_index" INTEGER NOT NULL DEFAULT 1,
    "h_res" INTEGER,
    "v_res" INTEGER,
    "rate" DOUBLE PRECISION,
    "standard" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "source_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sends" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "h_res" INTEGER,
    "v_res" INTEGER,
    "rate" DOUBLE PRECISION,
    "standard" TEXT,
    "note" TEXT,
    "secondary_device" TEXT,
    "output_connector" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3),
    "last_modified_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ccus" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "format_mode" TEXT,
    "fiber_input" TEXT,
    "reference_input" TEXT,
    "outputs" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ccus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cameras" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "format_mode" TEXT,
    "lens_type" TEXT,
    "max_zoom" DOUBLE PRECISION,
    "shooting_distance" DOUBLE PRECISION,
    "calculated_zoom" DOUBLE PRECISION,
    "has_tripod" BOOLEAN,
    "has_short_tripod" BOOLEAN,
    "has_dolly" BOOLEAN,
    "has_jib" BOOLEAN,
    "ccu_id" TEXT,
    "smpte_cable_length" DOUBLE PRECISION,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "source_id" TEXT,
    "source_output_id" TEXT,
    "intermediate_type" TEXT,
    "intermediate_id" TEXT,
    "intermediate_input" TEXT,
    "intermediate_output" TEXT,
    "destination_type" TEXT NOT NULL,
    "destination_id" TEXT,
    "signal_path" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_addresses" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subnet" TEXT,
    "gateway" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ip_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_log" (
    "id" TEXT NOT NULL,
    "sync_direction" "SyncDirection" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL,
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "conflicts_detected" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "server_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "cloud_version" INTEGER,
    "local_version" INTEGER,
    "cloud_data" JSONB,
    "local_data" JSONB,
    "cloud_updated_at" TIMESTAMP(3),
    "local_updated_at" TIMESTAMP(3),
    "resolution" "ConflictResolution" NOT NULL DEFAULT 'PENDING',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_registry" (
    "id" TEXT NOT NULL,
    "server_name" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_heartbeat" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frame_rates" (
    "id" TEXT NOT NULL,
    "rate" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "frame_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolution_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolution_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "productions_status_is_deleted_idx" ON "productions"("status", "is_deleted");

-- CreateIndex
CREATE INDEX "equipment_specs_category_is_deleted_idx" ON "equipment_specs"("category", "is_deleted");

-- CreateIndex
CREATE INDEX "equipment_specs_is_secondary_device_idx" ON "equipment_specs"("is_secondary_device");

-- CreateIndex
CREATE INDEX "equipment_io_ports_equipment_id_idx" ON "equipment_io_ports"("equipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_cards_equipment_id_slot_number_key" ON "equipment_cards"("equipment_id", "slot_number");

-- CreateIndex
CREATE INDEX "equipment_card_io_card_id_idx" ON "equipment_card_io"("card_id");

-- CreateIndex
CREATE INDEX "sources_production_id_is_deleted_idx" ON "sources"("production_id", "is_deleted");

-- CreateIndex
CREATE INDEX "sources_type_idx" ON "sources"("type");

-- CreateIndex
CREATE INDEX "source_outputs_source_id_idx" ON "source_outputs"("source_id");

-- CreateIndex
CREATE INDEX "sends_production_id_is_deleted_idx" ON "sends"("production_id", "is_deleted");

-- CreateIndex
CREATE INDEX "sends_type_idx" ON "sends"("type");

-- CreateIndex
CREATE INDEX "ccus_production_id_idx" ON "ccus"("production_id");

-- CreateIndex
CREATE INDEX "cameras_production_id_idx" ON "cameras"("production_id");

-- CreateIndex
CREATE INDEX "cameras_ccu_id_idx" ON "cameras"("ccu_id");

-- CreateIndex
CREATE INDEX "connections_production_id_idx" ON "connections"("production_id");

-- CreateIndex
CREATE INDEX "connections_source_id_idx" ON "connections"("source_id");

-- CreateIndex
CREATE INDEX "ip_addresses_production_id_idx" ON "ip_addresses"("production_id");

-- CreateIndex
CREATE UNIQUE INDEX "ip_addresses_production_id_ip_key" ON "ip_addresses"("production_id", "ip");

-- CreateIndex
CREATE INDEX "checklist_items_production_id_idx" ON "checklist_items"("production_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "server_registry_is_active_last_heartbeat_idx" ON "server_registry"("is_active", "last_heartbeat");

-- CreateIndex
CREATE UNIQUE INDEX "connector_types_name_key" ON "connector_types"("name");

-- CreateIndex
CREATE INDEX "connector_types_sort_order_is_active_idx" ON "connector_types"("sort_order", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "source_types_name_key" ON "source_types"("name");

-- CreateIndex
CREATE INDEX "source_types_sort_order_is_active_idx" ON "source_types"("sort_order", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "frame_rates_rate_key" ON "frame_rates"("rate");

-- CreateIndex
CREATE INDEX "frame_rates_sort_order_is_active_idx" ON "frame_rates"("sort_order", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "resolution_presets_name_key" ON "resolution_presets"("name");

-- CreateIndex
CREATE INDEX "resolution_presets_sort_order_is_active_idx" ON "resolution_presets"("sort_order", "is_active");

-- AddForeignKey
ALTER TABLE "equipment_io_ports" ADD CONSTRAINT "equipment_io_ports_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_cards" ADD CONSTRAINT "equipment_cards_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_card_io" ADD CONSTRAINT "equipment_card_io_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "equipment_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_outputs" ADD CONSTRAINT "source_outputs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sends" ADD CONSTRAINT "sends_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ccus" ADD CONSTRAINT "ccus_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_ccu_id_fkey" FOREIGN KEY ("ccu_id") REFERENCES "ccus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ip_addresses" ADD CONSTRAINT "ip_addresses_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

