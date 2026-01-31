import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// GET all cameras for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const cameras = await prisma.cameras.findMany({
      where: {
        production_id: req.params.productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    res.json(cameras);
  } catch (error: any) {
    console.error('Failed to fetch cameras:', error);
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

// GET single camera
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const camera = await prisma.cameras.findUnique({
      where: { id: req.params.id }
    });

    if (!camera || camera.isDeleted) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json(camera);
  } catch (error: any) {
    console.error('Failed to fetch camera:', error);
    res.status(500).json({ error: 'Failed to fetch camera' });
  }
});

// POST create camera
router.post('/', async (req: Request, res: Response) => {
  try {
    const { productionId, userId, userName, ...cameraData } = req.body;
    
    const camera = await prisma.cameras.create({
      data: {
        ...cameraData,
        productionId,
        version: 1
      }
    });

    // Record CREATE event
    await recordEvent({
      productionId,
      eventType: EventType.CAMERA,
      operation: EventOperation.CREATE,
      entityId: camera.id,
      entityData: camera,
      changes: null,
      userId: userId || 'system',
      userName: userName || 'System',
      version: camera.version
    });

    // Broadcast event to production room
    io.to(`production:${productionId}`).emit('entity:created', {
      entityType: 'camera',
      entity: camera,
      userId,
      userName
    });

    res.status(201).json(camera);
  } catch (error: any) {
    console.error('Failed to create camera:', error);
    res.status(500).json({ error: 'Failed to create camera' });
  }
});

// PUT update camera
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName, version: clientVersion, ...updateData } = req.body;
    
    // Fetch current camera state
    const currentCamera = await prisma.cameras.findUnique({
      where: { id: req.params.id }
    });

    if (!currentCamera || currentCamera.isDeleted) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Check for conflicts if client provides version
    if (clientVersion !== undefined && currentCamera.version !== clientVersion) {
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'This camera was modified by another user',
        currentVersion: currentCamera.version,
        clientVersion
      });
    }

    // Calculate changes
    const changes = calculateDiff(currentCamera, updateData);

    // Update camera
    const camera = await prisma.cameras.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        version: { increment: 1 }
      }
    });

    // Record UPDATE event
    await recordEvent({
      production_id: currentCamera.productionId,
      eventType: EventType.CAMERA,
      operation: EventOperation.UPDATE,
      entityId: camera.id,
      entityData: camera,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: camera.version
    });

    res.json(camera);
  } catch (error: any) {
    console.error('Failed to update camera:', error);
    res.status(500).json({ error: 'Failed to update camera' });
  }
});

// DELETE camera
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body;

    // Fetch current camera
    const currentCamera = await prisma.cameras.findUnique({
      where: { id: req.params.id }
    });

    if (!currentCamera || currentCamera.isDeleted) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Soft delete camera
    await prisma.cameras.update({
      where: { id: req.params.id },
      data: { is_deleted: true, version: { increment: 1 } }
    });

    // Record DELETE event
    await recordEvent({
      production_id: currentCamera.productionId,
      eventType: EventType.CAMERA,
      operation: EventOperation.DELETE,
      entityId: req.params.id,
      entityData: currentCamera,
      changes: null,
      userId: userId || 'system',
      userName: userName || 'System',
      version: currentCamera.version + 1
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete camera:', error);
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

export default router;
