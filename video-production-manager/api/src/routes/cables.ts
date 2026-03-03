import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { validateProductionExists } from '../utils/validation-helpers';

const router = Router();

// ─── GET /api/cables/production/:productionId ────────────────────────────────
// List all non-deleted cables for a production, including port details
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;

    const cables = await prisma.cables.findMany({
      where: { production_id: productionId, is_deleted: false },
      include: {
        output_port: true,
        input_port:  true,
      },
      orderBy: { created_at: 'asc' },
    });

    res.json(toCamelCase(cables));
  } catch (error) {
    console.error('Error fetching cables:', error);
    res.status(500).json({ error: 'Failed to fetch cables' });
  }
});

// ─── GET /api/cables/:uuid ───────────────────────────────────────────────────
router.get('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;

    const cable = await prisma.cables.findUnique({
      where: { uuid },
      include: {
        output_port: true,
        input_port:  true,
      },
    });

    if (!cable || cable.is_deleted) {
      return res.status(404).json({ error: 'Cable not found' });
    }

    res.json(toCamelCase(cable));
  } catch (error) {
    console.error('Error fetching cable:', error);
    res.status(500).json({ error: 'Failed to fetch cable' });
  }
});

// ─── GET /api/cables/port/:portUuid ─────────────────────────────────────────
// Cables where a device_port appears on either end (useful for reveal view)
router.get('/port/:portUuid', async (req: Request, res: Response) => {
  try {
    const { portUuid } = req.params;

    const cables = await prisma.cables.findMany({
      where: {
        is_deleted: false,
        OR: [
          { output_port_uuid: portUuid },
          { input_port_uuid:  portUuid },
        ],
      },
      include: {
        output_port: true,
        input_port:  true,
      },
    });

    res.json(toCamelCase(cables));
  } catch (error) {
    console.error('Error fetching port cables:', error);
    res.status(500).json({ error: 'Failed to fetch cables for port' });
  }
});

// ─── POST /api/cables ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, ...cableData } = req.body;

    // Validate production
    try {
      await validateProductionExists(productionId);
    } catch (validationError: any) {
      return res.status(400).json({
        error: validationError.message,
        code: 'PRODUCTION_NOT_FOUND',
        productionId,
      });
    }

    const snakeCaseData = toSnakeCase(cableData);

    // Build display id from port uuids + cable type if not provided
    const displayId =
      (snakeCaseData as any).id ||
      `${(snakeCaseData as any).output_port_uuid?.slice(0, 8)}_${(snakeCaseData as any).cable_type || 'CABLE'}_${(snakeCaseData as any).input_port_uuid?.slice(0, 8)}`;

    const cable = await prisma.cables.create({
      data: {
        ...(snakeCaseData as any),
        id:            displayId,
        production_id: productionId,
        updated_at:    new Date(),
        version:       1,
      },
      include: {
        output_port: true,
        input_port:  true,
      },
    });

    // Broadcast
    io.to(`production:${productionId}`).emit('entity:created', {
      entityType: 'cable',
      entity:     toCamelCase(cable),
      userId,
      userName,
    });

    res.status(201).json(toCamelCase(cable));
  } catch (error) {
    console.error('Error creating cable:', error);
    res.status(500).json({ error: 'Failed to create cable' });
  }
});

// ─── PUT /api/cables/:uuid ───────────────────────────────────────────────────
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;

    const current = await prisma.cables.findUnique({ where: { uuid } });

    if (!current || current.is_deleted) {
      return res.status(404).json({ error: 'Cable not found' });
    }

    // Version conflict detection
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This cable has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion,
      });
    }

    const snakeCaseUpdates = toSnakeCase(updates);

    const cable = await prisma.cables.update({
      where: { uuid },
      data: {
        ...(snakeCaseUpdates as any),
        updated_at: new Date(),
        version:    current.version + 1,
      },
      include: {
        output_port: true,
        input_port:  true,
      },
    });

    // Broadcast
    io.to(`production:${cable.production_id}`).emit('entity:updated', {
      entityType: 'cable',
      entity:     toCamelCase(cable),
      userId,
      userName,
    });

    res.json(toCamelCase(cable));
  } catch (error) {
    console.error('Error updating cable:', error);
    res.status(500).json({ error: 'Failed to update cable' });
  }
});

// ─── DELETE /api/cables/:uuid ────────────────────────────────────────────────
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { userId, userName } = req.body;

    const current = await prisma.cables.findUnique({ where: { uuid } });

    if (!current || current.is_deleted) {
      return res.status(404).json({ error: 'Cable not found' });
    }

    const cable = await prisma.cables.update({
      where: { uuid },
      data: {
        is_deleted:  true,
        updated_at:  new Date(),
        version:     current.version + 1,
      },
    });

    // Broadcast
    io.to(`production:${cable.production_id}`).emit('entity:deleted', {
      entityType: 'cable',
      entityId:   uuid,
      userId,
      userName,
    });

    res.json({ success: true, uuid });
  } catch (error) {
    console.error('Error deleting cable:', error);
    res.status(500).json({ error: 'Failed to delete cable' });
  }
});

export default router;
