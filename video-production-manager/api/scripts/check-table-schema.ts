import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    // Try to query with uuid field
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'cameras'
      ORDER BY ordinal_position;
    `;
    
    console.log('\n📊 CAMERAS TABLE SCHEMA:\n');
    console.log(result);
    
    await prisma.$disconnect();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkSchema();
