import { PrismaClient, ProductionStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed sample productions for local development
 * These are test data only - never used in production
 */
async function seedSampleProductions() {
  console.log('🎬 Seeding sample productions...');

  const sampleProductions = [
    {
      id: 'sample-prod-1',
      client: 'ABC Network',
      show_name: 'Morning News Show',
      venue: 'Studio A',
      room: 'Control Room 1',
      status: ProductionStatus.PLANNING,
      load_in: new Date('2026-02-15T08:00:00Z'),
      load_out: new Date('2026-02-15T20:00:00Z'),
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    },
    {
      id: 'sample-prod-2',
      client: 'XYZ Productions',
      show_name: 'Live Concert Special',
      venue: 'Madison Square Garden',
      room: 'Truck 1',
      status: ProductionStatus.ACTIVE,
      load_in: new Date('2026-02-20T06:00:00Z'),
      load_out: new Date('2026-02-21T02:00:00Z'),
      show_info_url: 'https://example.com/concert-details',
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    },
  ];

  for (const prod of sampleProductions) {
    const exists = await prisma.productions.findUnique({
      where: { id: prod.id },
    });

    if (!exists) {
      await prisma.productions.create({ data: prod });
      console.log(`  ✅ Created: ${prod.show_name}`);
    } else {
      console.log(`  ⏭️  Skipped (exists): ${prod.show_name}`);
    }
  }

  console.log('✅ Sample productions seeded');
}

async function main() {
  try {
    await seedSampleProductions();
  } catch (error) {
    console.error('❌ Error seeding sample productions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
