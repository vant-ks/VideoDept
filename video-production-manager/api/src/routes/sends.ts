import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// GET all sends for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const sends = await prisma.sends.findMany({
      where: {
        production_id: req.params.productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    res.json(sends);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch sends' });
  }
});

// GET single send
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const send = await prisma.sends.findUnique({
      where: { id: req.params.id }
    });

    if (!send || send.isDeleted) {
      return res.status(404).json({ error: 'Send not found' });
    }

    res.json(send);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch send' });
  }
});

// POST create send
router.post('/', async (req: Request, res: Response) => {
  try {
    const { productionId, userId, userName, ...sendData } = req.body;
    
    const send = await prisma.sends.create({
      data: {
        ...sendData,
        productionId,
        version: 1
      }
    });

    // Record CREATE event
    await recordEvent({
      productionId,
      eventType: EventType.SEND,
      operation: EventOperation.CREATE,
      entityId: send.id,
      entityData: send,
      changes: null,
      userId: userId || 'system',
      userName: userName || 'System',
      version: send.version
    });

    // Broadcast event to production room
    io.to(`production:${productionId}`).emit('entity:created', {
      entityType: 'send',
      entity: send,
      userId,
      userName
    });

    res.status(201).json(send);
  } catch (error: any) {
    console.error('Failed to create send:', error);
    res.status(500).json({ error: 'Failed to create send' });
  }
});

// PUT update send
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName, version: clientVersion, ...updateData } = req.body;
    
    // Fetch current send state
    const currentSend = await prisma.sends.findUnique({
      where: { id: req.params.id }
    });

    if (!currentSend || currentSend.isDeleted) {
      return res.status(404).json({ error: 'Send not found' });
    }

    // Check for conflicts if client provides version
    if (clientVersion !== undefined && currentSend.version !== clientVersion) {
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'This send was modified by another user',
        currentVersion: currentSend.version,
        clientVersion
      });
    }

    // Calculate changes
    const changes = calculateDiff(currentSend, updateData);

    // Update send
    const send = await prisma.sends.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        version: { increment: 1 }
      }
    });

    // Record UPDATE event
    await recordEvent({
      production_id: currentSend.productionId,
      eventType: EventType.SEND,
      operation: EventOperation.UPDATE,
      entityId: send.id,
      entityData: send,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: send.version
    });

    // Broadcast event to production room
    io.to(`production:${currentSend.productionId}`).emit('entity:updated', {
      entityType: 'send',
      entity: send,
      changes,
      userId,
      userName
    });

    res.json(send);
  } catch (error: any) {
    console.error('Failed to update send:', error);
    res.status(500).json({ error: 'Failed to update send' });
  }
});

// DELETE send
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body;

    // Fetch current send
    const currentSend = await prisma.sends.findUnique({
      where: { id: req.params.id }
    });

    if (!currentSend || currentSend.isDeleted) {
      return res.status(404).json({ error: 'Send not found' });
    }

    // Soft delete send
    await prisma.sends.update({
      where: { id: req.params.id },
      data: { is_deleted: true, version: { increment: 1 } }
    });

    // Record DELETE event
    await recordEvent({
      production_id: currentSend.productionId,
      eventType: EventType.SEND,
      operation: EventOperation.DELETE,
      entityId: req.params.id,
      entityData: currentSend,
      changes: null,
      userId: userId || 'system',
      userName: userName || 'System',
      version: currentSend.version + 1
    });

    // Broadcast event to production room
    io.to(`production:${currentSend.productionId}`).emit('entity:deleted', {
      entityType: 'send',
      entityId: req.params.id,
      userId,
      userName
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete send:', error);
    res.status(500).json({ error: 'Failed to delete send' });
  }
});

export default router;
