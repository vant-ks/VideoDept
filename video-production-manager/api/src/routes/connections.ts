import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// Get all connections for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const connections = await prisma.connection.findMany({
      where: {
        productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Create connection
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...connection_data } = req.body;
    
    const connection = await prisma.connection.create({
      data: connection_data
    });
    
    // Record event
    await recordEvent({
      productionId: connection.productionId,
      eventType: EventType.CONNECTION,
      operation: EventOperation.CREATE,
      entityId: connection.id,
      entityData: connection,
      userId: userId || 'system',
      userName: userName || 'System',
      version: connection.version
    });
    
    // Broadcast to production room
    io.to(`production:${connection.productionId}`).emit('entity:created', {
      entityType: 'connection',
      entity: connection,
      userId,
      userName
    });
    
    res.status(201).json(connection);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

// Update connection
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.connection.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This connection has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const connection = await prisma.connection.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, connection);
    
    await recordEventFn({
      productionId: connection.productionId,
      eventType: EventType.CONNECTION,
      operation: EventOperation.UPDATE,
      entityId: connection.id,
      entityData: connection,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: connection.version
    });
    
    // Broadcast to production room
    io.to(`production:${connection.productionId}`).emit('entity:updated', {
      entityType: 'connection',
      entity: connection,
      userId,
      userName
    });
    
    res.json(connection);
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

// Delete connection (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.connection.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Soft delete
    await prisma.connection.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.productionId,
      eventType: EventType.CONNECTION,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
      entityType: 'connection',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

export default router;
