import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting UUID migration...');
  
  try {
    // 1. Set NOT NULL
    console.log('1. Making uuid NOT NULL...');
    await prisma.$executeRawUnsafe(`ALTER TABLE sources ALTER COLUMN uuid SET NOT NULL`);
    
    // 2. Set default
    console.log('2. Adding default value...');
    await prisma.$executeRawUnsafe(`ALTER TABLE sources ALTER COLUMN uuid SET DEFAULT gen_random_uuid()::text`);
    
    // 3. Drop foreign keys first
    console.log('3. Dropping foreign keys...');
    await prisma.$executeRawUnsafe(`ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_source_id_fkey`);
    await prisma.$executeRawUnsafe(`ALTER TABLE source_outputs DROP CONSTRAINT IF EXISTS source_outputs_source_id_fkey`);
    
    // 4. Drop old PK
    console.log('4. Dropping old primary key...');
    await prisma.$executeRawUnsafe(`ALTER TABLE sources DROP CONSTRAINT sources_pkey`);
    
    // 5. Add new PK
    console.log('5. Adding uuid as primary key...');
    await prisma.$executeRawUnsafe(`ALTER TABLE sources ADD PRIMARY KEY (uuid)`);
    
    // 6. Add unique constraint
    console.log('6. Adding unique constraint on (id, production_id)...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE sources ADD CONSTRAINT sources_id_production_id_key UNIQUE (id, production_id)`);
    } catch (e: any) {
      if (e.meta?.code === '42P07') {
        console.log('   (Constraint already exists, skipping)');
      } else {
        throw e;
      }
    }
    
    // 7. Update source_outputs.source_id to use UUIDs
    console.log('7. Updating source_outputs.source_id to UUIDs...');
    await prisma.$executeRawUnsafe(`
      UPDATE source_outputs 
      SET source_id = sources.uuid::text
      FROM sources 
      WHERE source_outputs.source_id = sources.id
    `);
    
    // 8. Update connections.source_id to use UUIDs  
    console.log('8. Updating connections.source_id to UUIDs...');
    await prisma.$executeRawUnsafe(`
      UPDATE connections 
      SET source_id = sources.uuid::text
      FROM sources 
      WHERE connections.source_id = sources.id
    `);
    
    // 9. Re-add connections FK
    console.log('9. Re-adding connections foreign key...');
    await prisma.$executeRawUnsafe(`ALTER TABLE connections ADD CONSTRAINT connections_source_id_fkey FOREIGN KEY (source_id) REFERENCES sources(uuid)`);
    
    // 10. Re-add source_outputs FK
    console.log('10. Re-adding source_outputs foreign key...');
    await prisma.$executeRawUnsafe(`ALTER TABLE source_outputs ADD CONSTRAINT source_outputs_source_id_fkey FOREIGN KEY (source_id) REFERENCES sources(uuid) ON DELETE CASCADE`);
    
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
