/**
 * backfill-computers.ts
 * Seeds device_ports for Computers AND Media Servers (both have equipment_uuid).
 *
 * Computers: cross-references the `source_outputs` table — if a source_output
 * row exists that matches a spec OUTPUT port's connector type, the format
 * dimensions (h_res × v_res @ rate) are stored as a note for reference.
 *
 * Media Servers: `outputs_data` Json is a count/label blob, not port-level;
 * ports are seeded from spec only with no additional carry-over.
 *
 * Idempotent: devices that already have device_ports rows are skipped.
 *
 * Run: npx ts-node prisma/backfill-computers.ts
 * Run (dry-run): DRY_RUN=1 npx ts-node prisma/backfill-computers.ts
 */

import { PrismaClient, PortType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';

function portId(deviceId: string, direction: 'in' | 'out', index: number) {
  return `${deviceId}_${direction}_${index}`;
}

function formatNote(hRes?: number | null, vRes?: number | null, rate?: number | null): string | null {
  if (!hRes && !vRes && !rate) return null;
  const parts = [hRes && vRes ? `${hRes}×${vRes}` : null, rate ? `${rate}Hz` : null].filter(Boolean);
  return parts.length ? `Format: ${parts.join(' @ ')}` : null;
}

// ── Generic per-device backfill ───────────────────────────────────────────────

async function backfillDevice(opts: {
  uuid: string;
  id: string;
  productionId: string;
  equipmentUuid: string;
  sourceOutputs?: Array<{ connector: string; h_res?: number | null; v_res?: number | null; rate?: number | null }>;
}): Promise<number> {
  const { uuid, id, productionId, equipmentUuid, sourceOutputs = [] } = opts;

  const existing = await prisma.device_ports.count({
    where: { device_uuid: uuid, is_deleted: false },
  });
  if (existing > 0) {
    console.log(`  ⏭  ${id} — already has ${existing} port(s), skipping`);
    return -1; // signal skip
  }

  const specPorts = await prisma.equipment_io_ports.findMany({
    where: { equipment_uuid: equipmentUuid },
    orderBy: [{ port_type: 'asc' }, { port_index: 'asc' }],
  });

  if (specPorts.length === 0) {
    console.log(`  ⚠️  ${id} — spec ${equipmentUuid} has no io_ports, skipping`);
    return -2; // signal no spec
  }

  const inputPorts  = specPorts.filter(p => p.port_type === PortType.INPUT);
  const outputPorts = specPorts.filter(p => p.port_type === PortType.OUTPUT);

  const rows: Prisma.device_portsCreateManyInput[] = [];
  let inIdx = 0, outIdx = 0;

  for (const sp of inputPorts) {
    inIdx++;
    rows.push({
      id:             portId(id, 'in', inIdx),
      production_id:  productionId,
      device_uuid:    uuid,
      spec_port_uuid: sp.uuid,
      port_label:     sp.label || sp.io_type,
      io_type:        sp.io_type,
      direction:      PortType.INPUT,
      format_uuid:    null,
      note:           null,
      updated_at:     new Date(),
      version:        1,
    });
  }

  for (const sp of outputPorts) {
    outIdx++;
    // Cross-reference source_outputs by connector type
    const match = sourceOutputs.find(
      so => so.connector?.toLowerCase() === sp.io_type?.toLowerCase()
    );
    const note = match ? formatNote(match.h_res, match.v_res, match.rate) : null;

    rows.push({
      id:             portId(id, 'out', outIdx),
      production_id:  productionId,
      device_uuid:    uuid,
      spec_port_uuid: sp.uuid,
      port_label:     sp.label || sp.io_type,
      io_type:        sp.io_type,
      direction:      PortType.OUTPUT,
      format_uuid:    null,
      note,
      updated_at:     new Date(),
      version:        1,
    });
  }

  if (!DRY_RUN) {
    await prisma.device_ports.createMany({ data: rows });
  }

  const portSummary = rows.map((r: Prisma.device_portsCreateManyInput) => `${String(r.direction)[0]}:${r.io_type}`).join(', ');
  console.log(`  ✅ ${id.padEnd(12)} — ${rows.length} port(s): ${portSummary}`);
  return rows.length;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function backfillComputers() {
  console.log(`\n🌱 Computer + Media Server device_ports backfill${DRY_RUN ? ' [DRY RUN]' : ''}`);

  // ── Computers (@@map("sources") in Prisma) ──────────────────────────────
  console.log('\n── Computers ──────────────────────────────────────');

  const computers = await prisma.computers.findMany({
    where: { is_deleted: false, equipment_uuid: { not: null } },
    include: { source_outputs: true },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Found ${computers.length} computer(s) with equipment_uuid\n`);

  let compCreated = 0, compSkipped = 0, compNoSpec = 0;

  for (const comp of computers) {
    const result = await backfillDevice({
      uuid:          comp.uuid,
      id:            comp.id,
      productionId:  comp.production_id,
      equipmentUuid: comp.equipment_uuid!,
      sourceOutputs: comp.source_outputs.map(so => ({
        connector: so.connector,
        h_res:     so.h_res,
        v_res:     so.v_res,
        rate:      so.rate,
      })),
    });
    if (result === -1) compSkipped++;
    else if (result === -2) compNoSpec++;
    else compCreated += result;
  }

  // ── Media Servers ────────────────────────────────────────────────────────
  console.log('\n── Media Servers ───────────────────────────────────');

  const mediaServers = await prisma.media_servers.findMany({
    where: { is_deleted: false, equipment_uuid: { not: null } },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Found ${mediaServers.length} media server(s) with equipment_uuid\n`);

  let msCreated = 0, msSkipped = 0, msNoSpec = 0;

  for (const ms of mediaServers) {
    const result = await backfillDevice({
      uuid:          ms.uuid,
      id:            ms.id,
      productionId:  ms.production_id,
      equipmentUuid: ms.equipment_uuid!,
    });
    if (result === -1) msSkipped++;
    else if (result === -2) msNoSpec++;
    else msCreated += result;
  }

  console.log(`
Summary
───────────────────────────────
Computers   — ${computers.length} found, ${compCreated} port(s) created, ${compSkipped} skipped, ${compNoSpec} no spec
Media Svrs  — ${mediaServers.length} found, ${msCreated} port(s) created, ${msSkipped} skipped, ${msNoSpec} no spec
${DRY_RUN ? '(dry run — nothing written)\n' : ''}
`);
}

backfillComputers()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
