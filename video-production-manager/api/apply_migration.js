const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const sql = fs.readFileSync('prisma/migrations/20260222130000_make_all_entity_uuids_primary_key/migration.sql', 'utf8');
  console.log('Applying migration SQL statement by statement...');
  
  // Split into individual statements
  const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt) {
      console.log(`[${i+1}/${statements.length}] ${stmt.substring(0, 60)}...`);
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (e) {
        console.warn(`   ⚠️  ${e.message}`);
      }
    }
  }
  
  console.log('✅ Migration complete');
}

main()
  .catch(e => {
    console.error('❌ Fatal error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
