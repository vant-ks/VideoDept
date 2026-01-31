import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';

const router = Router();

// GET all productions
router.get('/', async (req: Request, res: Response) => {
  try {
    const productions = await prisma.productions.findMany({
      where: { is_deleted: false },
      orderBy: { created_at: 'desc' }
    });
    // Map show_name to name for frontend compatibility
    const mapped = productions.map(p => ({ ...p, name: p.show_name }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching productions:', error);
    res.status(500).json({ error: 'Failed to fetch productions' });
  }
});

// GET single production
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const production = await prisma.productions.findUnique({
      where: { id: req.params.id }
    });

    if (!production || production.is_deleted) {
      return res.status(404).json({ error: 'Production not found' });
    }

    // Map show_name to name for frontend compatibility
    res.json({ ...production, name: production.show_name });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch production' });
  }
});

// POST create production
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, ...restData } = req.body;
    const production = await prisma.productions.create({
      data: {
        id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...restData,
        show_name: name || restData.show_name, // Map 'name' to 'show_name'
        updated_at: new Date()
      }
    });
    
    // Broadcast to production list room
    const userId = req.body.userId || 'system';
    const userName = req.body.userName || 'System';
    io.to('production-list').emit('production:created', {
      production: { ...production, name: production.show_name },
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
    const current = await prisma.productions.findUnique({
      where: { id: req.params.id }
    });
    
    if (!current || current.is_deleted) {
      return res.status(404).json({ error: 'Production not found' });
    }
    
    // Check for version conflict
    if (current.version !== clientVersion) {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'Production was modified by another user',
        currentVersion: current.version,
        serverData: { ...current, name: current.show_name }
      });
    }
    
    // Update with incremented version
    const production = await prisma.productions.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...(name && { show_name: name }), // Map name to show_name if provided
        version: clientVersion + 1,
        updated_at: new Date()
      }
    });
    
    // Broadcast to production list room
    const userId = req.body.userId || 'system';
    const userName = req.body.userName || 'System';
    io.to('production-list').emit('production:updated', {
      production: { ...production, name: production.show_name },
      userId,
      userName
    });
    
    res.json({ ...production, name: production.show_name });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update production' });
  }
});

// DELETE production
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.productions.update({
      where: { id: req.params.id },
      data: { is_deleted: true, version: { increment: 1 } }
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
