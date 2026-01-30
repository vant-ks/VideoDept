import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// Get all routers for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const routers = await prisma.router.findMany({
      where: {
        productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(routers);
  } catch (error) {
    console.error('Error fetching routers:', error);
    res.status(500).json({ error: 'Failed to fetch routers' });
  }
});

// Create router
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...router_data } = req.body;
    
    const router = await prisma.router.create({
      data: router_data
    });
    
    // Record event
    await recordEvent({
      productionId: router.productionId,
      eventType: EventType.ROUTER,
      operation: EventOperation.CREATE,
      entityId: router.id,
      entityData: router,
      userId: userId || 'system',
      userName: userName || 'System',
      version: router.version
    });
    
    // Broadcast to production room
    io.to(`production:${router.productionId}`).emit('entity:created', {
      entityType: 'router',
      entity: router,
      userId,
      userName
    });
    
    res.status(201).json(router);
  } catch (error) {
    console.error('Error creating router:', error);
    res.status(500).json({ error: 'Failed to create router' });
  }
});

// Update router
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.router.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'Router not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This router has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const router = await prisma.router.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, router);
    
    await recordEventFn({
      productionId: router.productionId,
      eventType: EventType.ROUTER,
      operation: EventOperation.UPDATE,
      entityId: router.id,
      entityData: router,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: router.version
    });
    
    // Broadcast to production room
    io.to(`production:${router.productionId}`).emit('entity:updated', {
      entityType: 'router',
      entity: router,
      userId,
      userName
    });
    
    res.json(router);
  } catch (error) {
    console.error('Error updating router:', error);
    res.status(500).json({ error: 'Failed to update router' });
  }
});

// Delete router (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.router.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'Router not found' });
    }
    
    // Soft delete
    await prisma.router.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.productionId,
      eventType: EventType.ROUTER,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
      entityType: 'router',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting router:', error);
    res.status(500).json({ error: 'Failed to delete router' });
  }
});

export default router;
