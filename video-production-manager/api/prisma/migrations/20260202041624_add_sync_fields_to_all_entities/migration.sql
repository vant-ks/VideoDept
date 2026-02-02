-- AlterTable
ALTER TABLE "cameras" ADD COLUMN     "last_modified_by" TEXT,
ADD COLUMN     "synced_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ccus" ADD COLUMN     "last_modified_by" TEXT,
ADD COLUMN     "synced_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "checklist_items" ADD COLUMN     "last_modified_by" TEXT;

-- AlterTable
ALTER TABLE "connections" ADD COLUMN     "last_modified_by" TEXT,
ADD COLUMN     "synced_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ip_addresses" ADD COLUMN     "last_modified_by" TEXT;
