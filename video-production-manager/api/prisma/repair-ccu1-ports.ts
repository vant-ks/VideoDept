/**
 * repair-ccu1-ports.ts
 * One-time fix for CCU 1 which had 3 pre-backfill port rows with UUID-based IDs
 * and no spec_port_uuid. Soft-deletes the old rows and creates 5 correct ones.
 *
 * Run: npx ts-node prisma/repair-ccu1-ports.ts
 */
import { PrismaClient, PortType } from '@prisma/client';

const prisma = new PrismaClient();

const CCU1_UUID        = 'afa75ed2-e433-46af-ba65-bd2d372adf96';
const CCU1_ID          = 'CCU 1';
const PRODUCTION_ID    = '447902cb-5ade-4756-b181-82b741cd1a40';

// Sony HDCU-3500 spec port UUIDs (from equipment_io_ports)
const SPEC_PORTS = [
  { specUuid: '63d438b1-d6e0-46d8-aae9-20cd6e3e184d', ioType: 'SMPTE Fiber', label: 'Camera Input', direction: PortType.INPUT,  idx: 0 },
  { specUuid: 'cc4b26e7-f27c-42a2-8be3-b1b6e63708ca', ioType: 'Reference',   label: 'Ref In',       direction: PortType.INPUT,  idx: 1 },
  { specUuid: 'bd02816b-d0bb-4683-aa73-3c07e5e1ead1', ioType: 'SDI',         label: 'SDI Out 1',    direction: PortType.OUTPUT, idx: 0 },
  { specUuid: '8db6d485-9069-4729-8718-906c46ebf44b', ioType: 'SDI',         label: 'SDI Out 2',    direction: PortType.OUTPUT, idx: 1 },
  { specUuid: '8c4673a8-5fc6-4a3b-a773-1bcc9236d23f', ioType: 'SDI',         label: 'Viewfinder',   direction: PortType.OUTPUT, idx: 2 },
];

// Old stale port UUIDs to soft-delete
const STALE_UUIDS = [
  'f091e00c-fe5d-4d84-8571-db3e59834f98',
  '6326134f-48c2-41aa-ac11-af72fb80f5a4',
  'e3004914-84a1-4b83-85c5-4dd53fa26ee3',
];

async function main() {
  console.log('\n🔧 Repairing CCU 1 device_ports\n');

  // 1. Soft-delete the 3 stale rows
  const deleted = await prisma.device_ports.updateMany({
    where: { uuid: { in: STALE_UUIDS } },
    data: { is_deleted: true, updated_at: new Date() },
  });
  console.log(`  🗑  Soft-deleted ${deleted.count} stale port(s)`);

  // 2. Create 5 correct rows
  const now = new Date();
  let created = 0;
  for (const p of SPEC_PORTS) {
    const dir = p.direction === PortType.INPUT ? 'in' : 'out';
    await prisma.device_ports.create({
      data: {
        id:             `${CCU1_ID}_${dir}_${p.idx}`,
        production_id:  PRODUCTION_ID,
        device_uuid:    CCU1_UUID,
        spec_port_uuid: p.specUuid,
        port_label:     p.label,
        io_type:        p.ioType,
        direction:      p.direction,
        updated_at:     now,
        version:        1,
      },
    });
    console.log(`  ✅ Created ${dir.toUpperCase()} ${p.idx} — ${p.ioType} "${p.label}"`);
    created++;
  }

  console.log(`\nDone: ${deleted.count} deleted, ${created} created`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
