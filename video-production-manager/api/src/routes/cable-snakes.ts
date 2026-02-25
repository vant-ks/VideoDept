import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all cable-snakes for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const cableSnakes = await prisma.cable_snakes.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(cableSnakes));
  } catch (error) {
    console.error('Error fetching cable-snakes:', error);
    res.status(500).json({ error: 'Failed to fetch cable-snakes' });
  }
});

// Create cableSnake
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...cableSnakeData } = req.body;
    const snakeCaseData = toSnakeCase(cableSnakeData);
    
    const cableSnake = await prisma.cable_snakes.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: cableSnake.production_id,
      eventType: EventType.CABLE_SNAKE,
      operation: EventOperation.CREATE,
      entityId: cableSnake.id,
      entityData: cableSnake,
      userId: userId || 'system',
      userName: userName || 'System',
      version: cableSnake.version
    });
    
    // Broadcast to production room
    io.to(`production:${cableSnake.production_id}`).emit('entity:created', {
      entityType: 'cableSnake',
      entity: toCamelCase(cableSnake),
      userId,
      userName
    });
    
    res.status(201).json(toCamelCase(cableSnake));
  } catch (error) {
    console.error('Error creating cableSnake:', error);
    res.status(500).json({ error: 'Failed to create cableSnake' });
  }
});

// Update cableSnake
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    const snakeCaseUpdates = toSnakeCase(updates);
    
    // Get current version for conflict detection
    const current = await prisma.cable_snakes.findUnique({
      where: { uuid }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'CableSnake not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This cableSnake has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const cableSnake = await prisma.cable_snakes.update({
      where: { uuid },
      data: {
        ...snakeCaseUpdates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, cableSnake);
    
    await recordEventFn({
      productionId: cableSnake.production_id,
      eventType: EventType.CABLE_SNAKE,
      operation: EventOperation.UPDATE,
      entityId: cableSnake.id,
      entityData: cableSnake,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: cableSnake.version
    });
    
    // Broadcast to production room
    io.to(`production:${cableSnake.production_id}`).emit('entity:updated', {
      entityType: 'cableSnake',
      entity: toCamelCase(cableSnake),
      userId,
      userName
    });
    
    res.json(toCamelCase(cableSnake));
  } catch (error) {
    console.error('Error updating cableSnake:', error);
    res.status(500).json({ error: 'Failed to update cableSnake' });
  }
});

// Delete cableSnake (soft delete)
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.cable_snakes.findUnique({ where: { uuid } });
    
    if (!current) {
      return res.status(404).json({ error: 'CableSnake not found' });
    }
    
    // Soft delete
    await prisma.cable_snakes.update({
      where: { uuid },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.CABLE_SNAKE,
      operation: EventOperation.DELETE,
      entityId: uuid,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'cableSnake',
      entityId: uuid,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting cableSnake:', error);
    res.status(500).json({ error: 'Failed to delete cableSnake' });
  }
});

export default router;
