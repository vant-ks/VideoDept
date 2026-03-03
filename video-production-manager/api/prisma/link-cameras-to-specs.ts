/**
 * link-cameras-to-specs.ts
 * One-time repair script: sets equipment_uuid on Camera instances that have
 * matching manufacturer + model in equipment_specs but no equipment_uuid yet.
 *
 * Run: npx ts-node prisma/link-cameras-to-specs.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const specs = await prisma.equipment_specs.findMany({
    where: { category: 'CAMERA', is_deleted: false },
  });

  // Build two lookup maps:
  //   1. Exact: "{manufacturer}|{model}" → uuid
  //   2. Combined: "{manufacturer} {model}" → uuid  (for when cameras store it as one string)
  const exactMap = new Map(specs.map(s => [`${s.manufacturer}|${s.model}`, s.uuid]));
  const combinedMap = new Map(specs.map(s => [`${s.manufacturer} ${s.model}`.toLowerCase(), s.uuid]));

  const cameras = await prisma.cameras.findMany({
    where: { is_deleted: false, equipment_uuid: null },
  });

  console.log(`Found ${cameras.length} camera(s) without equipment_uuid`);
  let updated = 0;
  let skipped = 0;

  for (const cam of cameras) {
    const mfr   = (cam as any).manufacturer || '';
    const model = (cam as any).model || '';

    // Try exact match first, then combined string match
    const specUuid =
      exactMap.get(`${mfr}|${model}`) ??
      combinedMap.get(`${mfr} ${model}`.toLowerCase()) ??
      combinedMap.get(model.toLowerCase()); // model might already be "Manufacturer Model"

    if (specUuid) {
      await prisma.cameras.update({
        where: { uuid: cam.uuid },
        data: { equipment_uuid: specUuid },
      });
      console.log(`  ✅ ${cam.id} → spec ${specUuid} (matched "${model}")`);
      updated++;
    } else {
      console.log(`  ⏭  ${cam.id} — no spec match for mfr="${mfr}" model="${model}"`);
      skipped++;
    }
  }

  console.log(`\nDone: ${updated} linked, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
