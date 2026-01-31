import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all checklist-items for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const checklistItems = await prisma.checklist_items.findMany({
      where: {
        production_id: productionId
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(checklistItems));
  } catch (error) {
    console.error('Error fetching checklist-items:', error);
    res.status(500).json({ error: 'Failed to fetch checklist-items' });
  }
});

// Create checklistItem
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...checklistItem_data } = req.body;
    
    const checklistItem = await prisma.checklist_items.create({
      data: checklistItem_data
    });
    
    // Record event
    await recordEvent({
      production_id: checklistItem.production_id,
      eventType: EventType.CHECKLIST_ITEM,
      operation: EventOperation.CREATE,
      entityId: checklistItem.id,
      entityData: checklistItem,
      userId: userId || 'system',
      userName: userName || 'System',
      version: checklistItem.version
    });
    
    // Broadcast to production room
    io.to(`production:${checklistItem.production_id}`).emit('entity:created', {
      entityType: 'checklistItem',
      entity: checklistItem,
      userId,
      userName
    });
    
    res.status(201).json(checklistItem);
  } catch (error) {
    console.error('Error creating checklistItem:', error);
    res.status(500).json({ error: 'Failed to create checklistItem' });
  }
});

// Update checklistItem
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.checklist_items.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'ChecklistItem not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This checklistItem has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const checklistItem = await prisma.checklist_items.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, checklistItem);
    
    await recordEventFn({
      production_id: checklistItem.productionId,
      eventType: EventType.CHECKLIST_ITEM,
      operation: EventOperation.UPDATE,
      entityId: checklistItem.id,
      entityData: checklistItem,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: checklistItem.version
    });
    
    // Broadcast to production room
    io.to(`production:${checklistItem.productionId}`).emit('entity:updated', {
      entityType: 'checklistItem',
      entity: checklistItem,
      userId,
      userName
    });
    
    res.json(checklistItem);
  } catch (error) {
    console.error('Error updating checklistItem:', error);
    res.status(500).json({ error: 'Failed to update checklistItem' });
  }
});

// Delete checklistItem (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.checklist_items.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'ChecklistItem not found' });
    }
    
    // Soft delete
    await prisma.checklist_items.update({
      where: { id },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      production_id: current.productionId,
      eventType: EventType.CHECKLIST_ITEM,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
      entityType: 'checklistItem',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting checklistItem:', error);
    res.status(500).json({ error: 'Failed to delete checklistItem' });
  }
});

export default router;
