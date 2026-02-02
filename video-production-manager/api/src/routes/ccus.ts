import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { broadcastEntityUpdate, broadcastEntityCreated, prepareVersionedUpdate } from '../utils/sync-helpers';

const router = Router();

// GET all CCUs for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const ccus = await prisma.ccus.findMany({
      where: {
        production_id: req.params.productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    res.json(toCamelCase(ccus));
  } catch (error: any) {
    console.error('Failed to fetch CCUs:', error);
    res.status(500).json({ error: 'Failed to fetch CCUs' });
  }
});

// GET single CCU
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ccu = await prisma.ccus.findUnique({
      where: { id: req.params.id }
    });

    if (!ccu || ccu.is_deleted) {
      return res.status(404).json({ error: 'CCU not found' });
    }

    res.json(toCamelCase(ccu));
  } catch (error: any) {
    console.error('Failed to fetch CCU:', error);
    res.status(500).json({ error: 'Failed to fetch CCU' });
  }
});

// POST create CCU
router.post('/', async (req: Request, res: Response) => {
  try {
    const { productionId, userId, userName, lastModifiedBy, ...ccuData } = req.body;
    
    const ccu = await prisma.ccus.create({
      data: {
        ...ccuData,
        production_id: productionId,
        last_modified_by: lastModifiedBy || userId || null,
        version: 1
      }
    });

    // Record CREATE event
    await recordEvent({
      productionId,
      eventType: EventType.CCU,
      operation: EventOperation.CREATE,
      entityId: ccu.id,
      entityData: ccu,
      changes: null,
      userId: userId || 'system',
      userName: userName || 'System',
      version: ccu.version
    });

    // Broadcast creation via WebSocket
    broadcastEntityCreated({
      io,
      productionId,
      entityType: 'ccu',
      entityId: ccu.id,
      data: toCamelCase(ccu)
    });

    res.status(201).json(toCamelCase(ccu));
  } catch (error: any) {
    console.error('Failed to create CCU:', error);
    res.status(500).json({ error: 'Failed to create CCU' });
  }
});

// PUT update CCU
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName, version: clientVersion, lastModifiedBy, ...updateData } = req.body;
    
    // Fetch current CCU state
    const currentCCU = await prisma.ccus.findUnique({
      where: { id: req.params.id }
    });

    if (!currentCCU || currentCCU.is_deleted) {
      return res.status(404).json({ error: 'CCU not found' });
    }

    // Check for conflicts if client provides version
    if (clientVersion !== undefined && currentCCU.version !== clientVersion) {
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'This CCU was modified by another user',
        currentVersion: currentCCU.version,
        clientVersion
      });
    }

    // Calculate changes
    const changes = calculateDiff(currentCCU, updateData);

    // Update CCU with version increment and metadata
    const ccu = await prisma.ccus.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...prepareVersionedUpdate(lastModifiedBy || userId)
      }
    });

    // Record UPDATE event
    await recordEvent({
      productionId: currentCCU.production_id,
      eventType: EventType.CCU,
      operation: EventOperation.UPDATE,
      entityId: ccu.id,
      entityData: ccu,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: ccu.version
    });

    // Broadcast update via WebSocket
    broadcastEntityUpdate({
      io,
      productionId: currentCCU.production_id,
      entityType: 'ccu',
      entityId: ccu.id,
      data: toCamelCase(ccu)
    });

    res.json(toCamelCase(ccu));
  } catch (error: any) {
    console.error('Failed to update CCU:', error);
    res.status(500).json({ error: 'Failed to update CCU' });
  }
});

// DELETE CCU
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body;

    // Fetch current CCU
    const currentCCU = await prisma.ccus.findUnique({
      where: { id: req.params.id }
    });

    if (!currentCCU || currentCCU.is_deleted) {
      return res.status(404).json({ error: 'CCU not found' });
    }

    // Soft delete CCU
    await prisma.ccus.update({
      where: { id: req.params.id },
      data: { is_deleted: true, version: { increment: 1 } }
    });

    // Record DELETE event
    await recordEvent({
      productionId: currentCCU.production_id,
      eventType: EventType.CCU,
      operation: EventOperation.DELETE,
      entityId: req.params.id,
      entityData: currentCCU,
      changes: null,
      userId: userId || 'system',
      userName: userName || 'System',
      version: currentCCU.version + 1
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete CCU:', error);
    res.status(500).json({ error: 'Failed to delete CCU' });
  }
});

export default router;
