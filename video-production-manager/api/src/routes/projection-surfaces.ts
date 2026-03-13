import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { validateProductionExists } from '../utils/validation-helpers';

const router = Router();

// GET all projection surfaces for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    const surfaces = await prisma.projection_surfaces.findMany({
      where: { production_id: productionId, is_deleted: false },
      orderBy: { created_at: 'asc' },
    });
    res.json(toCamelCase(surfaces));
  } catch (error) {
    console.error('Error fetching projection-surfaces:', error);
    res.status(500).json({ error: 'Failed to fetch projection-surfaces' });
  }
});

// GET single projection surface
router.get('/:uuid', async (req: Request, res: Response) => {
  try {
    const surface = await prisma.projection_surfaces.findUnique({
      where: { uuid: req.params.uuid },
    });
    if (!surface || surface.is_deleted) {
      return res.status(404).json({ error: 'Projection surface not found' });
    }
    res.json(toCamelCase(surface));
  } catch (error) {
    console.error('Error fetching projection-surface:', error);
    res.status(500).json({ error: 'Failed to fetch projection-surface' });
  }
});

// POST create projection surface
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...surfaceData } = req.body;

    try {
      await validateProductionExists(productionId);
    } catch (validationError: any) {
      return res.status(400).json({
        error: validationError.message,
        code: 'PRODUCTION_NOT_FOUND',
        productionId,
      });
    }

    const snakeCaseData = toSnakeCase(surfaceData);

    const surface = await prisma.projection_surfaces.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        version: 1,
        updated_at: new Date(),
      },
    });

    await recordEvent({
      productionId: surface.production_id,
      eventType: EventType.PROJECTION_SURFACE,
      operation: EventOperation.CREATE,
      entityId: surface.id,
      entityData: surface,
      userId: userId || 'system',
      userName: userName || 'System',
      version: surface.version,
    });

    io.to(`production:${surface.production_id}`).emit('entity:created', {
      entityType: 'projectionSurface',
      entity: toCamelCase(surface),
      userId,
      userName,
    });

    res.status(201).json(toCamelCase(surface));
  } catch (error) {
    console.error('Error creating projection-surface:', error);
    res.status(500).json({ error: 'Failed to create projection-surface' });
  }
});

// PUT update projection surface
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    const snakeCaseUpdates = toSnakeCase(updates);

    const current = await prisma.projection_surfaces.findUnique({ where: { uuid } });

    if (!current) {
      return res.status(404).json({ error: 'Projection surface not found' });
    }

    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This surface has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion,
      });
    }

    const surface = await prisma.projection_surfaces.update({
      where: { uuid },
      data: {
        ...snakeCaseUpdates,
        updated_at: new Date(),
        version: current.version + 1,
      },
    });

    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, surface);

    await recordEventFn({
      productionId: surface.production_id,
      eventType: EventType.PROJECTION_SURFACE,
      operation: EventOperation.UPDATE,
      entityId: surface.id,
      entityData: surface,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: surface.version,
    });

    io.to(`production:${surface.production_id}`).emit('entity:updated', {
      entityType: 'projectionSurface',
      entity: toCamelCase(surface),
      userId,
      userName,
    });

    res.json(toCamelCase(surface));
  } catch (error) {
    console.error('Error updating projection-surface:', error);
    res.status(500).json({ error: 'Failed to update projection-surface' });
  }
});

// DELETE projection surface (soft delete)
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { userId, userName } = req.body;

    const current = await prisma.projection_surfaces.findUnique({ where: { uuid } });

    if (!current) {
      return res.status(404).json({ error: 'Projection surface not found' });
    }

    await prisma.projection_surfaces.update({
      where: { uuid },
      data: { is_deleted: true },
    });

    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.PROJECTION_SURFACE,
      operation: EventOperation.DELETE,
      entityId: uuid,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version,
    });

    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'projectionSurface',
      entityId: uuid,
      userId,
      userName,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting projection-surface:', error);
    res.status(500).json({ error: 'Failed to delete projection-surface' });
  }
});

export default router;
