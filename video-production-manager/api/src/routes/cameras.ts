import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { broadcastEntityUpdate, broadcastEntityCreated, broadcastEntityDeleted, prepareVersionedUpdate } from '../utils/sync-helpers';
import { validateProductionExists } from '../utils/validation-helpers';
import { 
  CAMERA_VERSIONED_FIELDS,
  compareFieldVersionsForEntity,
  mergeNonConflictingFieldsForEntity,
  initFieldVersionsForEntity,
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const camera = await prisma.cameras.findFirst({
      where: { id: req.params.id, is_deleted: false }
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
    const { productionId, userId, userName, lastModifiedBy, manufacturer, ...cameraData } = req.body;
    
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
    
    // Check if camera with this ID already exists (including soft-deleted)
    const existingCamera = await prisma.cameras.findFirst({
      where: { id: snakeCaseData.id }
    });
    
    if (existingCamera) {
      return res.status(409).json({ 
        error: 'A camera with this ID already exists. Please choose a different ID.',
        code: 'DUPLICATE_ID',
        existingId: snakeCaseData.id,
        isDeleted: existingCamera.is_deleted
      });
    }
    
    // Convert empty string ccuId to null (foreign key constraint)
    if (snakeCaseData.ccu_id === '') {
      snakeCaseData.ccu_id = null;
    }
    
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
    broadcastEntityCreated({
      io,
      productionId,
      entityType: 'camera',
      entityId: camera.id,
      data: toCamelCase(camera)
    });

    res.status(201).json(toCamelCase(camera));
  } catch (error: any) {
    console.error('Failed to create camera:', error);
    res.status(500).json({ error: 'Failed to create camera' });
  }
});

// PUT update camera
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName, version: clientVersion, fieldVersions: clientFieldVersions, lastModifiedBy, productionId, manufacturer, ...updateData } = req.body;
    
    // Fetch current camera state
    const currentCamera = await prisma.cameras.findFirst({
      where: { id: req.params.id, is_deleted: false }
    });

    if (!currentCamera || currentCamera.is_deleted) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // FIELD-LEVEL VERSIONING: Check if client provided field versions
    const serverFieldVersions = (currentCamera.field_versions as unknown) as FieldVersions || {};
    const serverData = toCamelCase(currentCamera);
    
    if (clientFieldVersions && isValidFieldVersions(clientFieldVersions)) {
      console.log('🔍 Field-level conflict detection for camera:', req.params.id);
      
      // Compare field versions to detect conflicts
      const conflicts = compareFieldVersionsForEntity(
        clientFieldVersions,
        serverFieldVersions,
        updateData,
        serverData,
        CAMERA_VERSIONED_FIELDS
      );
      
      if (conflicts.length > 0) {
        console.log('⚠️  Field conflicts detected:', conflicts.map(c => c.fieldName).join(', '));
        
        // Return conflict information
        return res.status(409).json({
          error: 'Field conflict',
          message: 'Some fields were modified by another user',
          conflicts,
          serverData,
          serverFieldVersions,
          currentVersion: currentCamera.version
        });
      }
      
      // Merge non-conflicting updates
      const mergeResult = mergeNonConflictingFieldsForEntity(
        clientFieldVersions,
        serverFieldVersions,
        updateData,
        serverData,
        CAMERA_VERSIONED_FIELDS
      );
      
      console.log('✅ Field-level merge successful for camera');
      
      // Calculate changes
      const changes = calculateDiff(currentCamera, mergeResult.mergedData);

      // Convert camelCase to snake_case for database
      const snakeCaseData = toSnakeCase(mergeResult.mergedData);
      
      // Convert empty string ccuId to null (foreign key constraint)
      if (snakeCaseData.ccu_id === '') {
        snakeCaseData.ccu_id = null;
      }

      // Update camera with field versions
      const camera = await prisma.cameras.update({
        where: { uuid: currentCamera.uuid },
        data: {
          ...snakeCaseData,
          updated_at: new Date(),
          field_versions: mergeResult.mergedVersions as any,
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
      broadcastEntityUpdate({
        io,
        productionId: currentCamera.production_id,
        entityType: 'camera',
        entityId: camera.id,
        data: toCamelCase(camera)
      });

      return res.json(toCamelCase(camera));
    }
    
    // FALLBACK: Record-level versioning (for backward compatibility)
    console.log('🔄 Using record-level versioning for camera (legacy)');
    
    // Check for conflicts if client provides version
    if (clientVersion !== undefined && currentCamera.version !== clientVersion) {
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'This camera was modified by another user',
        currentVersion: currentCamera.version,
        clientVersion,
        serverData
      });
    }

    // Calculate changes
    const changes = calculateDiff(currentCamera, updateData);

    // Convert camelCase to snake_case for database
    const snakeCaseData = toSnakeCase(updateData);
    
    // Convert empty string ccuId to null (foreign key constraint)
    if (snakeCaseData.ccu_id === '') {
      snakeCaseData.ccu_id = null;
    }

    // Update camera with version increment and metadata
    const camera = await prisma.cameras.update({
      where: { uuid: currentCamera.uuid },
      data: {
        ...snakeCaseData,
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
    broadcastEntityUpdate({
      io,
      productionId: currentCamera.production_id,
      entityType: 'camera',
      entityId: camera.id,
      data: toCamelCase(camera)
    });

    res.json(toCamelCase(camera));
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
    const currentCamera = await prisma.cameras.findFirst({
      where: { id: req.params.id, is_deleted: false }
    });

    if (!currentCamera || currentCamera.is_deleted) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Soft delete camera
    await prisma.cameras.update({
      where: { uuid: currentCamera.uuid },
      data: { is_deleted: true, version: { increment: 1 } }
    });

    // Record DELETE event
    await recordEvent({
      productionId: currentCamera.production_id,
      eventType: EventType.CAMERA,
      operation: EventOperation.DELETE,
      entityId: req.params.id,
      entityData: currentCamera,
      changes: null,
      userId: userId || 'system',
      userName: userName || 'System',
      version: currentCamera.version + 1
    });

    // Broadcast deletion via WebSocket
    broadcastEntityDeleted({
      io,
      productionId: currentCamera.production_id,
      entityType: 'camera',
      entityId: req.params.id
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete camera:', error);
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

export default router;
