/**
 * script-rename-format-ids.ts
 *
 * One-time migration: renames all system format IDs from the legacy slug convention
 * (e.g. "1080i5994", "4Kp2398") to the canonical display formula:
 *   "hRes x vRes @ rate[i]" or "hRes x vRes @ rate[i] [blanking]"
 *
 * Safe to run multiple times — uses upsert (update where old id, fallback if already renamed).
 * Does NOT change format UUIDs, so device_ports.format_uuid FKs are unaffected.
 *
 * Run: npx ts-node prisma/script-rename-format-ids.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RENAMES: Array<{ oldId: string; newId: string }> = [
  // ── SD ───────────────────────────────────────────────────────────────
  { oldId: '480i5994',       newId: '720 x 480 @ 59.94i' },
  { oldId: '576i50',         newId: '720 x 576 @ 50i' },

  // ── HD 720p ──────────────────────────────────────────────────────────
  { oldId: '720p50',         newId: '1280 x 720 @ 50' },
  { oldId: '720p5994',       newId: '1280 x 720 @ 59.94' },
  { oldId: '720p60',         newId: '1280 x 720 @ 60' },

  // ── HD 1080i ─────────────────────────────────────────────────────────
  { oldId: '1080i50',        newId: '1920 x 1080 @ 50i' },
  { oldId: '1080i5994',      newId: '1920 x 1080 @ 59.94i' },
  { oldId: '1080i60',        newId: '1920 x 1080 @ 60i' },

  // ── HD 1080p ─────────────────────────────────────────────────────────
  { oldId: '1080p2398',      newId: '1920 x 1080 @ 23.98' },
  { oldId: '1080p24',        newId: '1920 x 1080 @ 24' },
  { oldId: '1080p25',        newId: '1920 x 1080 @ 25' },
  { oldId: '1080p2997',      newId: '1920 x 1080 @ 29.97' },
  { oldId: '1080p30',        newId: '1920 x 1080 @ 30' },
  { oldId: '1080p50',        newId: '1920 x 1080 @ 50' },
  { oldId: '1080p5994',      newId: '1920 x 1080 @ 59.94' },
  { oldId: '1080p60',        newId: '1920 x 1080 @ 60' },
  { oldId: '1080p5994RBv1',  newId: '1920 x 1080 @ 59.94 [RBv1]' },
  { oldId: '1080p60RBv1',    newId: '1920 x 1080 @ 60 [RBv1]' },

  // ── UHD 2160p ─────────────────────────────────────────────────────────
  { oldId: '2160p2398',      newId: '3840 x 2160 @ 23.98' },
  { oldId: '2160p24',        newId: '3840 x 2160 @ 24' },
  { oldId: '2160p25',        newId: '3840 x 2160 @ 25' },
  { oldId: '2160p2997',      newId: '3840 x 2160 @ 29.97' },
  { oldId: '2160p30',        newId: '3840 x 2160 @ 30' },
  { oldId: '2160p50',        newId: '3840 x 2160 @ 50' },
  { oldId: '2160p5994',      newId: '3840 x 2160 @ 59.94' },
  { oldId: '2160p60',        newId: '3840 x 2160 @ 60' },
  { oldId: '2160p50RBv2',    newId: '3840 x 2160 @ 50 [RBv2]' },
  { oldId: '2160p5994RBv2',  newId: '3840 x 2160 @ 59.94 [RBv2]' },
  { oldId: '2160p60RBv2',    newId: '3840 x 2160 @ 60 [RBv2]' },

  // ── DCI 4K ────────────────────────────────────────────────────────────
  { oldId: '4Kp2398',        newId: '4096 x 2160 @ 23.98' },
  { oldId: '4Kp24',          newId: '4096 x 2160 @ 24' },
  { oldId: '4Kp25',          newId: '4096 x 2160 @ 25' },
  { oldId: '4Kp2997',        newId: '4096 x 2160 @ 29.97' },
  { oldId: '4Kp30',          newId: '4096 x 2160 @ 30' },
  { oldId: '4Kp50',          newId: '4096 x 2160 @ 50' },
  { oldId: '4Kp5994',        newId: '4096 x 2160 @ 59.94' },
  { oldId: '4Kp60',          newId: '4096 x 2160 @ 60' },
];

async function renameFormatIds() {
  console.log('🔄 Renaming format IDs to canonical display formula…');

  let renamed = 0;
  let alreadyDone = 0;
  let notFound = 0;

  for (const { oldId, newId } of RENAMES) {
    // Skip if already renamed
    const existing = await prisma.formats.findUnique({ where: { id: newId } });
    if (existing) {
      alreadyDone++;
      continue;
    }

    const updated = await prisma.formats.updateMany({
      where: { id: oldId },
      data:  { id: newId, updated_at: new Date() },
    });

    if (updated.count > 0) {
      console.log(`  ✅ ${oldId}  →  ${newId}`);
      renamed++;
    } else {
      console.log(`  ⚠️  Not found: ${oldId}`);
      notFound++;
    }
  }

  console.log(`\nDone: ${renamed} renamed, ${alreadyDone} already up-to-date, ${notFound} not found`);
}

renameFormatIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
