import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { prepareVersionedUpdate } from '../utils/sync-helpers';
import { validateProductionExists } from '../utils/validation-helpers';
import { 
  CAMERA_VERSIONED_FIELDS,
  initFieldVersionsForEntity,
  compareFieldVersionsForEntity,
  mergeNonConflictingFieldsForEntity,
  isValidFieldVersions,
  FieldVersions
} from '../utils/fieldVersioning';

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
    res.json(toCamelCase(cameras));
  } catch (error: any) {
    console.error('Failed to fetch cameras:', error);
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

// GET single camera
router.get('/:uuid', async (req: Request, res: Response) => {
  try {
    const camera = await prisma.cameras.findUnique({
      where: { uuid: req.params.uuid }
    });

    if (!camera || camera.is_deleted) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json(toCamelCase(camera));
  } catch (error: any) {
    console.error('Failed to fetch camera:', error);
    res.status(500).json({ error: 'Failed to fetch camera' });
  }
});

// POST create camera
router.post('/', async (req: Request, res: Response) => {
  try {
    const { productionId, userId, userName, lastModifiedBy, ...cameraData } = req.body;
    
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
    
    // Convert camelCase to snake_case for database
    const snakeCaseData = toSnakeCase(cameraData);
    
    // Convert empty strings to null for optional fields
    Object.keys(snakeCaseData).forEach(key => {
      if (snakeCaseData[key] === '') {
        snakeCaseData[key] = null;
      }
    });
    
    const camera = await prisma.cameras.create({
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
      eventType: EventType.CAMERA,
      operation: EventOperation.CREATE,
      entityId: camera.id,
      entityData: camera,
      changes: null,
      userId: userId || 'system',
      userName: userName || 'System',
      version: camera.version
    });

    // Broadcast creation via WebSocket
    io.to(`production:${productionId}`).emit('entity:created', {
      entityType: 'camera',
      entity: toCamelCase(camera),
      userId: userId || 'system',
      userName: userName || 'System'
    });

    res.status(201).json(toCamelCase(camera));
  } catch (error: any) {
    console.error('Failed to create camera:', error);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({ error: 'Failed to create camera', details: error.message });
  }
});

// PUT update camera
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { userId, userName, version: clientVersion, lastModifiedBy, fieldVersions: clientFieldVersions, ...updateData } = req.body;
    
    // Fetch current camera state
    const currentCamera = await prisma.cameras.findUnique({
      where: { uuid: req.params.uuid }
    });

    if (!currentCamera || currentCamera.is_deleted) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Parse server field versions
    const serverFieldVersions: FieldVersions = 
      (currentCamera.field_versions && isValidFieldVersions(currentCamera.field_versions))
        ? currentCamera.field_versions as FieldVersions
        : initFieldVersionsForEntity(CAMERA_VERSIONED_FIELDS);

    // If client provides field versions, use field-level conflict detection
    let finalUpdateData = updateData;
    let finalFieldVersions = serverFieldVersions;

    if (clientFieldVersions && isValidFieldVersions(clientFieldVersions)) {
      // Check for field-level conflicts
      const conflicts = compareFieldVersionsForEntity(
        clientFieldVersions,
        serverFieldVersions,
        updateData,
        currentCamera,
        CAMERA_VERSIONED_FIELDS
      );

      if (conflicts.length > 0) {
        // Try to merge non-conflicting fields
        const mergeResult = mergeNonConflictingFieldsForEntity(
          clientFieldVersions,
          serverFieldVersions,
          updateData,
          currentCamera,
          CAMERA_VERSIONED_FIELDS
        );

        return res.status(409).json({
          error: 'Conflict detected',
          message: 'Some fields were modified by another user',
          conflicts: mergeResult.conflicts,
          mergedData: toCamelCase(mergeResult.mergedData),
          mergedFieldVersions: mergeResult.mergedVersions,
          serverData: toCamelCase(currentCamera),
          serverFieldVersions
        });
      }

      // No conflicts - update field versions for changed fields
      finalFieldVersions = { ...serverFieldVersions };
      for (const fieldName in updateData) {
        if (CAMERA_VERSIONED_FIELDS.includes(fieldName as any)) {
          finalFieldVersions[fieldName] = {
            version: (serverFieldVersions[fieldName]?.version || 0) + 1,
            updated_at: new Date().toISOString()
          };
        }
      }
    } else {
      // Fallback to entity-level version check
      if (clientVersion !== undefined && currentCamera.version !== clientVersion) {
        return res.status(409).json({
          error: 'Conflict detected',
          message: 'This camera was modified by another user',
          currentVersion: currentCamera.version,
          clientVersion
        });
      }
    }

    // Calculate changes
    const changes = calculateDiff(currentCamera, finalUpdateData);

    // Convert final update data to snake_case for database
    const finalSnakeCaseData = toSnakeCase(finalUpdateData);

    // Update camera with version increment and metadata
    const camera = await prisma.cameras.update({
      where: { uuid: req.params.uuid },
      data: {
        ...finalSnakeCaseData,
        field_versions: finalFieldVersions,
        updated_at: new Date(),
        ...prepareVersionedUpdate(lastModifiedBy || userId)
      }
    });

    // Record UPDATE event
    await recordEvent({
      productionId: currentCamera.production_id,
      eventType: EventType.CAMERA,
      operation: EventOperation.UPDATE,
      entityId: camera.id,
      entityData: camera,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: camera.version
    });

    // Broadcast update via WebSocket
    io.to(`production:${currentCamera.production_id}`).emit('entity:updated', {
      entityType: 'camera',
      entity: toCamelCase(camera),
      changes,
      userId: userId || 'system',
      userName: userName || 'System'
    });

    res.json(toCamelCase(camera));
  } catch (error: any) {
    console.error('Failed to update camera:', error);
    res.status(500).json({ error: 'Failed to update camera' });
  }
});

// DELETE camera
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body;

    // Fetch current camera
    const currentCamera = await prisma.cameras.findUnique({
      where: { uuid: req.params.uuid }
    });

    if (!currentCamera || currentCamera.is_deleted) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Soft delete camera
    await prisma.cameras.update({
      where: { uuid: req.params.uuid },
      data: { is_deleted: true, version: { increment: 1 } }
    });

    // Record DELETE event
    await recordEvent({
      productionId: currentCamera.production_id,
      eventType: EventType.CAMERA,
      operation: EventOperation.DELETE,
      entityId: req.params.uuid,
      entityData: currentCamera,
      changes: null,
      userId: userId || 'system',
      userName: userName || 'System',
      version: currentCamera.version + 1
    });

    // Broadcast deletion via WebSocket
    io.to(`production:${currentCamera.production_id}`).emit('entity:deleted', {
      entityType: 'camera',
      entityId: req.params.uuid,
      userId: userId || 'system',
      userName: userName || 'System'
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete camera:', error);
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

export default router;
