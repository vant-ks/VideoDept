/**
 * backfill-cameras.ts
 * Seeds device_ports rows for every non-deleted Camera that has an equipment_uuid.
 *
 * Cameras have no legacy per-port scalar data — ports are seeded purely from
 * the spec's equipment_io_ports (typically one SMPTE-Fiber output to CCU).
 *
 * Idempotent: Cameras that already have device_ports rows are skipped.
 *
 * Run: npx ts-node prisma/backfill-cameras.ts
 * Run (dry-run): DRY_RUN=1 npx ts-node prisma/backfill-cameras.ts
 */

import { PrismaClient, PortType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';

function portId(deviceId: string, direction: 'in' | 'out', index: number) {
  return `${deviceId}_${direction}_${index}`;
}

async function backfillCameras() {
  console.log(`\n🌱 Camera device_ports backfill${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  const cameras = await prisma.cameras.findMany({
    where: { is_deleted: false, equipment_uuid: { not: null } },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Found ${cameras.length} camera(s) with equipment_uuid\n`);

  let created = 0;
  let skipped = 0;
  let noSpec  = 0;

  for (const cam of cameras) {
    // ── Skip if already backfilled ──────────────────────────────────────────
    const existing = await prisma.device_ports.count({
      where: { device_uuid: cam.uuid, is_deleted: false },
    });
    if (existing > 0) {
      console.log(`  ⏭  ${cam.id} — already has ${existing} port(s), skipping`);
      skipped++;
      continue;
    }

    // ── Fetch spec ports ────────────────────────────────────────────────────
    const specPorts = await prisma.equipment_io_ports.findMany({
      where: { equipment_uuid: cam.equipment_uuid! },
      orderBy: [{ port_type: 'asc' }, { port_index: 'asc' }],
    });

    if (specPorts.length === 0) {
      console.log(`  ⚠️  ${cam.id} — spec ${cam.equipment_uuid} has no io_ports, skipping`);
      noSpec++;
      continue;
    }

    // ── Build port rows ──────────────────────────────────────────────────────
    const inputPorts  = specPorts.filter(p => p.port_type === PortType.INPUT);
    const outputPorts = specPorts.filter(p => p.port_type === PortType.OUTPUT);

    const rows: Prisma.device_portsCreateManyInput[] = [];
    let inIdx = 0, outIdx = 0;

    for (const sp of inputPorts) {
      inIdx++;
      rows.push({
        id:             portId(cam.id, 'in', inIdx),
        production_id:  cam.production_id,
        device_uuid:    cam.uuid,
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
      rows.push({
        id:             portId(cam.id, 'out', outIdx),
        production_id:  cam.production_id,
        device_uuid:    cam.uuid,
        spec_port_uuid: sp.uuid,
        port_label:     sp.label || sp.io_type,
        io_type:        sp.io_type,
        direction:      PortType.OUTPUT,
        format_uuid:    null,
        note:           null,
        updated_at:     new Date(),
        version:        1,
      });
    }

    if (!DRY_RUN) {
      await prisma.device_ports.createMany({ data: rows });
    }

    const portSummary = rows.map((r: Prisma.device_portsCreateManyInput) => `${String(r.direction)[0]}:${r.io_type}`).join(', ');
    console.log(`  ✅ ${cam.id.padEnd(12)} — ${rows.length} port(s): ${portSummary}`);
    created += rows.length;
  }

  console.log(`
Summary
───────
Cameras processed : ${cameras.length}
Ports created     : ${created}${DRY_RUN ? ' (dry run — not written)' : ''}
Cameras skipped   : ${skipped} (already backfilled)
Cameras no spec   : ${noSpec}
`);
}

backfillCameras()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
