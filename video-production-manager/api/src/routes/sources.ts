import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

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
    const { outputs, productionId, userId, userName, ...sourceData } = req.body;

    const source = await prisma.source.create({
      data: {
        ...sourceData,
        productionId,
        outputs: outputs ? {
          create: outputs.map((output: any) => ({
            connector: output.connector,
            outputIndex: output.outputIndex || 1,
            hRes: output.hRes,
            vRes: output.vRes,
            rate: output.rate,
            standard: output.standard
          }))
        } : undefined
      },
      include: { outputs: true }
    });

    // Record CREATE event
    await recordEvent({
      productionId,
      eventType: EventType.SOURCE,
      operation: EventOperation.CREATE,
      entityId: source.id,
      entityData: source,
      userId: userId || 'system',
      userName: userName || 'System',
      version: 1
    });

    // Broadcast event to production room
    io.to(`production:${productionId}`).emit('entity:created', {
      entityType: 'source',
      entity: source,
      userId,
      userName
    });

    res.status(201).json(source);
  } catch (error: any) {
    console.error('Create source error:', error);
    res.status(500).json({ error: 'Failed to create source', details: error.message });
  }
});

// PUT update source (with event recording and conflict detection)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { outputs, userId, userName, version: clientVersion, ...updateData } = req.body;
    
    // Get current source for diff and conflict detection
    const currentSource = await prisma.source.findUnique({
      where: { id: req.params.id },
      include: { outputs: true }
    });
    
    if (!currentSource || currentSource.isDeleted) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && currentSource.version !== clientVersion) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Source was modified by another user',
        currentVersion: currentSource.version,
        serverData: currentSource
      });
    }
    
    const updatedSource = await prisma.source.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        version: { increment: 1 },
        lastModifiedBy: userId || 'system'
      },
      include: { outputs: true }
    });
    
    // Calculate diff and record event
    const changes = calculateDiff(currentSource, updatedSource);
    await recordEvent({
      productionId: currentSource.productionId,
      eventType: EventType.SOURCE,
      operation: EventOperation.UPDATE,
      entityId: updatedSource.id,
      entityData: updatedSource,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: updatedSource.version
    });

    // Broadcast event to production room
    io.to(`production:${currentSource.productionId}`).emit('entity:updated', {
      entityType: 'source',
      entity: updatedSource,
      changes,
      userId,
      userName
    });

    res.json(updatedSource);
  } catch (error: any) {
    console.error('Update source error:', error);
    res.status(500).json({ error: 'Failed to update source', details: error.message });
  }
});

// DELETE source (soft delete with event recording)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body;
    
    const source = await prisma.source.findUnique({
      where: { id: req.params.id },
      include: { outputs: true }
    });
    
    if (!source || source.isDeleted) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    const deletedSource = await prisma.source.update({
      where: { id: req.params.id },
      data: {
        isDeleted: true,
        version: { increment: 1 },
        lastModifiedBy: userId || 'system'
      },
      include: { outputs: true }
    });
    
    // Record DELETE event
    await recordEvent({
      productionId: source.productionId,
      eventType: EventType.SOURCE,
      operation: EventOperation.DELETE,
      entityId: deletedSource.id,
      entityData: deletedSource,
      userId: userId || 'system',
      userName: userName || 'System',
      version: deletedSource.version
    });

    // Broadcast event to production room
    io.to(`production:${source.productionId}`).emit('entity:deleted', {
      entityType: 'source',
      entityId: deletedSource.id,
      userId,
      userName
    });

    res.json({ success: true, message: 'Source deleted' });
  } catch (error: any) {
    console.error('Delete source error:', error);
    res.status(500).json({ error: 'Failed to delete source', details: error.message });
  }
});

export default router;
