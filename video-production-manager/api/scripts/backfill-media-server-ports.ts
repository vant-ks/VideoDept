/**
 * backfill-media-server-ports.ts
 *
 * One-time migration: create device_ports rows for every media server that has
 * outputs_data JSON but no device_ports yet.
 *
 * Source data:  media_servers.outputs_data (JSON array)
 * Target table: device_ports
 *
 * outputs_data shape (from ServerPairModal):
 *   { name: string, role?: string, type: string, resolution?: { width, height }, frameRate?: number }
 *   where type = "DP" | "HDMI" | "SDI" | "DisplayPort" etc.
 *
 * Mapping:
 *   output.type   → io_type (connector type)
 *   output.name   → port_label
 *   direction     = "OUTPUT"  (media servers are output-only)
 *   format_uuid   = null (user must set manually — no direct mapping)
 *   note          = output.role if present
 *
 * Run with:
 *   npx tsx api/scripts/backfill-media-server-ports.ts
 *
 * Safe to re-run — skips devices that already have device_ports.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OutputData {
  name?: string;
  role?: string;
  type?: string;
  resolution?: { width: number; height: number };
  frameRate?: number;
}

async function main() {
  console.log('📥 Starting media server ports backfill…\n');

  const mediaServers = await prisma.media_servers.findMany({
    where: { is_deleted: false },
  });

  let skipped = 0;
  let created = 0;
  let noOutputs = 0;

  for (const server of mediaServers) {
    // Parse outputs_data JSON
    let outputs: OutputData[] = [];
    if (Array.isArray(server.outputs_data)) {
      outputs = server.outputs_data as OutputData[];
    } else if (server.outputs_data && typeof server.outputs_data === 'object') {
      outputs = [server.outputs_data as OutputData];
    }

    if (outputs.length === 0) {
      noOutputs++;
      console.log(`  ⚠️  Skip ${server.id} — no outputs_data`);
      continue;
    }

    // Check for existing device_ports
    const existing = await prisma.device_ports.count({
      where: { device_uuid: server.uuid, is_deleted: false },
    });

    if (existing > 0) {
      console.log(`  ⏭  Skip ${server.id} (${server.uuid.slice(0, 8)}) — already has ${existing} port(s)`);
      skipped++;
      continue;
    }

    const portsToCreate = outputs.map((output, idx) => {
      const portIndex = idx + 1;
      const ioType = output.type || 'DP';
      const portLabel = output.name || `Output ${portIndex}`;
      const note = output.role ? output.role : null;

      return {
        id: `${server.id}_out_${portIndex}`,
        production_id: server.production_id,
        device_uuid: server.uuid,
        spec_port_uuid: null,
        port_label: portLabel,
        io_type: ioType,
        direction: 'OUTPUT' as const,
        format_uuid: null,
        note,
        updated_at: new Date(),
        version: 1,
        is_deleted: false,
      };
    });

    await prisma.device_ports.createMany({ data: portsToCreate });

    console.log(`  ✅ ${server.id} — created ${portsToCreate.length} port(s): ${portsToCreate.map(p => `${p.port_label}(${p.io_type})`).join(', ')}`);
    created += portsToCreate.length;
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`  Servers processed:   ${mediaServers.length}`);
  console.log(`  Ports created:       ${created}`);
  console.log(`  Devices skipped:     ${skipped}  (already had ports)`);
  console.log(`  Devices no outputs:  ${noOutputs}`);
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch(err => { console.error('❌ Fatal error:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
