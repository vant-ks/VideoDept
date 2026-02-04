import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { toSnakeCase } from '../utils/caseConverter';

const router = Router();

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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.equipment_specs.findUnique({
      where: { id: req.params.id },
      include: {
        equipment_io_ports: true,
        equipment_cards: {
          include: {
            equipment_io_ports: true
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
        category: snakeCaseData.category,
        manufacturer: snakeCaseData.manufacturer,
        model: snakeCaseData.model,
        io_architecture: snakeCaseData.io_architecture,
        card_slots: snakeCaseData.card_slots,
        format_by_io: snakeCaseData.format_by_io,
        is_secondary_device: snakeCaseData.is_secondary_device,
        device_formats: snakeCaseData.device_formats,
        specs: snakeCaseData.specs
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

// PUT update equipment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const snakeCaseData = toSnakeCase(req.body);

    const equipment = await prisma.equipment_specs.update({
      where: { id: req.params.id },
      data: {
        category: snakeCaseData.category,
        manufacturer: snakeCaseData.manufacturer,
        model: snakeCaseData.model,
        io_architecture: snakeCaseData.io_architecture,
        card_slots: snakeCaseData.card_slots,
        format_by_io: snakeCaseData.format_by_io,
        is_secondary_device: snakeCaseData.is_secondary_device,
        device_formats: snakeCaseData.device_formats,
        specs: snakeCaseData.specs,
        version: { increment: 1 }
      },
      include: {
        equipment_io_ports: true,
        equipment_cards: {
          include: {
            equipment_io_ports: true
          }
        }
      }
    });

    res.json(equipment);
  } catch (error: any) {
    console.error('Error updating equipment:', error);
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

// DELETE equipment (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.equipment_specs.update({
      where: { id: req.params.id },
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
