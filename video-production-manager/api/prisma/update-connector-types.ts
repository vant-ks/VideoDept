import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_CONNECTOR_TYPES = [
  'HDMI 1.4', 'HDMI 2.0', 'HDMI 2.1',
  '3G-SDI', '6G-SDI', '12G-SDI', 'BNC REF',
  'DP 1.1', 'DP 1.2', 'DP 1.4',
  'NDI', 'USB-C', 'NETWORK (RJ45)',
  'OPTICON DUO', 'OPTICON QUAD',
  'SMPTE FIBER',
  'LC - FIBER (SM)', 'ST - FIBER (SM)', 'SC - FIBER (SM)',
  'LC - FIBER (MM)', 'ST - FIBER (MM)', 'SC - FIBER (MM)',
  'XLR', 'DMX',
];

async function run() {
  console.log('🗑  Deleting all existing connector types...');
  await prisma.connector_types.deleteMany({});

  console.log('🌱 Creating new connector types...');
  for (let i = 0; i < NEW_CONNECTOR_TYPES.length; i++) {
    await prisma.connector_types.create({
      data: {
        id: `conn-${Date.now()}-${i}`,
        name: NEW_CONNECTOR_TYPES[i],
        sort_order: i,
        is_active: true,
        updated_at: new Date(),
      },
    });
    console.log(`  ✅ ${NEW_CONNECTOR_TYPES[i]}`);
  }
  console.log(`\n✅ Done — ${NEW_CONNECTOR_TYPES.length} connector types seeded.`);
}

run()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
