/*
  Warnings:

  - You are about to drop the column `category` on the `checklist_items` table. All the data in the column will be lost.
  - You are about to drop the column `task` on the `checklist_items` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `server_registry` table. All the data in the column will be lost.
  - Added the required column `title` to the `checklist_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventOperation" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SOURCE', 'SEND', 'CAMERA', 'CCU', 'MEDIA_SERVER', 'VIDEO_SWITCHER', 'ROUTER', 'CABLE_SNAKE', 'PROJECTION_SCREEN', 'LED_SCREEN', 'COMPUTER', 'IP_ADDRESS', 'CHECKLIST_ITEM', 'PRODUCTION');

-- AlterTable
ALTER TABLE "checklist_items" DROP COLUMN "category",
DROP COLUMN "task",
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "server_registry" DROP COLUMN "metadata";

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "operation" "EventOperation" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_data" JSONB,
    "changes" JSONB,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_production_id_entity_id_idx" ON "events"("production_id", "entity_id");

-- CreateIndex
CREATE INDEX "events_production_id_event_type_idx" ON "events"("production_id", "event_type");

-- CreateIndex
CREATE INDEX "events_production_id_timestamp_idx" ON "events"("production_id", "timestamp");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
