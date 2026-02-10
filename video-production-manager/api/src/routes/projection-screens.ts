import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all projection-screens for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const projectionScreens = await prisma.projection_screens.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(projectionScreens));
  } catch (error) {
    console.error('Error fetching projection-screens:', error);
    res.status(500).json({ error: 'Failed to fetch projection-screens' });
  }
});

// Create projectionScreen
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...projectionScreenData } = req.body;
    const snakeCaseData = toSnakeCase(projectionScreenData);
    
    const projectionScreen = await prisma.projection_screens.create({
      data: {
        ...snakeCaseData,
        productionId,
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: projectionScreen.production_id,
      eventType: EventType.PROJECTION_SCREEN,
      operation: EventOperation.CREATE,
      entityId: projectionScreen.id,
      entityData: projectionScreen,
      userId: userId || 'system',
      userName: userName || 'System',
      version: projectionScreen.version
    });
    
    // Broadcast to production room
    io.to(`production:${projectionScreen.production_id}`).emit('entity:created', {
      entityType: 'projectionScreen',
      entity: toCamelCase(projectionScreen),
      userId,
      userName
    });
    
    res.status(201).json(toCamelCase(projectionScreen));
  } catch (error) {
    console.error('Error creating projectionScreen:', error);
    res.status(500).json({ error: 'Failed to create projectionScreen' });
  }
});

// Update projectionScreen
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.projection_screens.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'ProjectionScreen not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This projectionScreen has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const projectionScreen = await prisma.projection_screens.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, projectionScreen);
    
    await recordEventFn({
      productionId: projectionScreen.production_id,
      eventType: EventType.PROJECTION_SCREEN,
      operation: EventOperation.UPDATE,
      entityId: projectionScreen.id,
      entityData: projectionScreen,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: projectionScreen.version
    });
    
    // Broadcast to production room
    io.to(`production:${projectionScreen.production_id}`).emit('entity:updated', {
      entityType: 'projectionScreen',
      entity: projectionScreen,
      userId,
      userName
    });
    
    res.json(projectionScreen);
  } catch (error) {
    console.error('Error updating projectionScreen:', error);
    res.status(500).json({ error: 'Failed to update projectionScreen' });
  }
});

// Delete projectionScreen (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.projection_screens.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'ProjectionScreen not found' });
    }
    
    // Soft delete
    await prisma.projection_screens.update({
      where: { id },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.PROJECTION_SCREEN,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'projectionScreen',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting projectionScreen:', error);
    res.status(500).json({ error: 'Failed to delete projectionScreen' });
  }
});

export default router;
