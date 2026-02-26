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
    
    console.log('📋 Fetched checklist items from DB:', checklistItems.length);
    if (checklistItems.length > 0) {
      console.log('📋 Sample item from DB:', {
        uuid: checklistItems[0].uuid,
        more_info: checklistItems[0].more_info,
        more_info_type: Array.isArray(checklistItems[0].more_info) ? 'array' : typeof checklistItems[0].more_info,
        completion_note: checklistItems[0].completion_note,
        completion_note_type: Array.isArray(checklistItems[0].completion_note) ? 'array' : typeof checklistItems[0].completion_note
      });
    }
    
    const camelCaseItems = toCamelCase(checklistItems);
    
    if (camelCaseItems.length > 0) {
      console.log('📋 Sample item after toCamelCase:', {
        uuid: camelCaseItems[0].uuid,
        moreInfo: camelCaseItems[0].moreInfo,
        moreInfoType: Array.isArray(camelCaseItems[0].moreInfo) ? 'array' : typeof camelCaseItems[0].moreInfo,
        completionNote: camelCaseItems[0].completionNote,
        completionNoteType: Array.isArray(camelCaseItems[0].completionNote) ? 'array' : typeof camelCaseItems[0].completionNote
      });
    }
    
    res.json(camelCaseItems);
  } catch (error) {
    console.error('Error fetching checklist-items:', error);
    res.status(500).json({ error: 'Failed to fetch checklist-items' });
  }
});

// Create checklistItem
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, lastModifiedBy, ...checklistItemData } = req.body;
    
    // DEBUG: Log what we received BEFORE any transformation
    console.log('📥 RAW request body:', {
      rawBody: JSON.stringify(req.body, null, 2).substring(0, 500),
      daysBeforeShow: checklistItemData.daysBeforeShow,
      days_before_show: checklistItemData.days_before_show,
      allKeys: Object.keys(checklistItemData)
    });
    
    // Convert camelCase to snake_case and prepare data for Prisma
    const snakeCaseData = toSnakeCase(checklistItemData);
    
    // DEBUG: Log what we received and what we're sending to database
    console.log('📥 After transform:', {
      days_before_show: snakeCaseData.days_before_show,
      allSnakeKeys: Object.keys(snakeCaseData).filter(k => k.includes('_'))
    });
    
    // Ensure updated_at is a valid DateTime
    const createData = {
      ...snakeCaseData,
      last_modified_by: lastModifiedBy || userId || null,
      updated_at: new Date()
    };
    
    const checklistItem = await prisma.checklist_items.create({
      data: createData
    });
    
    // DEBUG: Log what came back from database
    console.log('📤 FROM DATABASE:', {
      days_before_show: checklistItem.days_before_show,
      allDbKeys: Object.keys(checklistItem)
    });
    
    // DEBUG: Log what we'll broadcast
    const camelCaseItem = toCamelCase(checklistItem);
    console.log('📡 WILL BROADCAST:', {
      daysBeforeShow: camelCaseItem.daysBeforeShow,
      allCamelKeys: Object.keys(camelCaseItem)
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
router.put('/:uuid', async (req: Request, res: Response) => {
  let snakeCaseUpdates: any;
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, lastModifiedBy, ...updates } = req.body;
    
    // Convert camelCase to snake_case and remove updated_at if present (we'll set it ourselves)
    const { updated_at, ...updateFields } = toSnakeCase(updates);
    snakeCaseUpdates = updateFields;
    
    console.log('🔧 [API] Updating checklist item:', uuid, 'with fields:', Object.keys(snakeCaseUpdates));
    console.log('🔧 [API] Raw updates received:', JSON.stringify(updates, null, 2));
    console.log('🔧 [API] Snake case updates:', JSON.stringify(snakeCaseUpdates, null, 2));
    
    // Get current version for conflict detection
    const current = await prisma.checklist_items.findUnique({
      where: { uuid }
    });
    
    if (!current) {
      console.error('❌ ChecklistItem not found:', uuid);
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
    // If completing, set completed_at timestamp; if uncompleting, clear it
    const updateData: any = {
      ...snakeCaseUpdates,
      version: { increment: 1 },
      last_modified_by: lastModifiedBy || userId || null,
      updated_at: new Date()
    };
    
    // Server-side timestamp management for completion
    // completed_at is BigInt (Unix timestamp in milliseconds), not DateTime
    if ('completed' in snakeCaseUpdates) {
      updateData.completed_at = snakeCaseUpdates.completed ? BigInt(Date.now()) : null;
    }
    
    const checklistItem = await prisma.checklist_items.update({
      where: { uuid },
      data: updateData
    });
    
    console.log('✅ [API] ChecklistItem updated in DB:', {
      uuid: checklistItem.uuid,
      more_info: checklistItem.more_info,
      more_info_type: Array.isArray(checklistItem.more_info) ? `array[${checklistItem.more_info.length}]` : typeof checklistItem.more_info,
      completion_note: checklistItem.completion_note,
      completion_note_type: Array.isArray(checklistItem.completion_note) ? `array[${checklistItem.completion_note.length}]` : typeof checklistItem.completion_note
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
    
    const responseData = toCamelCase(checklistItem);
    console.log('📤 [API] Sending response:', {
      uuid: responseData.uuid,
      moreInfo: responseData.moreInfo,
      moreInfoType: Array.isArray(responseData.moreInfo) ? `array[${responseData.moreInfo.length}]` : typeof responseData.moreInfo,
      completionNote: responseData.completionNote,
      completionNoteType: Array.isArray(responseData.completionNote) ? `array[${responseData.completionNote.length}]` : typeof responseData.completionNote
    });
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error updating checklistItem:', error);
    console.error('📋 Request ID:', req.params.uuid);
    console.error('📋 Request body:', JSON.stringify(req.body, null, 2));
    if (snakeCaseUpdates) {
      console.error('📋 Snake case updates:', JSON.stringify(snakeCaseUpdates, null, 2));
    }
    res.status(500).json({ 
      error: 'Failed to update checklistItem', 
      details: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
});

// Delete checklistItem (hard delete since no is_deleted field)
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.checklist_items.findUnique({ where: { uuid } });
    
    if (!current) {
      return res.status(404).json({ error: 'ChecklistItem not found' });
    }
    
    // Record event before deletion
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.CHECKLIST_ITEM,
      operation: EventOperation.DELETE,
      entityId: uuid,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Hard delete (no is_deleted field in schema)
    await prisma.checklist_items.delete({
      where: { uuid }
    });
    
    // Broadcast deletion via WebSocket
    broadcastEntityDeleted({
      io,
      productionId: current.production_id,
      entityType: 'checklist-item',
      entityId: uuid
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting checklistItem:', error);
    res.status(500).json({ error: 'Failed to delete checklistItem' });
  }
});

export default router;
