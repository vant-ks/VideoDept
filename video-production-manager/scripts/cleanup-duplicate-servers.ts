/**
 * Cleanup script to remove duplicate media servers
 * 
 * This removes duplicate servers that were created during development.
 * Each pair should have exactly 2 servers (main + backup).
 * 
 * Strategy: For each pairNumber, keep the most recently updated servers
 * (one main, one backup) and delete the rest.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateServers() {
  console.log('🔍 Scanning for duplicate media servers...\n');

  // Get all media servers
  const allServers = await prisma.mediaServer.findMany({
    orderBy: [
      { pairNumber: 'asc' },
      { isBackup: 'asc' },
      { updatedAt: 'desc' }
    ]
  });

  console.log(`📊 Total servers in database: ${allServers.length}`);

  // Group by pair number and role
  const pairGroups: Record<number, { main: any[], backup: any[] }> = {};
  
  allServers.forEach(server => {
    if (!pairGroups[server.pairNumber]) {
      pairGroups[server.pairNumber] = { main: [], backup: [] };
    }
    
    if (server.isBackup) {
      pairGroups[server.pairNumber].backup.push(server);
    } else {
      pairGroups[server.pairNumber].main.push(server);
    }
  });

  // Identify duplicates
  const serversToDelete: string[] = [];
  
  Object.entries(pairGroups).forEach(([pairNum, group]) => {
    const pairNumber = Number(pairNum);
    
    console.log(`\n📌 Pair ${pairNumber}:`);
    console.log(`   Main servers: ${group.main.length}`);
    console.log(`   Backup servers: ${group.backup.length}`);
    
    // Keep the most recent main server, delete the rest
    if (group.main.length > 1) {
      const toKeep = group.main[0]; // Already sorted by updatedAt desc
      const toDelete = group.main.slice(1);
      console.log(`   ⚠️  Will delete ${toDelete.length} duplicate main server(s)`);
      serversToDelete.push(...toDelete.map(s => s.id));
    }
    
    // Keep the most recent backup server, delete the rest
    if (group.backup.length > 1) {
      const toKeep = group.backup[0];
      const toDelete = group.backup.slice(1);
      console.log(`   ⚠️  Will delete ${toDelete.length} duplicate backup server(s)`);
      serversToDelete.push(...toDelete.map(s => s.id));
    }
  });

  if (serversToDelete.length === 0) {
    console.log('\n✅ No duplicate servers found. Database is clean!');
    return;
  }

  console.log(`\n🗑️  Total servers to delete: ${serversToDelete.length}`);
  console.log('\n⏳ Deleting duplicate servers...');

  // Delete duplicates
  const result = await prisma.mediaServer.deleteMany({
    where: {
      id: {
        in: serversToDelete
      }
    }
  });

  console.log(`✅ Deleted ${result.count} duplicate server(s)`);
  
  // Verify cleanup
  const remainingServers = await prisma.mediaServer.findMany();
  console.log(`\n📊 Remaining servers: ${remainingServers.length}`);
  
  // Show final state
  const finalPairGroups: Record<number, { main: number, backup: number }> = {};
  remainingServers.forEach(server => {
    if (!finalPairGroups[server.pairNumber]) {
      finalPairGroups[server.pairNumber] = { main: 0, backup: 0 };
    }
    if (server.isBackup) {
      finalPairGroups[server.pairNumber].backup++;
    } else {
      finalPairGroups[server.pairNumber].main++;
    }
  });
  
  console.log('\n✅ Final state:');
  Object.entries(finalPairGroups).forEach(([pairNum, counts]) => {
    const status = counts.main === 1 && counts.backup === 1 ? '✅' : '⚠️';
    console.log(`   ${status} Pair ${pairNum}: ${counts.main} main + ${counts.backup} backup`);
  });
}

cleanupDuplicateServers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
