import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all vision-switchers for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const visionSwitchers = await prisma.vision_switchers.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(visionSwitchers));
  } catch (error) {
    console.error('Error fetching vision-switchers:', error);
    res.status(500).json({ error: 'Failed to fetch vision-switchers' });
  }
});

// Create visionSwitcher
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...visionSwitcherData } = req.body;
    const snakeCaseData = toSnakeCase(visionSwitcherData);
    
    const visionSwitcher = await prisma.vision_switchers.create({
      data: {
        ...snakeCaseData,
        productionId,
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: visionSwitcher.production_id,
      eventType: EventType.VIDEO_SWITCHER,
      operation: EventOperation.CREATE,
      entityId: visionSwitcher.id,
      entityData: visionSwitcher,
      userId: userId || 'system',
      userName: userName || 'System',
      version: visionSwitcher.version
    });
    
    // Broadcast to production room
    io.to(`production:${visionSwitcher.production_id}`).emit('entity:created', {
      entityType: 'visionSwitcher',
      entity: toCamelCase(visionSwitcher),
      userId,
      userName
    });
    
    res.status(201).json(toCamelCase(visionSwitcher));
  } catch (error) {
    console.error('Error creating visionSwitcher:', error);
    res.status(500).json({ error: 'Failed to create visionSwitcher' });
  }
});

// Update visionSwitcher
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.vision_switchers.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'VisionSwitcher not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This visionSwitcher has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const visionSwitcher = await prisma.vision_switchers.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, visionSwitcher);
    
    await recordEventFn({
      productionId: visionSwitcher.production_id,
      eventType: EventType.VIDEO_SWITCHER,
      operation: EventOperation.UPDATE,
      entityId: visionSwitcher.id,
      entityData: visionSwitcher,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: visionSwitcher.version
    });
    
    // Broadcast to production room
    io.to(`production:${visionSwitcher.production_id}`).emit('entity:updated', {
      entityType: 'visionSwitcher',
      entity: visionSwitcher,
      userId,
      userName
    });
    
    res.json(visionSwitcher);
  } catch (error) {
    console.error('Error updating visionSwitcher:', error);
    res.status(500).json({ error: 'Failed to update visionSwitcher' });
  }
});

// Delete visionSwitcher (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.vision_switchers.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'VisionSwitcher not found' });
    }
    
    // Soft delete
    await prisma.vision_switchers.update({
      where: { id },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.VIDEO_SWITCHER,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'visionSwitcher',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting visionSwitcher:', error);
    res.status(500).json({ error: 'Failed to delete visionSwitcher' });
  }
});

export default router;
