import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all media-servers for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const mediaServers = await prisma.mediaServer.findMany({
      where: {
        productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(toCamelCase(mediaServers));
  } catch (error) {
    console.error('Error fetching media-servers:', error);
    res.status(500).json({ error: 'Failed to fetch media-servers' });
  }
});

// Create mediaServer
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...mediaServerData } = req.body;
    const snakeCaseData = toSnakeCase(mediaServerData);
    
    const mediaServer = await prisma.mediaServer.create({
      data: {
        ...snakeCaseData,
        productionId,
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: mediaServer.productionId,
      eventType: EventType.MEDIA_SERVER,
      operation: EventOperation.CREATE,
      entityId: mediaServer.id,
      entityData: mediaServer,
      userId: userId || 'system',
      userName: userName || 'System',
      version: mediaServer.version
    });
    
    // Broadcast to production room
    io.to(`production:${mediaServer.productionId}`).emit('entity:created', {
      entityType: 'mediaServer',
      entity: toCamelCase(mediaServer),
      userId,
      userName
    });
    
    res.status(201).json(toCamelCase(mediaServer));
  } catch (error) {
    console.error('Error creating mediaServer:', error);
    res.status(500).json({ error: 'Failed to create mediaServer' });
  }
});

// Update mediaServer
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.mediaServer.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'MediaServer not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This mediaServer has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const mediaServer = await prisma.mediaServer.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, mediaServer);
    
    await recordEventFn({
      productionId: mediaServer.productionId,
      eventType: EventType.MEDIA_SERVER,
      operation: EventOperation.UPDATE,
      entityId: mediaServer.id,
      entityData: mediaServer,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: mediaServer.version
    });
    
    // Broadcast to production room
    io.to(`production:${mediaServer.productionId}`).emit('entity:updated', {
      entityType: 'mediaServer',
      entity: mediaServer,
      userId,
      userName
    });
    
    res.json(mediaServer);
  } catch (error) {
    console.error('Error updating mediaServer:', error);
    res.status(500).json({ error: 'Failed to update mediaServer' });
  }
});

// Delete mediaServer (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.mediaServer.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'MediaServer not found' });
    }
    
    // Soft delete
    await prisma.mediaServer.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.productionId,
      eventType: EventType.MEDIA_SERVER,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
      entityType: 'mediaServer',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mediaServer:', error);
    res.status(500).json({ error: 'Failed to delete mediaServer' });
  }
});

export default router;
