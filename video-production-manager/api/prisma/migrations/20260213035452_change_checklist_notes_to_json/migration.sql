/*
  Warnings:

  - The `completion_note` column on the `checklist_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `more_info` column on the `checklist_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "checklist_items" DROP COLUMN "completion_note",
ADD COLUMN     "completion_note" JSONB,
DROP COLUMN "more_info",
ADD COLUMN     "more_info" JSONB;
