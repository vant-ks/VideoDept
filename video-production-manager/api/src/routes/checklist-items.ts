import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { broadcastEntityUpdate, broadcastEntityCreated, broadcastEntityDeleted, prepareVersionedUpdate } from '../utils/sync-helpers';

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
    const { userId, userName, lastModifiedBy, ...checklistItemData } = req.body;
    
    // Convert camelCase to snake_case and prepare data for Prisma
    const snakeCaseData = toSnakeCase(checklistItemData);
    
    // Ensure updated_at is a valid DateTime
    const createData = {
      ...snakeCaseData,
      last_modified_by: lastModifiedBy || userId || null,
      updated_at: new Date()
    };
    
    const checklistItem = await prisma.checklist_items.create({
      data: createData
    });
    
    // Record event
    await recordEvent({
      productionId: checklistItem.production_id,
      eventType: EventType.CHECKLIST_ITEM,
      operation: EventOperation.CREATE,
      entityId: checklistItem.id,
      entityData: checklistItem,
      userId: userId || 'system',
      userName: userName || 'System',
      version: checklistItem.version
    });
    
    // Broadcast creation via WebSocket
    broadcastEntityCreated({
      io,
      productionId: checklistItem.production_id,
      entityType: 'checklist-item',
      entityId: checklistItem.id,
      data: toCamelCase(checklistItem)
    });
    
    res.status(201).json(toCamelCase(checklistItem));
  } catch (error) {
    console.error('Error creating checklistItem:', error);
    console.error('Request body was:', JSON.stringify(req.body, null, 2));
    res.status(500).json({ error: 'Failed to create checklistItem', details: (error as Error).message });
  }
});

// Update checklistItem
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, lastModifiedBy, ...updates } = req.body;
    
    // Convert camelCase to snake_case
    const snakeCaseUpdates = toSnakeCase(updates);
    
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
    
    // Update with incremented version and metadata
    const checklistItem = await prisma.checklist_items.update({
      where: { id },
      data: {
        ...snakeCaseUpdates,
        updated_at: new Date(),
        ...prepareVersionedUpdate(lastModifiedBy || userId)
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, checklistItem);
    
    await recordEventFn({
      productionId: checklistItem.production_id,
      eventType: EventType.CHECKLIST_ITEM,
      operation: EventOperation.UPDATE,
      entityId: checklistItem.id,
      entityData: checklistItem,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: checklistItem.version
    });
    
    // Broadcast update via WebSocket
    broadcastEntityUpdate({
      io,
      productionId: checklistItem.production_id,
      entityType: 'checklist-item',
      entityId: checklistItem.id,
      data: toCamelCase(checklistItem)
    });
    
    res.json(toCamelCase(checklistItem));
  } catch (error) {
    console.error('Error updating checklistItem:', error);
    res.status(500).json({ error: 'Failed to update checklistItem' });
  }
});

// Delete checklistItem (hard delete since no is_deleted field)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.checklist_items.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'ChecklistItem not found' });
    }
    
    // Record event before deletion
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.CHECKLIST_ITEM,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Hard delete (no is_deleted field in schema)
    await prisma.checklist_items.delete({
      where: { id }
    });
    
    // Broadcast deletion via WebSocket
    broadcastEntityDeleted({
      io,
      productionId: current.production_id,
      entityType: 'checklist-item',
      entityId: id
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting checklistItem:', error);
    res.status(500).json({ error: 'Failed to delete checklistItem' });
  }
});

export default router;
