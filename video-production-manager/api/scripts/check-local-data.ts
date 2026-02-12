import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLocalData() {
  try {
    const productions = await prisma.productions.findMany({ 
      select: { id: true, name: true } 
    });
    
    const cameras = await prisma.cameras.findMany({ 
      select: { uuid: true, id: true, name: true, is_deleted: true },
      take: 3
    });
    
    const ccus = await prisma.ccus.findMany({ 
      select: { uuid: true, id: true, name: true, is_deleted: true },
      take: 3
    });
    
    const sources = await prisma.sources.findMany({ 
      select: { uuid: true, id: true, name: true, is_deleted: true },
      take: 3
    });
    
    const sends = await prisma.sends.findMany({ 
      select: { uuid: true, id: true, name: true, is_deleted: true },
      take: 3
    });
    
    console.log('\n📊 LOCAL DATABASE STATE:\n');
    console.log(`Productions: ${productions.length} rows`);
    if (productions.length > 0) {
      console.log(`  Sample: ${productions[0].id} - ${productions[0].name}`);
    }
    
    console.log(`\nCameras: ${cameras.length} rows`);
    cameras.forEach(c => {
      console.log(`  UUID: ${c.uuid}, ID: ${c.id}, Name: ${c.name}, Deleted: ${c.is_deleted}`);
    });
    
    console.log(`\nCCUs: ${ccus.length} rows`);
    ccus.forEach(c => {
      console.log(`  UUID: ${c.uuid}, ID: ${c.id}, Name: ${c.name}, Deleted: ${c.is_deleted}`);
    });
    
    console.log(`\nSources: ${sources.length} rows`);
    sources.forEach(s => {
      console.log(`  UUID: ${s.uuid}, ID: ${s.id}, Name: ${s.name}, Deleted: ${s.is_deleted}`);
    });
    
    console.log(`\nSends: ${sends.length} rows`);
    sends.forEach(s => {
      console.log(`  UUID: ${s.uuid}, ID: ${s.id}, Name: ${s.name}, Deleted: ${s.is_deleted}`);
    });
    
    await prisma.$disconnect();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkLocalData();
