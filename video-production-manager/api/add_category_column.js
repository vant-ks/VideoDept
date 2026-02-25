const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding category column to sources table...\n');
  
  try {
    // Add category column
    console.log('[1/2] Adding category column...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "category" TEXT`);
    console.log('   ✅ Done\n');
    
    // Create category index
    console.log('[2/2] Creating index on category...');
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "sources_category_idx" ON "sources"("category")`);
    console.log('   ✅ Done\n');
    
    console.log('🎉 Category column added successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

main()
  .catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
