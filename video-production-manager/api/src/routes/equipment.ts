import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { toSnakeCase } from '../utils/caseConverter';
import crypto from 'crypto';

const router = Router();

// Map frontend ioArchitecture values to DB enum values
const toIoArchitectureEnum = (value: string | undefined): 'DIRECT' | 'CARD_BASED' => {
  if (!value) return 'DIRECT';
  const map: Record<string, 'DIRECT' | 'CARD_BASED'> = {
    direct: 'DIRECT',
    'card-based': 'CARD_BASED',
    DIRECT: 'DIRECT',
    CARD_BASED: 'CARD_BASED'
  };
  return map[value] ?? 'DIRECT';
};

// GET all equipment specs
router.get('/', async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.equipment_specs.findMany({
      where: { is_deleted: false },
      include: {
        equipment_io_ports: true,
        equipment_cards: {
          include: {
            equipment_card_io: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { manufacturer: 'asc' },
        { model: 'asc' }
      ]
    });

    res.json(equipment);
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// GET single equipment spec
router.get('/:uuid', async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.equipment_specs.findUnique({
      where: { uuid: req.params.uuid },
      include: {
        equipment_io_ports: true,
        equipment_cards: {
          include: {
            equipment_card_io: true
          }
        }
      }
    });

    if (!equipment || equipment.is_deleted) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// POST create new equipment
router.post('/', async (req: Request, res: Response) => {
  try {
    const snakeCaseData = toSnakeCase(req.body);

    const equipment = await prisma.equipment_specs.create({
      data: {
        id: crypto.randomUUID(),
        category: snakeCaseData.category,
        manufacturer: snakeCaseData.manufacturer,
        model: snakeCaseData.model,
        io_architecture: toIoArchitectureEnum(snakeCaseData.io_architecture),
        card_slots: snakeCaseData.card_slots,
        format_by_io: snakeCaseData.format_by_io,
        is_secondary_device: snakeCaseData.is_secondary_device,
        device_formats: snakeCaseData.device_formats,
        specs: snakeCaseData.specs,
        updated_at: new Date()
      },
      include: {
        equipment_io_ports: true,
        equipment_cards: true
      }
    });

    res.status(201).json(equipment);
  } catch (error: any) {
    console.error('Error creating equipment:', error);
    res.status(500).json({ error: 'Failed to create equipment' });
  }
});

// PUT update equipment (also replaces io_ports and cards when provided)
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const snakeCaseData = toSnakeCase(req.body);
    const equipmentUuid = req.params.uuid;

    const hasPorts = req.body.inputs !== undefined || req.body.outputs !== undefined;
    const hasCards = req.body.cards !== undefined;

    const coreData = {
      category: snakeCaseData.category,
      manufacturer: snakeCaseData.manufacturer,
      model: snakeCaseData.model,
      io_architecture: toIoArchitectureEnum(snakeCaseData.io_architecture),
      card_slots: snakeCaseData.card_slots,
      format_by_io: snakeCaseData.format_by_io,
      is_secondary_device: snakeCaseData.is_secondary_device,
      device_formats: snakeCaseData.device_formats,
      specs: snakeCaseData.specs,
      version: { increment: 1 },
      updated_at: new Date()
    };

    let equipment;

    if (hasPorts || hasCards) {
      // Transactionally update spec + replace ports/cards
      equipment = await prisma.$transaction(async (tx) => {
        const updated = await tx.equipment_specs.update({
          where: { uuid: equipmentUuid },
          data: coreData
        });

        // Replace direct I/O ports
        if (hasPorts) {
          await tx.equipment_io_ports.deleteMany({ where: { equipment_uuid: equipmentUuid } });

          const inputPorts: any[] = req.body.inputs || [];
          const outputPorts: any[] = req.body.outputs || [];
          const allPorts = [
            ...inputPorts.map((p: any, i: number) => ({
              uuid: crypto.randomUUID(),
              id: crypto.randomUUID(),
              equipment_id: updated.id,
              equipment_uuid: equipmentUuid,
              port_type: 'INPUT' as const,
              io_type: p.type || 'SDI',
              label: p.label || null,
              format: p.format || null,
              port_index: i,
              updated_at: new Date()
            })),
            ...outputPorts.map((p: any, i: number) => ({
              uuid: crypto.randomUUID(),
              id: crypto.randomUUID(),
              equipment_id: updated.id,
              equipment_uuid: equipmentUuid,
              port_type: 'OUTPUT' as const,
              io_type: p.type || 'SDI',
              label: p.label || null,
              format: p.format || null,
              port_index: i,
              updated_at: new Date()
            }))
          ];
          if (allPorts.length > 0) {
            await tx.equipment_io_ports.createMany({ data: allPorts });
          }
        }

        // Replace cards (equipment_card_io cascades from equipment_cards)
        if (hasCards) {
          await tx.equipment_cards.deleteMany({ where: { equipment_uuid: equipmentUuid } });

          for (const card of (req.body.cards as any[])) {
            const cardUuid = crypto.randomUUID();
            await tx.equipment_cards.create({
              data: {
                uuid: cardUuid,
                id: crypto.randomUUID(),
                equipment_id: updated.id,
                equipment_uuid: equipmentUuid,
                slot_number: card.slotNumber || 1,
                updated_at: new Date()
              }
            });

            const cardInputs: any[] = card.inputs || [];
            const cardOutputs: any[] = card.outputs || [];
            const cardAllPorts = [
              ...cardInputs.map((p: any, i: number) => ({
                uuid: crypto.randomUUID(),
                id: crypto.randomUUID(),
                card_id: cardUuid,
                card_uuid: cardUuid,
                port_type: 'INPUT' as const,
                io_type: p.type || 'SDI',
                label: p.label || null,
                format: p.format || null,
                port_index: i,
                updated_at: new Date()
              })),
              ...cardOutputs.map((p: any, i: number) => ({
                uuid: crypto.randomUUID(),
                id: crypto.randomUUID(),
                card_id: cardUuid,
                card_uuid: cardUuid,
                port_type: 'OUTPUT' as const,
                io_type: p.type || 'SDI',
                label: p.label || null,
                format: p.format || null,
                port_index: i,
                updated_at: new Date()
              }))
            ];
            if (cardAllPorts.length > 0) {
              await tx.equipment_card_io.createMany({ data: cardAllPorts });
            }
          }
        }

        return tx.equipment_specs.findUnique({
          where: { uuid: equipmentUuid },
          include: {
            equipment_io_ports: true,
            equipment_cards: { include: { equipment_card_io: true } }
          }
        });
      });
    } else {
      // Simple field-only update
      equipment = await prisma.equipment_specs.update({
        where: { uuid: equipmentUuid },
        data: coreData,
        include: {
          equipment_io_ports: true,
          equipment_cards: { include: { equipment_card_io: true } }
        }
      });
    }

    res.json(equipment);
  } catch (error: any) {
    console.error('Error updating equipment:', error);
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

// DELETE equipment (soft delete)
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    await prisma.equipment_specs.update({
      where: { uuid: req.params.uuid },
      data: {
        is_deleted: true,
        version: { increment: 1 }
      }
    });

    res.json({ success: true, message: 'Equipment deleted' });
  } catch (error: any) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

export default router;
