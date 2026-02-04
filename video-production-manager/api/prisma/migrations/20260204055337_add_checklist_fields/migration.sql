-- AlterTable
ALTER TABLE "checklist_items" ADD COLUMN     "assigned_to" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "completed_at" BIGINT,
ADD COLUMN     "completion_date" TIMESTAMP(3),
ADD COLUMN     "completion_note" TEXT,
ADD COLUMN     "days_before_show" INTEGER,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "more_info" TEXT,
ADD COLUMN     "reference" TEXT;
