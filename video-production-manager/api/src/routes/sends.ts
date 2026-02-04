import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { broadcastEntityUpdate, broadcastEntityCreated, prepareVersionedUpdate } from '../utils/sync-helpers';
import { validateProductionExists } from '../utils/validation-helpers';

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
    res.json(toCamelCase(sends));
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

    if (!send || send.is_deleted) {
      return res.status(404).json({ error: 'Send not found' });
    }

    res.json(toCamelCase(send));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch send' });
  }
});

// POST create send
router.post('/', async (req: Request, res: Response) => {
  try {
    const { productionId, userId, userName, lastModifiedBy, ...sendData } = req.body;
    
    // VALIDATION: Verify production exists in database
    try {
      await validateProductionExists(productionId);
    } catch (validationError: any) {
      console.error('❌ Production validation failed:', validationError.message);
      return res.status(400).json({ 
        error: validationError.message,
        code: 'PRODUCTION_NOT_FOUND',
        productionId 
      });
    }
    
    const snakeCaseData = toSnakeCase(sendData);
    
    const send = await prisma.sends.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        last_modified_by: lastModifiedBy || userId || null,
        updated_at: new Date(),
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

    // Broadcast creation via WebSocket
    broadcastEntityCreated({
      io,
      productionId,
      entityType: 'send',
      entityId: send.id,
      data: toCamelCase(send)
    });

    res.status(201).json(toCamelCase(send));
  } catch (error: any) {
    console.error('Failed to create send:', error);
    res.status(500).json({ error: 'Failed to create send' });
  }
});

// PUT update send
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName, version: clientVersion, lastModifiedBy, ...updateData } = req.body;
    
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

    // Update send with version increment and metadata
    const send = await prisma.sends.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        updated_at: new Date(),
        ...prepareVersionedUpdate(lastModifiedBy || userId)
      }
    });

    // Record UPDATE event
    await recordEvent({
      productionId: currentSend.productionId,
      eventType: EventType.SEND,
      operation: EventOperation.UPDATE,
      entityId: send.id,
      entityData: send,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: send.version
    });

    // Broadcast update via WebSocket
    broadcastEntityUpdate({
      io,
      productionId: currentSend.productionId,
      entityType: 'send',
      entityId: send.id,
      data: toCamelCase(send)
    });

    res.json(toCamelCase(send));    // Broadcast event to production room
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

    if (!currentSend || currentSend.is_deleted) {
      return res.status(404).json({ error: 'Send not found' });
    }

    // Soft delete send
    await prisma.sends.update({
      where: { id: req.params.id },
      data: { is_deleted: true, version: { increment: 1 } }
    });

    // Record DELETE event
    await recordEvent({
      productionId: currentSend.productionId,
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
