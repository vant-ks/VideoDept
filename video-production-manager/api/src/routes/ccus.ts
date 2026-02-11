import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { broadcastEntityUpdate, broadcastEntityCreated, broadcastEntityDeleted, prepareVersionedUpdate } from '../utils/sync-helpers';
import { validateProductionExists } from '../utils/validation-helpers';
import { 
  CCU_VERSIONED_FIELDS,
  compareFieldVersionsForEntity,
  mergeNonConflictingFieldsForEntity,
  initFieldVersionsForEntity,
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
    
    // Convert camelCase to snake_case for database
    const snakeCaseData = toSnakeCase(ccuData);
    
    // Check if CCU with this ID already exists (including soft-deleted)
    const existingCCU = await prisma.ccus.findUnique({
      where: { id: snakeCaseData.id }
    });
    
    if (existingCCU) {
      return res.status(409).json({ 
        error: 'A CCU with this ID already exists. Please choose a different ID.',
        code: 'DUPLICATE_ID',
        existingId: snakeCaseData.id,
        isDeleted: existingCCU.is_deleted
      });
    }
    
    const ccu = await prisma.ccus.create({
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
    const { userId, userName, version: clientVersion, fieldVersions: clientFieldVersions, lastModifiedBy, productionId, ...updateData } = req.body;
    
    // Fetch current CCU state
    const currentCCU = await prisma.ccus.findUnique({
      where: { id: req.params.id }
    });

    if (!currentCCU || currentCCU.is_deleted) {
      return res.status(404).json({ error: 'CCU not found' });
    }

    // FIELD-LEVEL VERSIONING: Check if client provided field versions
    const serverFieldVersions = (currentCCU.field_versions as unknown) as FieldVersions || {};
    const serverData = toCamelCase(currentCCU);
    
    if (clientFieldVersions && isValidFieldVersions(clientFieldVersions)) {
      console.log('🔍 Field-level conflict detection for CCU:', req.params.id);
      
      // Compare field versions to detect conflicts
      const conflicts = compareFieldVersionsForEntity(
        clientFieldVersions,
        serverFieldVersions,
        updateData,
        serverData,
        CCU_VERSIONED_FIELDS
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
          currentVersion: currentCCU.version
        });
      }
      
      // Merge non-conflicting updates
      const mergeResult = mergeNonConflictingFieldsForEntity(
        clientFieldVersions,
        serverFieldVersions,
        updateData,
        serverData,
        CCU_VERSIONED_FIELDS
      );
      
      console.log('✅ Field-level merge successful for CCU');
      
      // Calculate changes
      const changes = calculateDiff(currentCCU, mergeResult.mergedData);

      // Convert camelCase to snake_case for database
      const snakeCaseData = toSnakeCase(mergeResult.mergedData);

      // Update CCU with field versions
      const ccu = await prisma.ccus.update({
        where: { id: req.params.id },
        data: {
          ...snakeCaseData,
          updated_at: new Date(),
          field_versions: mergeResult.mergedVersions as any,
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

      return res.json(toCamelCase(ccu));
    }
    
    // FALLBACK: Record-level versioning (for backward compatibility)
    console.log('🔄 Using record-level versioning for CCU (legacy)');
    
    // Check for conflicts if client provides version
    if (clientVersion !== undefined && currentCCU.version !== clientVersion) {
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'This CCU was modified by another user',
        currentVersion: currentCCU.version,
        clientVersion,
        serverData
      });
    }

    // Calculate changes
    const changes = calculateDiff(currentCCU, updateData);

    // Convert camelCase to snake_case for database
    const snakeCaseData = toSnakeCase(updateData);

    // Update CCU with version increment and metadata
    const ccu = await prisma.ccus.update({
      where: { id: req.params.id },
      data: {
        ...snakeCaseData,
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

    // Broadcast deletion via WebSocket
    broadcastEntityDeleted({
      io,
      productionId: currentCCU.production_id,
      entityType: 'ccu',
      entityId: req.params.id
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete CCU:', error);
    res.status(500).json({ error: 'Failed to delete CCU' });
  }
});

export default router;
