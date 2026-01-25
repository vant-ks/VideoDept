import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

// GET all sends for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const sends = await prisma.send.findMany({
      where: {
        productionId: req.params.productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(sends);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch sends' });
  }
});

// GET single send
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const send = await prisma.send.findUnique({
      where: { id: req.params.id }
    });

    if (!send || send.isDeleted) {
      return res.status(404).json({ error: 'Send not found' });
    }

    res.json(send);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch send' });
  }
});

// POST create send
router.post('/', async (req: Request, res: Response) => {
  try {
    const send = await prisma.send.create({
      data: req.body
    });
    res.status(201).json(send);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create send' });
  }
});

// PUT update send
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const send = await prisma.send.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        version: { increment: 1 }
      }
    });
    res.json(send);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update send' });
  }
});

// DELETE send
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.send.update({
      where: { id: req.params.id },
      data: { isDeleted: true, version: { increment: 1 } }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete send' });
  }
});

export default router;
