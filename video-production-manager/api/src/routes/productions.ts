import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

// GET all productions
router.get('/', async (req: Request, res: Response) => {
  try {
    const productions = await prisma.production.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json(productions);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch productions' });
  }
});

// GET single production
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const production = await prisma.production.findUnique({
      where: { id: req.params.id }
    });

    if (!production || production.isDeleted) {
      return res.status(404).json({ error: 'Production not found' });
    }

    res.json(production);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch production' });
  }
});

// POST create production
router.post('/', async (req: Request, res: Response) => {
  try {
    const production = await prisma.production.create({
      data: req.body
    });
    res.status(201).json(production);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create production' });
  }
});

// PUT update production
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const production = await prisma.production.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        version: { increment: 1 }
      }
    });
    res.json(production);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update production' });
  }
});

// DELETE production
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.production.update({
      where: { id: req.params.id },
      data: { isDeleted: true, version: { increment: 1 } }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete production' });
  }
});

export default router;
