import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all cam-switchers for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const camSwitchers = await prisma.cam_switchers.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(camSwitchers));
  } catch (error) {
    console.error('Error fetching cam-switchers:', error);
    res.status(500).json({ error: 'Failed to fetch cam-switchers' });
  }
});

// Create camSwitcher
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...camSwitcherData } = req.body;
    const snakeCaseData = toSnakeCase(camSwitcherData);
    
    const camSwitcher = await prisma.cam_switchers.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: camSwitcher.production_id,
      eventType: EventType.CAM_SWITCHER,
      operation: EventOperation.CREATE,
      entityId: camSwitcher.id,
      entityData: camSwitcher,
      userId: userId || 'system',
      userName: userName || 'System',
      version: camSwitcher.version
    });
    
    // Broadcast to production room
    io.to(`production:${camSwitcher.production_id}`).emit('entity:created', {
      entityType: 'camSwitcher',
      entity: toCamelCase(camSwitcher),
      userId,
      userName
    });
    
    res.status(201).json(toCamelCase(camSwitcher));
  } catch (error) {
    console.error('Error creating camSwitcher:', error);
    res.status(500).json({ error: 'Failed to create camSwitcher' });
  }
});

// Update camSwitcher
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    const snakeCaseUpdates = toSnakeCase(updates);
    
    // Get current version for conflict detection
    const current = await prisma.cam_switchers.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'CamSwitcher not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This camSwitcher has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const camSwitcher = await prisma.cam_switchers.update({
      where: { id },
      data: {
        ...snakeCaseUpdates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, camSwitcher);
    
    await recordEventFn({
      productionId: camSwitcher.production_id,
      eventType: EventType.CAM_SWITCHER,
      operation: EventOperation.UPDATE,
      entityId: camSwitcher.id,
      entityData: camSwitcher,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: camSwitcher.version
    });
    
    // Broadcast to production room
    io.to(`production:${camSwitcher.production_id}`).emit('entity:updated', {
      entityType: 'camSwitcher',
      entity: toCamelCase(camSwitcher),
      userId,
      userName
    });
    
    res.json(toCamelCase(camSwitcher));
  } catch (error) {
    console.error('Error updating camSwitcher:', error);
    res.status(500).json({ error: 'Failed to update camSwitcher' });
  }
});

// Delete camSwitcher (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.cam_switchers.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'CamSwitcher not found' });
    }
    
    // Soft delete
    await prisma.cam_switchers.update({
      where: { id },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.CAM_SWITCHER,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'camSwitcher',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting camSwitcher:', error);
    res.status(500).json({ error: 'Failed to delete camSwitcher' });
  }
});

export default router;
