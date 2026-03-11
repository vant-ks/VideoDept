/**
 * seed-formats.ts
 * Seeds the `formats` table with common broadcast / production video format presets.
 * Safe to run multiple times — uses upsert on `id` (unique).
 *
 * ID convention (canonical display formula):
 *   "{hRes} x {vRes} @ {rate}"              → progressive, no blanking  e.g. "1920 x 1080 @ 59.94"
 *   "{hRes} x {vRes} @ {rate}i"             → interlaced               e.g. "1920 x 1080 @ 59.94i"
 *   "{hRes} x {vRes} @ {rate} [{blanking}]" → reduced-blanking variant  e.g. "3840 x 2160 @ 60 [RBv2]"
 *
 * rate = SCAN_RATES.label value (e.g. "59.94", "23.98", "29.97")
 * This matches the suggestFormatId() output in FormatFormModal.tsx.
 *
 * Run: npx ts-node prisma/seed-formats.ts
 */

import { PrismaClient, Blanking } from '@prisma/client';

const prisma = new PrismaClient();

interface FormatSeed {
  id: string;
  hRes: number;
  vRes: number;
  frameRate: number;
  isInterlaced: boolean;
  blanking: Blanking;
}

const FORMATS: FormatSeed[] = [
  // ── SD ───────────────────────────────────────────────────────────────
  { id: '720 x 480 @ 59.94i',    hRes: 720,  vRes: 480,  frameRate: 59.94, isInterlaced: true,  blanking: 'NONE' },
  { id: '720 x 576 @ 50i',       hRes: 720,  vRes: 576,  frameRate: 50,    isInterlaced: true,  blanking: 'NONE' },

  // ── HD 720p ──────────────────────────────────────────────────────────
  { id: '1280 x 720 @ 50',       hRes: 1280, vRes: 720,  frameRate: 50,    isInterlaced: false, blanking: 'NONE' },
  { id: '1280 x 720 @ 59.94',    hRes: 1280, vRes: 720,  frameRate: 59.94, isInterlaced: false, blanking: 'NONE' },
  { id: '1280 x 720 @ 60',       hRes: 1280, vRes: 720,  frameRate: 60,    isInterlaced: false, blanking: 'NONE' },

  // ── HD 1080i ─────────────────────────────────────────────────────────
  { id: '1920 x 1080 @ 50i',     hRes: 1920, vRes: 1080, frameRate: 50,    isInterlaced: true,  blanking: 'NONE' },
  { id: '1920 x 1080 @ 59.94i',  hRes: 1920, vRes: 1080, frameRate: 59.94, isInterlaced: true,  blanking: 'NONE' },
  { id: '1920 x 1080 @ 60i',     hRes: 1920, vRes: 1080, frameRate: 60,    isInterlaced: true,  blanking: 'NONE' },

  // ── HD 1080p ─────────────────────────────────────────────────────────
  { id: '1920 x 1080 @ 23.98',   hRes: 1920, vRes: 1080, frameRate: 23.976, isInterlaced: false, blanking: 'NONE' },
  { id: '1920 x 1080 @ 24',      hRes: 1920, vRes: 1080, frameRate: 24,    isInterlaced: false, blanking: 'NONE' },
  { id: '1920 x 1080 @ 25',      hRes: 1920, vRes: 1080, frameRate: 25,    isInterlaced: false, blanking: 'NONE' },
  { id: '1920 x 1080 @ 29.97',   hRes: 1920, vRes: 1080, frameRate: 29.97, isInterlaced: false, blanking: 'NONE' },
  { id: '1920 x 1080 @ 30',      hRes: 1920, vRes: 1080, frameRate: 30,    isInterlaced: false, blanking: 'NONE' },
  { id: '1920 x 1080 @ 50',      hRes: 1920, vRes: 1080, frameRate: 50,    isInterlaced: false, blanking: 'NONE' },
  { id: '1920 x 1080 @ 59.94',   hRes: 1920, vRes: 1080, frameRate: 59.94, isInterlaced: false, blanking: 'NONE' },
  { id: '1920 x 1080 @ 60',      hRes: 1920, vRes: 1080, frameRate: 60,    isInterlaced: false, blanking: 'NONE' },
  // RBv1 variants (common for DP/HDMI at high frame rates)
  { id: '1920 x 1080 @ 59.94 [RBv1]', hRes: 1920, vRes: 1080, frameRate: 59.94, isInterlaced: false, blanking: 'RBv1' },
  { id: '1920 x 1080 @ 60 [RBv1]',    hRes: 1920, vRes: 1080, frameRate: 60,    isInterlaced: false, blanking: 'RBv1' },

  // ── UHD 2160p (3840 wide) ─────────────────────────────────────────────
  { id: '3840 x 2160 @ 23.98',   hRes: 3840, vRes: 2160, frameRate: 23.976, isInterlaced: false, blanking: 'NONE' },
  { id: '3840 x 2160 @ 24',      hRes: 3840, vRes: 2160, frameRate: 24,    isInterlaced: false, blanking: 'NONE' },
  { id: '3840 x 2160 @ 25',      hRes: 3840, vRes: 2160, frameRate: 25,    isInterlaced: false, blanking: 'NONE' },
  { id: '3840 x 2160 @ 29.97',   hRes: 3840, vRes: 2160, frameRate: 29.97, isInterlaced: false, blanking: 'NONE' },
  { id: '3840 x 2160 @ 30',      hRes: 3840, vRes: 2160, frameRate: 30,    isInterlaced: false, blanking: 'NONE' },
  { id: '3840 x 2160 @ 50',      hRes: 3840, vRes: 2160, frameRate: 50,    isInterlaced: false, blanking: 'NONE' },
  { id: '3840 x 2160 @ 59.94',   hRes: 3840, vRes: 2160, frameRate: 59.94, isInterlaced: false, blanking: 'NONE' },
  { id: '3840 x 2160 @ 60',      hRes: 3840, vRes: 2160, frameRate: 60,    isInterlaced: false, blanking: 'NONE' },
  // RBv2 variants (DisplayPort UHD — very common in LED/production)
  { id: '3840 x 2160 @ 50 [RBv2]',    hRes: 3840, vRes: 2160, frameRate: 50,    isInterlaced: false, blanking: 'RBv2' },
  { id: '3840 x 2160 @ 59.94 [RBv2]', hRes: 3840, vRes: 2160, frameRate: 59.94, isInterlaced: false, blanking: 'RBv2' },
  { id: '3840 x 2160 @ 60 [RBv2]',    hRes: 3840, vRes: 2160, frameRate: 60,    isInterlaced: false, blanking: 'RBv2' },

  // ── DCI 4K (4096 wide) ────────────────────────────────────────────────
  { id: '4096 x 2160 @ 23.98',   hRes: 4096, vRes: 2160, frameRate: 23.976, isInterlaced: false, blanking: 'NONE' },
  { id: '4096 x 2160 @ 24',      hRes: 4096, vRes: 2160, frameRate: 24,    isInterlaced: false, blanking: 'NONE' },
  { id: '4096 x 2160 @ 25',      hRes: 4096, vRes: 2160, frameRate: 25,    isInterlaced: false, blanking: 'NONE' },
  { id: '4096 x 2160 @ 29.97',   hRes: 4096, vRes: 2160, frameRate: 29.97, isInterlaced: false, blanking: 'NONE' },
  { id: '4096 x 2160 @ 30',      hRes: 4096, vRes: 2160, frameRate: 30,    isInterlaced: false, blanking: 'NONE' },
  { id: '4096 x 2160 @ 50',      hRes: 4096, vRes: 2160, frameRate: 50,    isInterlaced: false, blanking: 'NONE' },
  { id: '4096 x 2160 @ 59.94',   hRes: 4096, vRes: 2160, frameRate: 59.94, isInterlaced: false, blanking: 'NONE' },
  { id: '4096 x 2160 @ 60',      hRes: 4096, vRes: 2160, frameRate: 60,    isInterlaced: false, blanking: 'NONE' },
];

async function seedFormats() {
  console.log('🌱 Seeding formats table...');

  let created = 0;
  let skipped = 0;

  for (const f of FORMATS) {
    const result = await prisma.formats.upsert({
      where: { id: f.id },
      create: {
        id:           f.id,
        h_res:        f.hRes,
        v_res:        f.vRes,
        frame_rate:   f.frameRate,
        is_interlaced: f.isInterlaced,
        blanking:     f.blanking,
        is_system:    true,
        updated_at:   new Date(),
      },
      update: {}, // Never overwrite system presets once created
    });
    if (result) created++;
    else skipped++;
  }

  console.log(`✅ Formats seeded: ${FORMATS.length} presets (${created} upserted)`);
}

seedFormats()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
