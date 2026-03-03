/**
 * backfill-sends.ts
 * Seeds device_ports for all send-type entities that have an equipment_uuid:
 *   - Monitors  (sends.type = 'MONITOR')
 *   - LED Processors (sends.type = 'LED PROCESSOR')
 *   - Projectors (sends.type = 'PROJECTOR')
 *   - Any other send type with an equipment_uuid
 *
 * Legacy data carried over from output_connector (ConnectorRouting[] JSON):
 *   sourceSignal  → note: "Signal: {sourceSignal}"
 *   secondaryDevice → appended to note if set
 *
 * The spec (equipment_io_ports) is the source of truth for which ports exist.
 * The saved ConnectorRouting fills in signal assignments for matching ports.
 * New ports on the spec that weren't in the saved routing start empty.
 * Ports in the saved routing that no longer exist on the spec are dropped.
 *
 * Idempotent: sends that already have device_ports rows are skipped.
 *
 * Run: npx ts-node prisma/backfill-sends.ts
 * Run (dry-run): DRY_RUN=1 npx ts-node prisma/backfill-sends.ts
 */

import { PrismaClient, PortType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape stored in sends.output_connector (from Monitors.tsx ConnectorRouting) */
interface ConnectorRouting {
  portId:             string;
  portLabel:          string;
  portType:           string;
  direction:          'input' | 'output';
  sourceSignal:       string;
  hasSecondaryDevice: boolean;
  secondaryDevice:    string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function portId(deviceId: string, direction: 'in' | 'out', index: number) {
  return `${deviceId}_${direction}_${index}`;
}

function parseConnectorRouting(raw: string | null | undefined): Map<string, ConnectorRouting> {
  if (!raw) return new Map();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Map();
    return new Map((parsed as ConnectorRouting[]).map(r => [r.portId, r]));
  } catch {
    return new Map();
  }
}

function buildNote(routing: ConnectorRouting | undefined): string | null {
  if (!routing) return null;
  const parts: string[] = [];
  if (routing.sourceSignal?.trim()) {
    parts.push(`Signal: ${routing.sourceSignal.trim()}`);
  }
  if (routing.hasSecondaryDevice && routing.secondaryDevice?.trim()) {
    parts.push(`Via: ${routing.secondaryDevice.trim()}`);
  }
  return parts.length ? parts.join(' | ') : null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function backfillSends() {
  console.log(`\n🌱 Sends device_ports backfill${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  const sends = await prisma.sends.findMany({
    where: { is_deleted: false, equipment_uuid: { not: null } },
    orderBy: [{ type: 'asc' }, { created_at: 'asc' }],
  });

  console.log(`Found ${sends.length} send(s) with equipment_uuid\n`);

  // Group counts by type for summary
  const counts: Record<string, { created: number; skipped: number; noSpec: number }> = {};

  const ensureType = (type: string) => {
    if (!counts[type]) counts[type] = { created: 0, skipped: 0, noSpec: 0 };
  };

  for (const send of sends) {
    const type = send.type || 'UNKNOWN';
    ensureType(type);

    // ── Skip if already backfilled ─────────────────────────────────────────
    const existing = await prisma.device_ports.count({
      where: { device_uuid: send.uuid, is_deleted: false },
    });
    if (existing > 0) {
      console.log(`  ⏭  [${type.padEnd(14)}] ${send.id} — already has ${existing} port(s), skipping`);
      counts[type].skipped++;
      continue;
    }

    // ── Fetch spec ports ────────────────────────────────────────────────────
    const specPorts = await prisma.equipment_io_ports.findMany({
      where: { equipment_uuid: send.equipment_uuid! },
      orderBy: [{ port_type: 'asc' }, { port_index: 'asc' }],
    });

    if (specPorts.length === 0) {
      console.log(`  ⚠️  [${type.padEnd(14)}] ${send.id} — spec has no io_ports, skipping`);
      counts[type].noSpec++;
      continue;
    }

    // ── Parse legacy ConnectorRouting ────────────────────────────────────────
    // Keyed by spec port ID (portId in ConnectorRouting = equipment_io_ports.id)
    const savedRouting = parseConnectorRouting(send.output_connector);

    // ── Build port rows ──────────────────────────────────────────────────────
    const inputPorts  = specPorts.filter(p => p.port_type === PortType.INPUT);
    const outputPorts = specPorts.filter(p => p.port_type === PortType.OUTPUT);

    const rows: Prisma.device_portsCreateManyInput[] = [];
    let inIdx = 0, outIdx = 0;

    for (const sp of inputPorts) {
      inIdx++;
      // Match saved routing by spec port's id field (the one used as ConnectorRouting.portId)
      const routing = savedRouting.get(sp.id);
      rows.push({
        id:             portId(send.id, 'in', inIdx),
        production_id:  send.production_id,
        device_uuid:    send.uuid,
        spec_port_uuid: sp.uuid,
        port_label:     sp.label || sp.io_type,
        io_type:        sp.io_type,
        direction:      PortType.INPUT,
        format_uuid:    null,
        note:           buildNote(routing),
        updated_at:     new Date(),
        version:        1,
      });
    }

    for (const sp of outputPorts) {
      outIdx++;
      const routing = savedRouting.get(sp.id);
      rows.push({
        id:             portId(send.id, 'out', outIdx),
        production_id:  send.production_id,
        device_uuid:    send.uuid,
        spec_port_uuid: sp.uuid,
        port_label:     sp.label || sp.io_type,
        io_type:        sp.io_type,
        direction:      PortType.OUTPUT,
        format_uuid:    null,
        note:           buildNote(routing),
        updated_at:     new Date(),
        version:        1,
      });
    }

    if (!DRY_RUN) {
      await prisma.device_ports.createMany({ data: rows });
    }

    const portSummary = rows.map((r: Prisma.device_portsCreateManyInput) => `${String(r.direction)[0]}:${r.io_type}`).join(', ');
    const hasSignals  = rows.some(r => r.note);
    console.log(`  ✅ [${type.padEnd(14)}] ${send.id.padEnd(12)} — ${rows.length} port(s): ${portSummary}${hasSignals ? ' (signals carried)' : ''}`);
    counts[type].created += rows.length;
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\nSummary by type');
  console.log('─────────────────────────────────────────────────────');
  let totalCreated = 0;
  for (const [type, c] of Object.entries(counts)) {
    console.log(`  ${type.padEnd(16)} ${c.created} port(s) created, ${c.skipped} skipped, ${c.noSpec} no spec`);
    totalCreated += c.created;
  }
  console.log(`  ${'TOTAL'.padEnd(16)} ${totalCreated} port(s)${DRY_RUN ? ' (dry run — not written)' : ''}`);
  console.log();
}

backfillSends()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
