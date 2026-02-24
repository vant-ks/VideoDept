-- AlterTable
ALTER TABLE "connections" ADD COLUMN     "source_uuid" TEXT;

-- AlterTable
ALTER TABLE "source_outputs" ADD COLUMN     "source_uuid" TEXT;
