import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { broadcastEntityUpdate, broadcastEntityCreated, prepareVersionedUpdate } from '../utils/sync-helpers';
import { validateProductionExists } from '../utils/validation-helpers';
import { 
  CCU_VERSIONED_FIELDS,
  initFieldVersionsForEntity,
  compareFieldVersionsForEntity,
  mergeNonConflictingFieldsForEntity,
  isValidFieldVersions,
  FieldVersions
} from '../utils/fieldVersioning';

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
    
    const ccu = await prisma.ccus.create({
      data: {
        ...ccuData,
        production_id: productionId,
        last_modified_by: lastModifiedBy || userId || null,
        updated_at: new Date(),
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
    const { userId, userName, version: clientVersion, lastModifiedBy, fieldVersions: clientFieldVersions, ...updateData } = req.body;
    
    // Fetch current CCU state
    const currentCCU = await prisma.ccus.findUnique({
      where: { id: req.params.id }
    });

    if (!currentCCU || currentCCU.is_deleted) {
      return res.status(404).json({ error: 'CCU not found' });
    }

    // Parse server field versions
    const serverFieldVersions: FieldVersions = 
      (currentCCU.field_versions && isValidFieldVersions(currentCCU.field_versions))
        ? currentCCU.field_versions as FieldVersions
        : initFieldVersionsForEntity(CCU_VERSIONED_FIELDS);

    // If client provides field versions, use field-level conflict detection
    let finalUpdateData = updateData;
    let finalFieldVersions = serverFieldVersions;

    if (clientFieldVersions && isValidFieldVersions(clientFieldVersions)) {
      // Check for field-level conflicts
      const conflicts = compareFieldVersionsForEntity(
        clientFieldVersions,
        serverFieldVersions,
        updateData,
        currentCCU,
        CCU_VERSIONED_FIELDS
      );

      if (conflicts.length > 0) {
        // Try to merge non-conflicting fields
        const mergeResult = mergeNonConflictingFieldsForEntity(
          clientFieldVersions,
          serverFieldVersions,
          updateData,
          currentCCU,
          CCU_VERSIONED_FIELDS
        );

        return res.status(409).json({
          error: 'Conflict detected',
          message: 'Some fields were modified by another user',
          conflicts: mergeResult.conflicts,
          mergedData: toCamelCase(mergeResult.mergedData),
          mergedFieldVersions: mergeResult.mergedVersions,
          serverData: toCamelCase(currentCCU),
          serverFieldVersions
        });
      }

      // No conflicts - update field versions for changed fields
      finalFieldVersions = { ...serverFieldVersions };
      for (const fieldName in updateData) {
        if (CCU_VERSIONED_FIELDS.includes(fieldName as any)) {
          finalFieldVersions[fieldName] = {
            version: (serverFieldVersions[fieldName]?.version || 0) + 1,
            updated_at: new Date().toISOString()
          };
        }
      }
    } else {
      // Fallback to entity-level version check
      if (clientVersion !== undefined && currentCCU.version !== clientVersion) {
        return res.status(409).json({
          error: 'Conflict detected',
          message: 'This CCU was modified by another user',
          currentVersion: currentCCU.version,
          clientVersion
        });
      }
    }

    // Calculate changes
    const changes = calculateDiff(currentCCU, finalUpdateData);

    // Update CCU with version increment and metadata
    const ccu = await prisma.ccus.update({
      where: { id: req.params.id },
      data: {
        ...finalUpdateData,
        field_versions: finalFieldVersions,
        updated_at: new Date(),
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
