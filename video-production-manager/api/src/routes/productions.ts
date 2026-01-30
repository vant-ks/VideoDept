import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';

const router = Router();

// GET all productions
router.get('/', async (req: Request, res: Response) => {
  try {
    const productions = await prisma.production.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });
    // Map showName to name for frontend compatibility
    const mapped = productions.map(p => ({ ...p, name: p.showName }));
    res.json(mapped);
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

    // Map showName to name for frontend compatibility
    res.json({ ...production, name: production.showName });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch production' });
  }
});

// POST create production
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, ...restData } = req.body;
    const production = await prisma.production.create({
      data: {
        ...restData,
        showName: name || restData.showName // Map 'name' to 'showName'
      }
    });
    
    // Broadcast to production list room
    const userId = req.body.userId || 'system';
    const userName = req.body.userName || 'System';
    io.to('production-list').emit('production:created', {
      production: { ...production, name: production.showName },
      userId,
      userName
    });
    
    res.status(201).json(production);
  } catch (error: any) {
    console.error('Production creation error:', error);
    res.status(500).json({ error: 'Failed to create production', details: error.message });
  }
});

// PUT update production with optimistic locking
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { version: clientVersion, name, ...updateData } = req.body;
    
    // Validate version provided
    if (clientVersion === undefined) {
      return res.status(400).json({ 
        error: 'Version required for conflict detection'
      });
    }
    
    // Get current version from database
    const current = await prisma.production.findUnique({
      where: { id: req.params.id }
    });
    
    if (!current || current.isDeleted) {
      return res.status(404).json({ error: 'Production not found' });
    }
    
    // Check for version conflict
    if (current.version !== clientVersion) {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'Production was modified by another user',
        currentVersion: current.version,
        serverData: { ...current, name: current.showName }
      });
    }
    
    // Update with incremented version
    const production = await prisma.production.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...(name && { showName: name }), // Map name to showName if provided
        version: clientVersion + 1,
        updatedAt: new Date()
      }
    });
    
    // Broadcast to production list room
    const userId = req.body.userId || 'system';
    const userName = req.body.userName || 'System';
    io.to('production-list').emit('production:updated', {
      production: { ...production, name: production.showName },
      userId,
      userName
    });
    
    res.json({ ...production, name: production.showName });
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
    
    // Broadcast to production list room
    io.to('production-list').emit('production:deleted', {
      productionId: req.params.id
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete production' });
  }
});

export default router;
