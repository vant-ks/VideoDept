import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// Get all records for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const records = await prisma.records.findMany({
      where: {
        productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Create record
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...record_data } = req.body;
    
    const record = await prisma.records.create({
      data: record_data
    });
    
    // Record event
    await recordEvent({
      productionId: record.productionId,
      eventType: EventType.RECORD,
      operation: EventOperation.CREATE,
      entityId: record.id,
      entityData: record,
      userId: userId || 'system',
      userName: userName || 'System',
      version: record.version
    });
    
    // Broadcast to production room
    io.to(`production:${record.productionId}`).emit('entity:created', {
      entityType: 'record',
      entity: record,
      userId,
      userName
    });
    
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// Update record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.records.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This record has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const record = await prisma.records.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, record);
    
    await recordEventFn({
      productionId: record.productionId,
      eventType: EventType.RECORD,
      operation: EventOperation.UPDATE,
      entityId: record.id,
      entityData: record,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: record.version
    });
    
    // Broadcast to production room
    io.to(`production:${record.productionId}`).emit('entity:updated', {
      entityType: 'record',
      entity: record,
      userId,
      userName
    });
    
    res.json(record);
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// Delete record (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.records.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Soft delete
    await prisma.records.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.productionId,
      eventType: EventType.RECORD,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
      entityType: 'record',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

export default router;
