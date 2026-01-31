import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// Get all cable-snakes for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const cableSnakes = await prisma.cableSnake.findMany({
      where: {
        productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(cableSnakes);
  } catch (error) {
    console.error('Error fetching cable-snakes:', error);
    res.status(500).json({ error: 'Failed to fetch cable-snakes' });
  }
});

// Create cableSnake
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...cableSnake_data } = req.body;
    
    const cableSnake = await prisma.cableSnake.create({
      data: cableSnake_data
    });
    
    // Record event
    await recordEvent({
      productionId: cableSnake.productionId,
      eventType: EventType.CABLE_SNAKE,
      operation: EventOperation.CREATE,
      entityId: cableSnake.id,
      entityData: cableSnake,
      userId: userId || 'system',
      userName: userName || 'System',
      version: cableSnake.version
    });
    
    // Broadcast to production room
    io.to(`production:${cableSnake.productionId}`).emit('entity:created', {
      entityType: 'cableSnake',
      entity: cableSnake,
      userId,
      userName
    });
    
    res.status(201).json(cableSnake);
  } catch (error) {
    console.error('Error creating cableSnake:', error);
    res.status(500).json({ error: 'Failed to create cableSnake' });
  }
});

// Update cableSnake
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.cableSnake.findUnique({
      where: { id }
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
    const cableSnake = await prisma.cableSnake.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, cableSnake);
    
    await recordEventFn({
      productionId: cableSnake.productionId,
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
    io.to(`production:${cableSnake.productionId}`).emit('entity:updated', {
      entityType: 'cableSnake',
      entity: cableSnake,
      userId,
      userName
    });
    
    res.json(cableSnake);
  } catch (error) {
    console.error('Error updating cableSnake:', error);
    res.status(500).json({ error: 'Failed to update cableSnake' });
  }
});

// Delete cableSnake (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.cableSnake.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'CableSnake not found' });
    }
    
    // Soft delete
    await prisma.cableSnake.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.productionId,
      eventType: EventType.CABLE_SNAKE,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
      entityType: 'cableSnake',
      entityId: id,
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
