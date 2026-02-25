import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all routers for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const routers = await prisma.routers.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(routers));
  } catch (error) {
    console.error('Error fetching routers:', error);
    res.status(500).json({ error: 'Failed to fetch routers' });
  }
});

// Create router
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...routerData } = req.body;
    const snakeCaseData = toSnakeCase(routerData);
    
    const routerEntity = await prisma.routers.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: routerEntity.production_id,
      eventType: EventType.ROUTER,
      operation: EventOperation.CREATE,
      entityId: routerEntity.id,
      entityData: routerEntity,
      userId: userId || 'system',
      userName: userName || 'System',
      version: routerEntity.version
    });
    
    // Broadcast to production room
    io.to(`production:${routerEntity.production_id}`).emit('entity:created', {
      entityType: 'router',
      entity: toCamelCase(routerEntity),
      userId,
      userName
    });
    
    res.status(201).json(toCamelCase(routerEntity));
  } catch (error) {
    console.error('Error creating router:', error);
    res.status(500).json({ error: 'Failed to create router' });
  }
});

// Update router
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.routers.findUnique({
      where: { uuid }
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
    const router = await prisma.routers.update({
      where: { uuid },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, router);
    
    await recordEventFn({
      productionId: router.production_id,
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
    io.to(`production:${router.production_id}`).emit('entity:updated', {
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
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.routers.findUnique({ where: { uuid } });
    
    if (!current) {
      return res.status(404).json({ error: 'Router not found' });
    }
    
    // Soft delete
    await prisma.routers.update({
      where: { uuid },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.ROUTER,
      operation: EventOperation.DELETE,
      entityId: uuid,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'router',
      entityId: uuid,
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
