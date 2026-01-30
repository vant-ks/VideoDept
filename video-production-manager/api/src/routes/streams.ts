import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// Get all streams for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const streams = await prisma.stream.findMany({
      where: {
        productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(streams);
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// Create stream
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...stream_data } = req.body;
    
    const stream = await prisma.stream.create({
      data: stream_data
    });
    
    // Record event
    await recordEvent({
      productionId: stream.productionId,
      eventType: EventType.STREAM,
      operation: EventOperation.CREATE,
      entityId: stream.id,
      entityData: stream,
      userId: userId || 'system',
      userName: userName || 'System',
      version: stream.version
    });
    
    // Broadcast to production room
    io.to(`production:${stream.productionId}`).emit('entity:created', {
      entityType: 'stream',
      entity: stream,
      userId,
      userName
    });
    
    res.status(201).json(stream);
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// Update stream
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.stream.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This stream has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const stream = await prisma.stream.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, stream);
    
    await recordEventFn({
      productionId: stream.productionId,
      eventType: EventType.STREAM,
      operation: EventOperation.UPDATE,
      entityId: stream.id,
      entityData: stream,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: stream.version
    });
    
    // Broadcast to production room
    io.to(`production:${stream.productionId}`).emit('entity:updated', {
      entityType: 'stream',
      entity: stream,
      userId,
      userName
    });
    
    res.json(stream);
  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({ error: 'Failed to update stream' });
  }
});

// Delete stream (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.stream.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Soft delete
    await prisma.stream.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.productionId,
      eventType: EventType.STREAM,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
      entityType: 'stream',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ error: 'Failed to delete stream' });
  }
});

export default router;
