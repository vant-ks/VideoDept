-- AlterTable
ALTER TABLE "cable_snakes" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "cam_switchers" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "cameras" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "ccus" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "led_screens" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "media_servers" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "projection_screens" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "records" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "routers" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "sends" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "streams" ADD COLUMN     "field_versions" JSONB;

-- AlterTable
ALTER TABLE "vision_switchers" ADD COLUMN     "field_versions" JSONB;
