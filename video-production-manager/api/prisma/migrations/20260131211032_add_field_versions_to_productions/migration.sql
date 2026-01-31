-- AlterTable
ALTER TABLE "productions" ADD COLUMN     "field_versions" JSONB;

-- Backfill existing records with initial field versions
-- Set each field's version to the current record version and updated_at timestamp
UPDATE "productions"
SET "field_versions" = jsonb_build_object(
  'show_name', jsonb_build_object('version', version, 'updated_at', updated_at),
  'client', jsonb_build_object('version', version, 'updated_at', updated_at),
  'venue', jsonb_build_object('version', version, 'updated_at', updated_at),
  'production_type', jsonb_build_object('version', version, 'updated_at', updated_at),
  'contact_name', jsonb_build_object('version', version, 'updated_at', updated_at),
  'contact_email', jsonb_build_object('version', version, 'updated_at', updated_at),
  'contact_phone', jsonb_build_object('version', version, 'updated_at', updated_at),
  'show_date', jsonb_build_object('version', version, 'updated_at', updated_at),
  'show_time', jsonb_build_object('version', version, 'updated_at', updated_at),
  'room', jsonb_build_object('version', version, 'updated_at', updated_at),
  'load_in', jsonb_build_object('version', version, 'updated_at', updated_at),
  'load_out', jsonb_build_object('version', version, 'updated_at', updated_at),
  'show_info_url', jsonb_build_object('version', version, 'updated_at', updated_at),
  'status', jsonb_build_object('version', version, 'updated_at', updated_at)
)
WHERE "field_versions" IS NULL;
