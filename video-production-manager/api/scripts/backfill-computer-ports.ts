/**
 * backfill-computer-ports.ts
 *
 * One-time migration: create device_ports rows for every computer that has
 * source_outputs rows but no device_ports yet.
 *
 * Source data:  sources / source_outputs tables
 * Target table: device_ports
 *
 * Mapping:
 *   source_output.connector  → io_type  (e.g. "HDMI", "DP")
 *   direction                = "OUTPUT"  (computers are output-only)
 *   port_label               = connector value (or "Output N")
 *   format_uuid              = null (user must set manually)
 *   note                     = null
 *
 * Run with:
 *   npx tsx api/scripts/backfill-computer-ports.ts
 *
 * Safe to re-run — skips devices that already have device_ports.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📥 Starting computer ports backfill…\n');

  // Fetch all non-deleted computers that have at least one source_output
  const computers = await prisma.computers.findMany({
    where: { is_deleted: false },
    include: {
      source_outputs: { orderBy: { output_index: 'asc' } },
    },
  });

  let skipped = 0;
  let created = 0;
  let noOutputs = 0;

  for (const computer of computers) {
    if (computer.source_outputs.length === 0) {
      noOutputs++;
      continue;
    }

    // Check if device already has any device_ports (non-deleted)
    const existing = await prisma.device_ports.count({
      where: { device_uuid: computer.uuid, is_deleted: false },
    });

    if (existing > 0) {
      console.log(`  ⏭  Skip ${computer.id} (${computer.uuid.slice(0, 8)}) — already has ${existing} port(s)`);
      skipped++;
      continue;
    }

    // Create one device_port per source_output
    const portsToCreate = computer.source_outputs.map((output, idx) => {
      const portIndex = output.output_index ?? idx + 1;
      return {
        id: `${computer.id}_out_${portIndex}`,
        production_id: computer.production_id,
        device_uuid: computer.uuid,
        spec_port_uuid: null,
        port_label: output.connector,
        io_type: output.connector,     // e.g. "HDMI", "DP", "SDI"
        direction: 'OUTPUT' as const,
        format_uuid: null,
        note: null,
        updated_at: new Date(),
        version: 1,
        is_deleted: false,
      };
    });

    await prisma.device_ports.createMany({ data: portsToCreate });

    console.log(`  ✅ ${computer.id} — created ${portsToCreate.length} port(s): ${portsToCreate.map(p => p.io_type).join(', ')}`);
    created += portsToCreate.length;
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`  Computers processed: ${computers.length}`);
  console.log(`  Ports created:       ${created}`);
  console.log(`  Devices skipped:     ${skipped}  (already had ports)`);
  console.log(`  Devices no outputs:  ${noOutputs}`);
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch(err => { console.error('❌ Fatal error:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
