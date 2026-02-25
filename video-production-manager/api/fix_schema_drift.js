const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing schema drift for cameras and ccus tables...\n');
  
  try {
    // Step 1: Add ccu_uuid column to cameras
    console.log('[1/10] Adding ccu_uuid column to cameras...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "cameras" ADD COLUMN IF NOT EXISTS "ccu_uuid" TEXT`);
    console.log('   ✅ Done\n');
    
    // Step 2: Populate ccu_uuid from ccu_id
    console.log('[2/10] Populating ccu_uuid from existing ccu_id references...');
    await prisma.$executeRawUnsafe(`
      UPDATE "cameras" c 
      SET "ccu_uuid" = (SELECT uuid FROM ccus WHERE id = c.ccu_id)
      WHERE c.ccu_id IS NOT NULL
    `);
    console.log('   ✅ Done\n');
    
    // Step 3: Drop old FK constraint on ccu_id
    console.log('[3/10] Dropping old FK constraint cameras_ccu_id_fkey...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "cameras" DROP CONSTRAINT IF EXISTS "cameras_ccu_id_fkey"`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "cameras_ccu_id_idx"`);
    console.log('   ✅ Done\n');
    
    // Step 4: Make cameras.uuid NOT NULL + DEFAULT
    console.log('[4/10] Setting cameras.uuid to NOT NULL with DEFAULT...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "cameras" ALTER COLUMN "uuid" SET NOT NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "cameras" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`);
    console.log('   ✅ Done\n');
    
    // Step 5: Drop old PRIMARY KEY on cameras.id
    console.log('[5/10] Dropping old PRIMARY KEY on cameras.id...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "cameras" DROP CONSTRAINT "cameras_pkey"`);
    console.log('   ✅ Done\n');
    
    // Step 6: Add new PRIMARY KEY on cameras.uuid
    console.log('[6/10] Adding new PRIMARY KEY on cameras.uuid...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "cameras" ADD CONSTRAINT "cameras_pkey" PRIMARY KEY ("uuid")`);
    console.log('   ✅ Done\n');
    
    // Step 7: Make ccus.uuid NOT NULL + DEFAULT (if not already)
    console.log('[7/10] Setting ccus.uuid to NOT NULL with DEFAULT...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "ccus" ALTER COLUMN "uuid" SET NOT NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ccus" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`);
    console.log('   ✅ Done\n');
    
    // Step 8: Drop old PRIMARY KEY on ccus.id
    console.log('[8/10] Dropping old PRIMARY KEY on ccus.id...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "ccus" DROP CONSTRAINT "ccus_pkey"`);
    console.log('   ✅ Done\n');
    
    // Step 9: Add new PRIMARY KEY on ccus.uuid
    console.log('[9/10] Adding new PRIMARY KEY on ccus.uuid...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "ccus" ADD CONSTRAINT "ccus_pkey" PRIMARY KEY ("uuid")`);
    console.log('   ✅ Done\n');
    
    // Step 10: Create new FK constraint using ccu_uuid
    console.log('[10/10] Creating new FK constraint cameras_ccu_uuid_fkey...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cameras" 
      ADD CONSTRAINT "cameras_ccu_uuid_fkey" 
      FOREIGN KEY ("ccu_uuid") REFERENCES "ccus"("uuid") 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX "cameras_ccu_uuid_idx" ON "cameras"("ccu_uuid")`);
    console.log('   ✅ Done\n');
    
    console.log('🎉 Schema drift fixed successfully!\n');
    console.log('Summary:');
    console.log('  • cameras.uuid is now PRIMARY KEY');
    console.log('  • ccus.uuid is now PRIMARY KEY');
    console.log('  • cameras.ccu_uuid → ccus.uuid FK relationship established\n');
    
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
