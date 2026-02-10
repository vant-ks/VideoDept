-- CreateTable
CREATE TABLE "cable_snakes" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "cable_snakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cam_switchers" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "inputs" INTEGER,
    "outputs" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "cam_switchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vision_switchers" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "inputs" INTEGER,
    "outputs" INTEGER,
    "mes" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "vision_switchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "led_screens" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "h_res" INTEGER,
    "v_res" INTEGER,
    "rate" DOUBLE PRECISION,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "led_screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_servers" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "outputs" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "media_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projection_screens" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "h_res" INTEGER,
    "v_res" INTEGER,
    "rate" DOUBLE PRECISION,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "projection_screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "format" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routers" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "inputs" INTEGER,
    "outputs" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "routers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "url" TEXT,
    "stream_key" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cable_snakes_production_id_idx" ON "cable_snakes"("production_id");

-- CreateIndex
CREATE INDEX "cam_switchers_production_id_idx" ON "cam_switchers"("production_id");

-- CreateIndex
CREATE INDEX "vision_switchers_production_id_idx" ON "vision_switchers"("production_id");

-- CreateIndex
CREATE INDEX "led_screens_production_id_idx" ON "led_screens"("production_id");

-- CreateIndex
CREATE INDEX "media_servers_production_id_idx" ON "media_servers"("production_id");

-- CreateIndex
CREATE INDEX "projection_screens_production_id_idx" ON "projection_screens"("production_id");

-- CreateIndex
CREATE INDEX "records_production_id_idx" ON "records"("production_id");

-- CreateIndex
CREATE INDEX "routers_production_id_idx" ON "routers"("production_id");

-- CreateIndex
CREATE INDEX "streams_production_id_idx" ON "streams"("production_id");

-- AddForeignKey
ALTER TABLE "cable_snakes" ADD CONSTRAINT "cable_snakes_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cam_switchers" ADD CONSTRAINT "cam_switchers_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vision_switchers" ADD CONSTRAINT "vision_switchers_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "led_screens" ADD CONSTRAINT "led_screens_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_servers" ADD CONSTRAINT "media_servers_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projection_screens" ADD CONSTRAINT "projection_screens_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routers" ADD CONSTRAINT "routers_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'CAM_SWITCHER';
ALTER TYPE "EventType" ADD VALUE 'VISION_SWITCHER';
ALTER TYPE "EventType" ADD VALUE 'RECORD';
ALTER TYPE "EventType" ADD VALUE 'STREAM';
