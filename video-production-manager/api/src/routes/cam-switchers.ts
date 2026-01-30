import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// Get all cam-switchers for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const cam-switchers = await prisma.camSwitcher.findMany({
      where: {
        productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(cam-switchers);
  } catch (error) {
    console.error('Error fetching cam-switchers:', error);
    res.status(500).json({ error: 'Failed to fetch cam-switchers' });
  }
});

// Create camSwitcher
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...camSwitcher_data } = req.body;
    
    const camSwitcher = await prisma.camSwitcher.create({
      data: camSwitcher_data
    });
    
    // Record event
    await recordEvent({
      productionId: camSwitcher.productionId,
      eventType: EventType.CAM_SWITCHER,
      operation: EventOperation.CREATE,
      entityId: camSwitcher.id,
      entityData: camSwitcher,
      userId: userId || 'system',
      userName: userName || 'System',
      version: camSwitcher.version
    });
    
    // Broadcast to production room
    io.to(`production:${camSwitcher.productionId}`).emit('entity:created', {
      entityType: 'camSwitcher',
      entity: camSwitcher,
      userId,
      userName
    });
    
    res.status(201).json(camSwitcher);
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
    
    // Get current version for conflict detection
    const current = await prisma.camSwitcher.findUnique({
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
    const camSwitcher = await prisma.camSwitcher.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, camSwitcher);
    
    await recordEventFn({
      productionId: camSwitcher.productionId,
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
    io.to(`production:${camSwitcher.productionId}`).emit('entity:updated', {
      entityType: 'camSwitcher',
      entity: camSwitcher,
      userId,
      userName
    });
    
    res.json(camSwitcher);
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
    
    const current = await prisma.camSwitcher.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'CamSwitcher not found' });
    }
    
    // Soft delete
    await prisma.camSwitcher.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.productionId,
      eventType: EventType.CAM_SWITCHER,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
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
