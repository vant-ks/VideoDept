/**
 * device-ports.ts
 * CRUD routes for the `device_ports` table.
 *
 * A DevicePort is the per-show instance of a physical port on a device.
 * It replaces the legacy scalar fields on ccus (fiber_input, reference_input,
 * outputs Json) and the ConnectorRouting[] JSON stored in sends.output_connector.
 *
 * URL layout (mounted at /api/device-ports):
 *   GET  /device/:deviceUuid          — all ports for one device instance
 *   GET  /production/:productionId    — all ports for a whole production
 *   GET  /:uuid                       — single port
 *   POST /                            — create one port
 *   POST /device/:deviceUuid/sync     — full replace: upsert all, delete removed
 *   PUT  /:uuid                       — update one port
 *   DELETE /:uuid                     — delete one port
 *   DELETE /device/:deviceUuid        — delete all ports for a device
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the display id: "{device.id}_{in|out}_{1-based index}" */
function buildPortId(deviceDisplayId: string, direction: string, index: number): string {
  const dir = direction === 'INPUT' ? 'in' : 'out';
  return `${deviceDisplayId}_${dir}_${index}`;
}

// ─── GET /device/:deviceUuid ──────────────────────────────────────────────────
// Primary read path — called when opening a CCU / Monitor modal.
// Returns ports in direction order (INPUTs first, then OUTPUTs), with format included.

router.get('/device/:deviceUuid', async (req: Request, res: Response) => {
  try {
    const ports = await prisma.device_ports.findMany({
      where: {
        device_uuid: req.params.deviceUuid,
        is_deleted: false,
      },
      include: { format: true },
      orderBy: [
        { direction: 'asc' },   // INPUT before OUTPUT
        { id: 'asc' },
      ],
    });
    res.json(toCamelCase(ports));
  } catch (error: any) {
    console.error('Failed to fetch device ports:', error);
    res.status(500).json({ error: 'Failed to fetch device ports' });
  }
});

// ─── GET /production/:productionId ────────────────────────────────────────────
// Used by signal-flow / patch views that need all ports across the production.

router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const ports = await prisma.device_ports.findMany({
      where: {
        production_id: req.params.productionId,
        is_deleted: false,
      },
      include: { format: true },
      orderBy: [{ device_uuid: 'asc' }, { direction: 'asc' }, { id: 'asc' }],
    });
    res.json(toCamelCase(ports));
  } catch (error: any) {
    console.error('Failed to fetch production device ports:', error);
    res.status(500).json({ error: 'Failed to fetch production device ports' });
  }
});

// ─── GET /:uuid ───────────────────────────────────────────────────────────────

router.get('/:uuid', async (req: Request, res: Response) => {
  try {
    const port = await prisma.device_ports.findUnique({
      where: { uuid: req.params.uuid },
      include: { format: true },
    });
    if (!port || port.is_deleted) {
      return res.status(404).json({ error: 'Device port not found' });
    }
    res.json(toCamelCase(port));
  } catch (error: any) {
    console.error('Failed to fetch device port:', error);
    res.status(500).json({ error: 'Failed to fetch device port' });
  }
});

// ─── POST / ───────────────────────────────────────────────────────────────────
// Create a single port. Called when adding a port manually.

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = toSnakeCase(req.body);

    // Reject empty strings → null for optional FKs
    (['spec_port_uuid', 'format_uuid', 'note'] as const).forEach(k => {
      if (data[k] === '') data[k] = null;
    });

    const port = await prisma.device_ports.create({
      data: {
        ...data,
        updated_at: new Date(),
        version: 1,
      },
      include: { format: true },
    });
    res.status(201).json(toCamelCase(port));
  } catch (error: any) {
    console.error('Failed to create device port:', error);
    res.status(500).json({ error: 'Failed to create device port' });
  }
});

// ─── POST /device/:deviceUuid/sync ────────────────────────────────────────────
// FULL REPLACE for one device's ports.
// Payload: { productionId, deviceDisplayId, ports: DevicePort[] }
//
// Algorithm:
//   1. Upsert every port in the payload (match on spec_port_uuid when present,
//      otherwise on uuid when editing an existing row, otherwise create new).
//   2. Soft-delete any existing ports for this device NOT present in the payload.
//
// This is the main write path triggered by saving a CCU / Monitor modal.

router.post('/device/:deviceUuid/sync', async (req: Request, res: Response) => {
  try {
    const { deviceUuid } = req.params;
    const { productionId, deviceDisplayId, ports } = req.body as {
      productionId: string;
      deviceDisplayId?: string;  // e.g. "CCU 1" — used for human-readable port IDs
      ports: Array<{
        uuid?: string;
        id?: string;
        specPortUuid?: string;
        portLabel: string;
        ioType: string;
        direction: 'INPUT' | 'OUTPUT';
        formatUuid?: string | null;
        note?: string | null;
      }>;
    };

    if (!productionId || !Array.isArray(ports)) {
      return res.status(400).json({ error: 'productionId and ports[] are required' });
    }

    // Fetch existing (non-deleted) ports for this device
    const existing = await prisma.device_ports.findMany({
      where: { device_uuid: deviceUuid, is_deleted: false },
    });

    const existingByUuid = new Map(existing.map(p => [p.uuid, p]));
    const incomingUuids = new Set<string>();

    // Count inputs/outputs for id generation (per direction)
    const counters: Record<string, number> = { INPUT: 0, OUTPUT: 0 };

    const upserted = await prisma.$transaction(
      ports.map(port => {
        counters[port.direction] = (counters[port.direction] || 0) + 1;
        const portId = port.id || buildPortId(deviceDisplayId || deviceUuid, port.direction, counters[port.direction]);

        const data = {
          id: portId,
          production_id: productionId,
          device_uuid: deviceUuid,
          spec_port_uuid: port.specPortUuid || null,
          port_label: port.portLabel,
          io_type: port.ioType,
          direction: port.direction,
          format_uuid: port.formatUuid || null,
          note: port.note || null,
          updated_at: new Date(),
        };

        if (port.uuid && existingByUuid.has(port.uuid)) {
          // Update existing row
          incomingUuids.add(port.uuid);
          return prisma.device_ports.update({
            where: { uuid: port.uuid },
            data,
          });
        } else {
          // Create new row
          return prisma.device_ports.create({
            data: { ...data, version: 1 },
          });
        }
      })
    );

    // Soft-delete ports that were removed from the payload
    const toRemove = existing
      .filter(p => !incomingUuids.has(p.uuid))
      .map(p => p.uuid);

    if (toRemove.length > 0) {
      await prisma.device_ports.updateMany({
        where: { uuid: { in: toRemove } },
        data: { is_deleted: true, updated_at: new Date() },
      });
    }

    // Re-fetch final state with format included
    const final = await prisma.device_ports.findMany({
      where: { device_uuid: deviceUuid, is_deleted: false },
      include: { format: true },
      orderBy: [{ direction: 'asc' }, { id: 'asc' }],
    });

    res.json(toCamelCase(final));
  } catch (error: any) {
    console.error('Failed to sync device ports:', error);
    res.status(500).json({ error: 'Failed to sync device ports' });
  }
});

// ─── PUT /:uuid ───────────────────────────────────────────────────────────────
// Update a single port field (e.g. change format, edit label, add note).

router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.device_ports.findUnique({
      where: { uuid: req.params.uuid },
    });
    if (!existing || existing.is_deleted) {
      return res.status(404).json({ error: 'Device port not found' });
    }

    const data = toSnakeCase(req.body);
    (['spec_port_uuid', 'format_uuid', 'note'] as const).forEach(k => {
      if (data[k] === '') data[k] = null;
    });

    const port = await prisma.device_ports.update({
      where: { uuid: req.params.uuid },
      data: {
        ...data,
        updated_at: new Date(),
        version: { increment: 1 },
      },
      include: { format: true },
    });
    res.json(toCamelCase(port));
  } catch (error: any) {
    console.error('Failed to update device port:', error);
    res.status(500).json({ error: 'Failed to update device port' });
  }
});

// ─── DELETE /:uuid ────────────────────────────────────────────────────────────

router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.device_ports.findUnique({
      where: { uuid: req.params.uuid },
    });
    if (!existing || existing.is_deleted) {
      return res.status(404).json({ error: 'Device port not found' });
    }
    await prisma.device_ports.update({
      where: { uuid: req.params.uuid },
      data: { is_deleted: true, updated_at: new Date() },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete device port:', error);
    res.status(500).json({ error: 'Failed to delete device port' });
  }
});

// ─── DELETE /device/:deviceUuid ───────────────────────────────────────────────
// Remove all ports for a device — used when the spec link is cleared or
// the device instance itself is deleted.

router.delete('/device/:deviceUuid', async (req: Request, res: Response) => {
  try {
    await prisma.device_ports.updateMany({
      where: { device_uuid: req.params.deviceUuid, is_deleted: false },
      data: { is_deleted: true, updated_at: new Date() },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete device ports for device:', error);
    res.status(500).json({ error: 'Failed to delete device ports' });
  }
});

export default router;
