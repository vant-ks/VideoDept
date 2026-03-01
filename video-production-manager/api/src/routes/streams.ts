import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { validateProductionExists } from '../utils/validation-helpers';

const router = Router();

// Get all streams for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const streams = await prisma.streams.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(streams));
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// Create stream
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...streamData } = req.body;
    
    // VALIDATION: Verify production exists in database
    try {
      await validateProductionExists(productionId);
    } catch (validationError: any) {
      console.error('❌ Production validation failed:', validationError.message);
      return res.status(400).json({ 
        error: validationError.message,
        code: 'PRODUCTION_NOT_FOUND',
        productionId 
      });
    }
    
    const snakeCaseData = toSnakeCase(streamData);
    
    const stream = await prisma.streams.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: stream.production_id,
      eventType: EventType.STREAM,
      operation: EventOperation.CREATE,
      entityId: stream.id,
      entityData: stream,
      userId: userId || 'system',
      userName: userName || 'System',
      version: stream.version
    });
    
    // Broadcast to production room
    io.to(`production:${stream.production_id}`).emit('entity:created', {
      entityType: 'stream',
      entity: toCamelCase(stream),
      userId,
      userName
    });
    
    res.status(201).json(toCamelCase(stream));
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// Update stream
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    const snakeCaseUpdates = toSnakeCase(updates);
    
    // Get current version for conflict detection
    const current = await prisma.streams.findUnique({
      where: { uuid }
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
    const stream = await prisma.streams.update({
      where: { uuid },
      data: {
        ...snakeCaseUpdates,
        updated_at: new Date(),
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, stream);
    
    await recordEventFn({
      productionId: stream.production_id,
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
    io.to(`production:${stream.production_id}`).emit('entity:updated', {
      entityType: 'stream',
      entity: toCamelCase(stream),
      userId,
      userName
    });
    
    res.json(toCamelCase(stream));
  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({ error: 'Failed to update stream' });
  }
});

// Delete stream (soft delete)
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.streams.findUnique({ where: { uuid } });
    
    if (!current) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Soft delete
    await prisma.streams.update({
      where: { uuid },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.STREAM,
      operation: EventOperation.DELETE,
      entityId: uuid,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'stream',
      entityId: uuid,
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
