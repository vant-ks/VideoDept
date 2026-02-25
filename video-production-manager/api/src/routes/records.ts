import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all records for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const records = await prisma.records.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(records));
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Create record
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...recordData } = req.body;
    const snakeCaseData = toSnakeCase(recordData);
    
    const recordEntity = await prisma.records.create({
      data: {
        ...snakeCaseData,
        productionId,
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: recordEntity.production_id,
      eventType: EventType.RECORD,
      operation: EventOperation.CREATE,
      entityId: recordEntity.id,
      entityData: recordEntity,
      userId: userId || 'system',
      userName: userName || 'System',
      version: recordEntity.version
    });
    
    // Broadcast to production room
    io.to(`production:${recordEntity.production_id}`).emit('entity:created', {
      entityType: 'record',
      entity: toCamelCase(recordEntity),
      userId,
      userName
    });
    
    res.status(201).json(toCamelCase(recordEntity));
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// Update record
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.records.findUnique({
      where: { uuid }
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
      where: { uuid },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, record);
    
    await recordEventFn({
      productionId: record.production_id,
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
    io.to(`production:${record.production_id}`).emit('entity:updated', {
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
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.records.findUnique({ where: { uuid } });
    
    if (!current) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Soft delete
    await prisma.records.update({
      where: { uuid },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.RECORD,
      operation: EventOperation.DELETE,
      entityId: uuid,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'record',
      entityId: uuid,
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
