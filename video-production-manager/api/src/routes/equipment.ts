import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

// GET all equipment specs
router.get('/', async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.equipmentSpec.findMany({
      where: { isDeleted: false },
      include: {
        ioPorts: true,
        cards: {
          include: {
            ioPorts: true
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
    const equipment = await prisma.equipmentSpec.findUnique({
      where: { id: req.params.id },
      include: {
        ioPorts: true,
        cards: {
          include: {
            ioPorts: true
          }
        }
      }
    });

    if (!equipment || equipment.isDeleted) {
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
    const {
      category,
      manufacturer,
      model,
      ioArchitecture,
      cardSlots,
      formatByIo,
      isSecondaryDevice,
      deviceFormats,
      specs
    } = req.body;

    const equipment = await prisma.equipmentSpec.create({
      data: {
        category,
        manufacturer,
        model,
        ioArchitecture,
        cardSlots,
        formatByIo,
        isSecondaryDevice,
        deviceFormats,
        specs
      },
      include: {
        ioPorts: true,
        cards: true
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
    const {
      category,
      manufacturer,
      model,
      ioArchitecture,
      cardSlots,
      formatByIo,
      isSecondaryDevice,
      deviceFormats,
      specs
    } = req.body;

    const equipment = await prisma.equipmentSpec.update({
      where: { id: req.params.id },
      data: {
        category,
        manufacturer,
        model,
        ioArchitecture,
        cardSlots,
        formatByIo,
        isSecondaryDevice,
        deviceFormats,
        specs,
        version: { increment: 1 }
      },
      include: {
        ioPorts: true,
        cards: {
          include: {
            ioPorts: true
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
    await prisma.equipmentSpec.update({
      where: { id: req.params.id },
      data: {
        isDeleted: true,
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
