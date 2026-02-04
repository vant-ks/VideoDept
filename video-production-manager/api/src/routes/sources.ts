import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { validateProductionExists } from '../utils/validation-helpers';

const router = Router();

// GET all sources for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const sources = await prisma.sources.findMany({
      where: {
        production_id: req.params.productionId,
        is_deleted: false
      },
      include: {
        source_outputs: true
      },
      orderBy: { created_at: 'asc' }
    });
    res.json(toCamelCase(sources));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// GET single source
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const source = await prisma.sources.findUnique({
      where: { id: req.params.id },
      include: { source_outputs: true }
    });

    if (!source || source.is_deleted) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json(toCamelCase(source));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch source' });
  }
});

// POST create source
router.post('/', async (req: Request, res: Response) => {
  try {
    // Debug logging - log FULL req.body first
    console.log('🔍 FULL req.body:', JSON.stringify(req.body, null, 2));
    
    const { outputs, productionId, userId, userName, ...sourceData } = req.body;
    
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
    
    // Debug logging
    console.log('Creating source with productionId:', productionId);
    console.log('Source data before conversion:', sourceData);
    
    const snakeCaseData = toSnakeCase(sourceData);
    
    console.log('Source data after conversion:', snakeCaseData);

    const source = await prisma.sources.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        updated_at: new Date(),
        source_outputs: outputs ? {
          create: outputs.map((output: any) => {
            const snakeCaseOutput = toSnakeCase(output);
            return {
              id: snakeCaseOutput.id || `${snakeCaseData.id}-out-${snakeCaseOutput.output_index || 1}`,
              connector: snakeCaseOutput.connector,
              output_index: snakeCaseOutput.output_index || 1,
              h_res: snakeCaseOutput.h_res,
              v_res: snakeCaseOutput.v_res,
              rate: snakeCaseOutput.rate,
              standard: snakeCaseOutput.standard
            };
          })
        } : undefined
      },
      include: { source_outputs: true }
    });

    // Record CREATE event
    await recordEvent({
      productionId,
      eventType: EventType.SOURCE,
      operation: EventOperation.CREATE,
      entityId: source.id,
      entityData: source,
      userId: userId || 'system',
      userName: userName || 'System',
      version: 1
    });

    // Broadcast event to production room
    io.to(`production:${productionId}`).emit('entity:created', {
      entityType: 'source',
      entity: toCamelCase(source),
      userId,
      userName
    });

    res.status(201).json(toCamelCase(source));
  } catch (error: any) {
    console.error('Create source error:', error);
    
    // Check for unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
      return res.status(409).json({ 
        error: 'Source ID already exists',
        message: `A source with ID "${req.body.id}" already exists. Please use a different ID.`,
        code: 'DUPLICATE_ID'
      });
    }
    
    res.status(500).json({ error: 'Failed to create source', details: error.message });
  }
});

// PUT update source (with event recording and conflict detection)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { outputs, userId, userName, version: clientVersion, ...updateData } = req.body;
    
    // Get current source for diff and conflict detection
    const currentSource = await prisma.sources.findUnique({
      where: { id: req.params.id },
      include: { source_outputs: true }
    });
    
    if (!currentSource || currentSource.is_deleted) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && currentSource.version !== clientVersion) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Source was modified by another user',
        currentVersion: currentSource.version,
        serverData: toCamelCase(currentSource)
      });
    }
    
    const snakeCaseData = toSnakeCase(updateData);
    const updatedSource = await prisma.sources.update({
      where: { id: req.params.id },
      data: {
        ...snakeCaseData,
        version: { increment: 1 },
        last_modified_by: userId || 'system',
        updated_at: new Date()
      },
      include: { source_outputs: true }
    });
    
    // Calculate diff and record event
    const changes = calculateDiff(currentSource, updatedSource);
    await recordEvent({
      productionId: currentSource.productionId,
      eventType: EventType.SOURCE,
      operation: EventOperation.UPDATE,
      entityId: updatedSource.id,
      entityData: updatedSource,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: updatedSource.version
    });

    // Broadcast event to production room
    io.to(`production:${currentSource.production_id}`).emit('entity:updated', {
      entityType: 'source',
      entity: toCamelCase(updatedSource),
      changes,
      userId,
      userName
    });

    res.json(toCamelCase(updatedSource));
  } catch (error: any) {
    console.error('Update source error:', error);
    res.status(500).json({ error: 'Failed to update source', details: error.message });
  }
});

// DELETE source (soft delete with event recording)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body;
    
    const source = await prisma.sources.findUnique({
      where: { id: req.params.id },
      include: { source_outputs: true }
    });
    
    if (!source || source.is_deleted) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    const deletedSource = await prisma.sources.update({
      where: { id: req.params.id },
      data: {
        is_deleted: true,
        version: { increment: 1 },
        last_modified_by: userId || 'system'
      },
      include: { source_outputs: true }
    });
    
    // Record DELETE event
    await recordEvent({
      productionId: source.production_id,
      eventType: EventType.SOURCE,
      operation: EventOperation.DELETE,
      entityId: deletedSource.id,
      entityData: deletedSource,
      userId: userId || 'system',
      userName: userName || 'System',
      version: deletedSource.version
    });

    // Broadcast event to production room
    io.to(`production:${source.production_id}`).emit('entity:deleted', {
      entityType: 'source',
      entityId: deletedSource.id,
      userId,
      userName
    });

    res.json({ success: true, message: 'Source deleted' });
  } catch (error: any) {
    console.error('Delete source error:', error);
    res.status(500).json({ error: 'Failed to delete source', details: error.message });
  }
});

export default router;
