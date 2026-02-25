import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { broadcastEntityUpdate, broadcastEntityCreated, prepareVersionedUpdate } from '../utils/sync-helpers';
import { toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all connections for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const connections = await prisma.connections.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
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
    const { userId, userName, lastModifiedBy, ...connection_data } = req.body;
    const snakeCaseData = toSnakeCase(connection_data);
    
    const connection = await prisma.connections.create({
      data: {
        ...snakeCaseData,
        last_modified_by: lastModifiedBy || userId || null
      }
    });
    
    // Record event
    await recordEvent({
      productionId: connection.production_id,
      eventType: 'CONNECTION' as any,
      operation: EventOperation.CREATE,
      entityId: connection.id,
      entityData: connection,
      userId: userId || 'system',
      userName: userName || 'System',
      version: connection.version
    });
    
    // Broadcast creation via WebSocket
    broadcastEntityCreated({
      io,
      productionId: connection.production_id,
      entityType: 'connection',
      entityId: connection.id,
      data: connection
    });
    
    res.status(201).json(connection);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

// Update connection
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, lastModifiedBy, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.connections.findUnique({
      where: { uuid }
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
    
    // Update with incremented version and metadata
    const snakeCaseUpdates = toSnakeCase(updates);
    const connection = await prisma.connections.update({
      where: { uuid },
      data: {
        ...snakeCaseUpdates,
        ...prepareVersionedUpdate(lastModifiedBy || userId)
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, connection);
    
    await recordEventFn({
      productionId: connection.production_id,
      eventType: 'CONNECTION' as any,
      operation: EventOperation.UPDATE,
      entityId: connection.id,
      entityData: connection,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: connection.version
    });
    
    // Broadcast update via WebSocket
    broadcastEntityUpdate({
      io,
      productionId: connection.production_id,
      entityType: 'connection',
      entityId: connection.id,
      data: connection
    });
    
    res.json(connection);
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

// Delete connection (soft delete)
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.connections.findUnique({ where: { uuid } });
    
    if (!current) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Soft delete
    await prisma.connections.update({
      where: { uuid },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: 'CONNECTION' as any,
      operation: EventOperation.DELETE,
      entityId: uuid,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'connection',
      entityId: uuid,
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
