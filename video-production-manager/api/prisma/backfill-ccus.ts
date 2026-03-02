/**
 * backfill-ccus.ts
 * Seeds device_ports rows for every non-deleted CCU that has an equipment_uuid.
 *
 * Source data carried over (non-destructively — CCU rows are NOT modified):
 *   fiber_input     → note on the SMPTE-Fiber / FIBER INPUT port
 *   reference_input → note on the REF / REFERENCE INPUT port
 *   outputs Json    → note on matching OUTPUT port (legacy format label)
 *
 * Idempotent: CCUs that already have device_ports rows are skipped.
 *
 * Run: npx ts-node prisma/backfill-ccus.ts
 * Run (dry-run): DRY_RUN=1 npx ts-node prisma/backfill-ccus.ts
 */

import { PrismaClient, PortType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';

// ── Helpers ──────────────────────────────────────────────────────────────────

function portId(deviceId: string, direction: 'in' | 'out', index: number) {
  return `${deviceId}_${direction}_${index}`;
}

/** Try to identify which spec port is the "fiber" or "reference" input by io_type / label. */
function isFiberPort(ioType: string, label?: string | null): boolean {
  const t = (ioType + ' ' + (label || '')).toLowerCase();
  return t.includes('smpte') || t.includes('fiber') || t.includes('fibre');
}

function isRefPort(ioType: string, label?: string | null): boolean {
  const t = (ioType + ' ' + (label || '')).toLowerCase();
  return t.includes('ref') || t.includes('reference') || t.includes('tri-level') || t.includes('sync');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function backfillCCUs() {
  console.log(`\n🌱 CCU device_ports backfill${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  const ccus = await prisma.ccus.findMany({
    where: { is_deleted: false, equipment_uuid: { not: null } },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Found ${ccus.length} CCU(s) with equipment_uuid\n`);

  let created = 0;
  let skipped = 0;
  let noSpec  = 0;

  for (const ccu of ccus) {
    // ── Skip if already backfilled ──────────────────────────────────────────
    const existing = await prisma.device_ports.count({
      where: { device_uuid: ccu.uuid, is_deleted: false },
    });
    if (existing > 0) {
      console.log(`  ⏭  ${ccu.id} — already has ${existing} port(s), skipping`);
      skipped++;
      continue;
    }

    // ── Fetch spec ports ────────────────────────────────────────────────────
    const specPorts = await prisma.equipment_io_ports.findMany({
      where: { equipment_uuid: ccu.equipment_uuid! },
      orderBy: [{ port_type: 'asc' }, { port_index: 'asc' }],
    });

    if (specPorts.length === 0) {
      console.log(`  ⚠️  ${ccu.id} — spec ${ccu.equipment_uuid} has no io_ports, skipping`);
      noSpec++;
      continue;
    }

    // ── Parse legacy outputs Json ────────────────────────────────────────────
    // Shape: Array<{ id: string; type: string; label?: string; format?: string }>
    let legacyOutputs: Array<{ id: string; type: string; label?: string; format?: string }> = [];
    if (ccu.outputs && Array.isArray(ccu.outputs) && (ccu.outputs as any[]).length > 0) {
      legacyOutputs = ccu.outputs as typeof legacyOutputs;
    }

    // ── Build port rows ──────────────────────────────────────────────────────
    const inputPorts  = specPorts.filter(p => p.port_type === PortType.INPUT);
    const outputPorts = specPorts.filter(p => p.port_type === PortType.OUTPUT);

    const rows: Prisma.device_portsCreateManyInput[] = [];

    let inIdx  = 0;
    let outIdx = 0;

    for (const sp of inputPorts) {
      inIdx++;
      // Carry over legacy signal label into note
      let note: string | null = null;
      if (isFiberPort(sp.io_type, sp.label) && ccu.fiber_input) {
        note = `Signal: ${ccu.fiber_input}`;
      } else if (isRefPort(sp.io_type, sp.label) && ccu.reference_input) {
        note = `Signal: ${ccu.reference_input}`;
      }

      rows.push({
        id:             portId(ccu.id, 'in', inIdx),
        production_id:  ccu.production_id,
        device_uuid:    ccu.uuid,
        spec_port_uuid: sp.uuid,
        port_label:     sp.label || sp.io_type,
        io_type:        sp.io_type,
        direction:      PortType.INPUT,
        format_uuid:    null,
        note,
        updated_at:     new Date(),
        version:        1,
      });
    }

    for (const sp of outputPorts) {
      outIdx++;
      // Try to find matching legacy output to carry over format label as note
      const legacyMatch = legacyOutputs.find(
        lo => lo.type?.toLowerCase() === sp.io_type?.toLowerCase()
           || lo.label?.toLowerCase() === sp.label?.toLowerCase()
      );
      const note = legacyMatch?.format ? `Format: ${legacyMatch.format}` : null;

      rows.push({
        id:             portId(ccu.id, 'out', outIdx),
        production_id:  ccu.production_id,
        device_uuid:    ccu.uuid,
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

    // ── Write ────────────────────────────────────────────────────────────────
    if (!DRY_RUN) {
      await prisma.device_ports.createMany({ data: rows });
    }

    const portSummary = rows.map((r: Prisma.device_portsCreateManyInput) => `${String(r.direction)[0]}:${r.io_type}`).join(', ');
    console.log(`  ✅ ${ccu.id.padEnd(10)} — ${rows.length} port(s): ${portSummary}`);
    created += rows.length;
  }

  console.log(`
Summary
───────
CCUs processed : ${ccus.length}
Ports created  : ${created}${DRY_RUN ? ' (dry run — not written)' : ''}
CCUs skipped   : ${skipped} (already backfilled)
CCUs no spec   : ${noSpec}
`);
}

backfillCCUs()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
