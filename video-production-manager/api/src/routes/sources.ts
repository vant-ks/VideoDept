import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

// GET all sources for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const sources = await prisma.source.findMany({
      where: {
        productionId: req.params.productionId,
        isDeleted: false
      },
      include: {
        outputs: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(sources);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// GET single source
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const source = await prisma.source.findUnique({
      where: { id: req.params.id },
      include: { outputs: true }
    });

    if (!source || source.isDeleted) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json(source);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch source' });
  }
});

// POST create source
router.post('/', async (req: Request, res: Response) => {
  try {
    const { outputs, ...sourceData } = req.body;

    const source = await prisma.source.create({
      data: {
        ...sourceData,
        outputs: {
          create: outputs || []
        }
      },
      include: { outputs: true }
    });

    res.status(201).json(source);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create source' });
  }
});

// PUT update source
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { outputs, ...sourceData } = req.body;

    const source = await prisma.source.update({
      where: { id: req.params.id },
      data: {
        ...sourceData,
        version: { increment: 1 }
      },
      include: { outputs: true }
    });

    res.json(source);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update source' });
  }
});

// DELETE source
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.source.update({
      where: { id: req.params.id },
      data: { isDeleted: true, version: { increment: 1 } }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

export default router;
