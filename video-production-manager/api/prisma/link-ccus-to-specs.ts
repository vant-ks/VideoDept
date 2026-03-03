/**
 * link-ccus-to-specs.ts
 * One-time repair script: sets equipment_uuid on CCU instances that have
 * matching manufacturer + model in equipment_specs but no equipment_uuid yet.
 *
 * Run: npx ts-node prisma/link-ccus-to-specs.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const specs = await prisma.equipment_specs.findMany({
    where: { category: 'CCU', is_deleted: false },
  });
  const specsMap = new Map(specs.map(s => [`${s.manufacturer}|${s.model}`, s.uuid]));

  const ccus = await prisma.ccus.findMany({
    where: { is_deleted: false, equipment_uuid: null },
  });

  console.log(`Found ${ccus.length} CCU(s) without equipment_uuid`);
  let updated = 0;
  let skipped = 0;

  for (const ccu of ccus) {
    const key = `${ccu.manufacturer || ''}|${ccu.model || ''}`;
    const specUuid = specsMap.get(key);
    if (specUuid) {
      await prisma.ccus.update({
        where: { uuid: ccu.uuid },
        data: { equipment_uuid: specUuid },
      });
      console.log(`  ✅ ${ccu.id} → spec ${specUuid} (${ccu.manufacturer} ${ccu.model})`);
      updated++;
    } else {
      console.log(`  ⏭  ${ccu.id} — no spec for "${key}", skipping`);
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
