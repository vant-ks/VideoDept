const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const sql = fs.readFileSync('prisma/migrations/20260222130000_make_all_entity_uuids_primary_key/migration.sql', 'utf8');
  console.log('Applying migration SQL manually...');
  await prisma.$executeRawUnsafe(sql);
  console.log('✅ Migration applied successfully');
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
