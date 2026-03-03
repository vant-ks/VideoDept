/**
 * seed-formats.ts
 * Seeds the `formats` table with common broadcast / production video format presets.
 * Safe to run multiple times — uses upsert on `id` (unique).
 *
 * ID convention:
 *   {vRes}i{rate_no_dot}            → interlaced   e.g. "1080i5994"
 *   {vRes}p{rate_no_dot}            → progressive  e.g. "1080p2398"
 *   4K prefix for DCI 4096-wide     →              e.g. "4Kp24"
 *   suffix RBv1/RBv2/RBv3 for reduced-blanking variants
 *
 * standard is NOT stored — derive at render time from hRes + vRes.
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
  { id: '480i5994',    hRes: 720,  vRes: 480,  frameRate: 59.94, isInterlaced: true,  blanking: 'NONE' },
  { id: '576i50',      hRes: 720,  vRes: 576,  frameRate: 50,    isInterlaced: true,  blanking: 'NONE' },

  // ── HD 720p ──────────────────────────────────────────────────────────
  { id: '720p50',      hRes: 1280, vRes: 720,  frameRate: 50,    isInterlaced: false, blanking: 'NONE' },
  { id: '720p5994',    hRes: 1280, vRes: 720,  frameRate: 59.94, isInterlaced: false, blanking: 'NONE' },
  { id: '720p60',      hRes: 1280, vRes: 720,  frameRate: 60,    isInterlaced: false, blanking: 'NONE' },

  // ── HD 1080i ─────────────────────────────────────────────────────────
  { id: '1080i50',     hRes: 1920, vRes: 1080, frameRate: 50,    isInterlaced: true,  blanking: 'NONE' },
  { id: '1080i5994',   hRes: 1920, vRes: 1080, frameRate: 59.94, isInterlaced: true,  blanking: 'NONE' },
  { id: '1080i60',     hRes: 1920, vRes: 1080, frameRate: 60,    isInterlaced: true,  blanking: 'NONE' },

  // ── HD 1080p ─────────────────────────────────────────────────────────
  { id: '1080p2398',   hRes: 1920, vRes: 1080, frameRate: 23.976, isInterlaced: false, blanking: 'NONE' },
  { id: '1080p24',     hRes: 1920, vRes: 1080, frameRate: 24,    isInterlaced: false, blanking: 'NONE' },
  { id: '1080p25',     hRes: 1920, vRes: 1080, frameRate: 25,    isInterlaced: false, blanking: 'NONE' },
  { id: '1080p2997',   hRes: 1920, vRes: 1080, frameRate: 29.97, isInterlaced: false, blanking: 'NONE' },
  { id: '1080p30',     hRes: 1920, vRes: 1080, frameRate: 30,    isInterlaced: false, blanking: 'NONE' },
  { id: '1080p50',     hRes: 1920, vRes: 1080, frameRate: 50,    isInterlaced: false, blanking: 'NONE' },
  { id: '1080p5994',   hRes: 1920, vRes: 1080, frameRate: 59.94, isInterlaced: false, blanking: 'NONE' },
  { id: '1080p60',     hRes: 1920, vRes: 1080, frameRate: 60,    isInterlaced: false, blanking: 'NONE' },
  // RBv1 variants (common for DP/HDMI at high frame rates)
  { id: '1080p5994RBv1', hRes: 1920, vRes: 1080, frameRate: 59.94, isInterlaced: false, blanking: 'RBv1' },
  { id: '1080p60RBv1',   hRes: 1920, vRes: 1080, frameRate: 60,    isInterlaced: false, blanking: 'RBv1' },

  // ── UHD 2160p (3840 wide) ─────────────────────────────────────────────
  { id: '2160p2398',   hRes: 3840, vRes: 2160, frameRate: 23.976, isInterlaced: false, blanking: 'NONE' },
  { id: '2160p24',     hRes: 3840, vRes: 2160, frameRate: 24,    isInterlaced: false, blanking: 'NONE' },
  { id: '2160p25',     hRes: 3840, vRes: 2160, frameRate: 25,    isInterlaced: false, blanking: 'NONE' },
  { id: '2160p2997',   hRes: 3840, vRes: 2160, frameRate: 29.97, isInterlaced: false, blanking: 'NONE' },
  { id: '2160p30',     hRes: 3840, vRes: 2160, frameRate: 30,    isInterlaced: false, blanking: 'NONE' },
  { id: '2160p50',     hRes: 3840, vRes: 2160, frameRate: 50,    isInterlaced: false, blanking: 'NONE' },
  { id: '2160p5994',   hRes: 3840, vRes: 2160, frameRate: 59.94, isInterlaced: false, blanking: 'NONE' },
  { id: '2160p60',     hRes: 3840, vRes: 2160, frameRate: 60,    isInterlaced: false, blanking: 'NONE' },
  // RBv2 variants (DisplayPort UHD — very common in LED/production)
  { id: '2160p50RBv2',   hRes: 3840, vRes: 2160, frameRate: 50,    isInterlaced: false, blanking: 'RBv2' },
  { id: '2160p5994RBv2', hRes: 3840, vRes: 2160, frameRate: 59.94, isInterlaced: false, blanking: 'RBv2' },
  { id: '2160p60RBv2',   hRes: 3840, vRes: 2160, frameRate: 60,    isInterlaced: false, blanking: 'RBv2' },

  // ── DCI 4K (4096 wide) ────────────────────────────────────────────────
  { id: '4Kp2398',     hRes: 4096, vRes: 2160, frameRate: 23.976, isInterlaced: false, blanking: 'NONE' },
  { id: '4Kp24',       hRes: 4096, vRes: 2160, frameRate: 24,    isInterlaced: false, blanking: 'NONE' },
  { id: '4Kp25',       hRes: 4096, vRes: 2160, frameRate: 25,    isInterlaced: false, blanking: 'NONE' },
  { id: '4Kp2997',     hRes: 4096, vRes: 2160, frameRate: 29.97, isInterlaced: false, blanking: 'NONE' },
  { id: '4Kp30',       hRes: 4096, vRes: 2160, frameRate: 30,    isInterlaced: false, blanking: 'NONE' },
  { id: '4Kp50',       hRes: 4096, vRes: 2160, frameRate: 50,    isInterlaced: false, blanking: 'NONE' },
  { id: '4Kp5994',     hRes: 4096, vRes: 2160, frameRate: 59.94, isInterlaced: false, blanking: 'NONE' },
  { id: '4Kp60',       hRes: 4096, vRes: 2160, frameRate: 60,    isInterlaced: false, blanking: 'NONE' },
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
