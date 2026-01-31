import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// Get all led-screens for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const ledScreens = await prisma.ledScreen.findMany({
      where: {
        productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(ledScreens);
  } catch (error) {
    console.error('Error fetching led-screens:', error);
    res.status(500).json({ error: 'Failed to fetch led-screens' });
  }
});

// Create ledScreen
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...ledScreen_data } = req.body;
    
    const ledScreen = await prisma.ledScreen.create({
      data: ledScreen_data
    });
    
    // Record event
    await recordEvent({
      productionId: ledScreen.productionId,
      eventType: EventType.LED_SCREEN,
      operation: EventOperation.CREATE,
      entityId: ledScreen.id,
      entityData: ledScreen,
      userId: userId || 'system',
      userName: userName || 'System',
      version: ledScreen.version
    });
    
    // Broadcast to production room
    io.to(`production:${ledScreen.productionId}`).emit('entity:created', {
      entityType: 'ledScreen',
      entity: ledScreen,
      userId,
      userName
    });
    
    res.status(201).json(ledScreen);
  } catch (error) {
    console.error('Error creating ledScreen:', error);
    res.status(500).json({ error: 'Failed to create ledScreen' });
  }
});

// Update ledScreen
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.ledScreen.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'LEDScreen not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This ledScreen has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const ledScreen = await prisma.ledScreen.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, ledScreen);
    
    await recordEventFn({
      productionId: ledScreen.productionId,
      eventType: EventType.LED_SCREEN,
      operation: EventOperation.UPDATE,
      entityId: ledScreen.id,
      entityData: ledScreen,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: ledScreen.version
    });
    
    // Broadcast to production room
    io.to(`production:${ledScreen.productionId}`).emit('entity:updated', {
      entityType: 'ledScreen',
      entity: ledScreen,
      userId,
      userName
    });
    
    res.json(ledScreen);
  } catch (error) {
    console.error('Error updating ledScreen:', error);
    res.status(500).json({ error: 'Failed to update ledScreen' });
  }
});

// Delete ledScreen (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.ledScreen.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'LEDScreen not found' });
    }
    
    // Soft delete
    await prisma.ledScreen.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.productionId,
      eventType: EventType.LED_SCREEN,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
      entityType: 'ledScreen',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting ledScreen:', error);
    res.status(500).json({ error: 'Failed to delete ledScreen' });
  }
});

export default router;
