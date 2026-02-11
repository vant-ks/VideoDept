import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent, calculateDiff } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { validateProductionExists } from '../utils/validation-helpers';
import crypto from 'crypto';

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
  console.log('🚨🚨🚨 POST /sources ROUTE HANDLER CALLED 🚨🚨🚨');
  console.log('   Timestamp:', new Date().toISOString());
  console.log('   req.body.id:', req.body.id);
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
    console.log('📝 POST /sources - Creating source');
    console.log('   Production ID:', productionId);
    console.log('   Request body:', req.body);
    
    const snakeCaseData = toSnakeCase(sourceData);
    console.log('   Snake case data:', snakeCaseData);

    // BYPASS PRISMA - Use raw SQL to avoid Prisma's broken constraint handling
    const uuid = crypto.randomUUID();
    const now = new Date();
    
    // Insert source using raw SQL
    console.log('💾 Inserting source with uuid:', uuid);
    await prisma.$executeRaw`
      INSERT INTO sources (
        id, production_id, category, name, type, rate, 
        h_res, v_res, standard, note, secondary_device, blanking,
        format_assignment_mode, created_at, updated_at, version, is_deleted, uuid
      ) VALUES (
        ${snakeCaseData.id},
        ${productionId},
        ${snakeCaseData.category},
        ${snakeCaseData.name},
        ${snakeCaseData.type || null},
        ${snakeCaseData.rate || null},
        ${snakeCaseData.h_res || null},
        ${snakeCaseData.v_res || null},
        ${snakeCaseData.standard || null},
        ${snakeCaseData.note || null},
        ${snakeCaseData.secondary_device || null},
        ${snakeCaseData.blanking || null},
        ${snakeCaseData.format_assignment_mode || 'system-wide'},
        ${now},
        ${now},
        1,
        false,
        ${uuid}
      )
    `;
    console.log('✅ Source inserted successfully');
    
    // Insert outputs if provided
    if (outputs && outputs.length > 0) {
      console.log('💾 Inserting', outputs.length, 'outputs');
      for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];
        const snakeCaseOutput = toSnakeCase(output);
        // Always generate unique output ID based on source ID to avoid collisions
        const outputId = `${snakeCaseData.id}-out-${snakeCaseOutput.output_index || (i + 1)}`;
        await prisma.$executeRaw`
          INSERT INTO source_outputs (
            id, source_id, connector, output_index, h_res, v_res, rate, standard
          ) VALUES (
            ${outputId},
            ${uuid},
            ${snakeCaseOutput.connector},
            ${snakeCaseOutput.output_index || (i + 1)},
            ${snakeCaseOutput.h_res || null},
            ${snakeCaseOutput.v_res || null},
            ${snakeCaseOutput.rate || null},
            ${snakeCaseOutput.standard || null}
          )
        `;
      }
      console.log('✅ Outputs inserted successfully');
    }
    
    // Fetch the created source back
    console.log('🔍 Fetching created source with uuid:', uuid);
    const source = await prisma.$queryRaw`
      SELECT s.*, 
        json_agg(
          json_build_object(
            'id', so.id,
            'connector', so.connector,
            'output_index', so.output_index,
            'h_res', so.h_res,
            'v_res', so.v_res,
            'rate', so.rate,
            'standard', so.standard
          )
        ) FILTER (WHERE so.id IS NOT NULL) as source_outputs
      FROM sources s
      LEFT JOIN source_outputs so ON s.id = so.source_id
      WHERE s.id::text = ${uuid}
      GROUP BY s.id, s.production_id, s.category, s.name, s.type, s.rate, 
               s.h_res, s.v_res, s.standard, s.note, s.secondary_device, 
               s.blanking, s.format_assignment_mode, s.created_at, s.updated_at, 
               s.synced_at, s.last_modified_by, s.version, s.is_deleted
    ` as any[];
    console.log('✅ Fetched source:', source.length, 'rows');
    console.log('   Source data:', JSON.stringify(source[0], null, 2));

    const createdSource = source[0];

    // Record CREATE event
    console.log('📝 Recording event for source:', createdSource.id);
    await recordEvent({
      productionId,
      eventType: EventType.SOURCE,
      operation: EventOperation.CREATE,
      entityId: createdSource.id,
      entityData: createdSource,
      userId: userId || 'system',
      userName: userName || 'System',
      version: 1
    });
    console.log('✅ Event recorded');

    // Broadcast event to production room
    console.log('📡 Broadcasting entity:created event');
    const camelCaseSource = toCamelCase(createdSource);
    // Map sourceOutputs to outputs for frontend compatibility
    const broadcastData = {
      ...camelCaseSource,
      outputs: camelCaseSource.sourceOutputs || []
    };
    delete broadcastData.sourceOutputs;
    
    io.to(`production:${productionId}`).emit('entity:created', {
      entityType: 'source',
      entity: broadcastData,
      userId,
      userName
    });

    console.log('✅ Sending 201 response');
    res.status(201).json(broadcastData);
  } catch (error: any) {
    console.error('❌ Create source error:', error);
    console.error('   Error code:', error.code);
    console.error('   Error meta:', error.meta);
    console.error('   Full error:', JSON.stringify(error, null, 2));
    
    // Check for unique constraint violation
    // PostgreSQL error code 23505 = unique_violation
    // Prisma wraps this as P2010 with meta.code = 23505
    if (error.code === 'P2010' && error.meta?.code === '23505') {
      return res.status(409).json({ 
        error: 'Source ID already exists',
        message: `A source with ID "${req.body.id}" already exists in this production. Please use a different ID.`,
        code: 'DUPLICATE_ID'
      });
    }
    
    // Also check for direct P2002 (legacy Prisma handling)
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
    
    // Use raw SQL to bypass Prisma's composite unique constraint bug
    const newVersion = currentSource.version + 1;
    const lastModifiedBy = userId || 'system';
    const updatedAt = new Date();
    
    await prisma.$executeRaw`
      UPDATE sources
      SET
        category = ${snakeCaseData.category},
        name = ${snakeCaseData.name},
        type = ${snakeCaseData.type || null},
        rate = ${snakeCaseData.rate || null},
        note = ${snakeCaseData.note || null},
        format_assignment_mode = ${snakeCaseData.format_assignment_mode || 'system-wide'},
        h_res = ${snakeCaseData.h_res || null},
        v_res = ${snakeCaseData.v_res || null},
        standard = ${snakeCaseData.standard || null},
        secondary_device = ${snakeCaseData.secondary_device || null},
        blanking = ${snakeCaseData.blanking || null},
        version = ${newVersion},
        last_modified_by = ${lastModifiedBy},
        updated_at = ${updatedAt}
      WHERE id = ${req.params.id}
    `;
    
    // Fetch the updated source with raw SQL
    const updatedSourceRaw = await prisma.$queryRaw`
      SELECT s.*, json_agg(
        json_build_object(
          'id', so.id,
          'connector', so.connector,
          'output_index', so.output_index
        )
      ) FILTER (WHERE so.id IS NOT NULL) as source_outputs
      FROM sources s
      LEFT JOIN source_outputs so ON so.source_id = s.id
      WHERE s.id = ${req.params.id}
      GROUP BY s.id, s.uuid, s.production_id, s.category, s.name, s.type, s.rate, s.note, s.format_assignment_mode, s.h_res, s.v_res, s.standard, s.secondary_device, s.blanking, s.version, s.last_modified_by, s.updated_at, s.created_at, s.synced_at, s.is_deleted
    `;
    
    const updatedSource = Array.isArray(updatedSourceRaw) ? updatedSourceRaw[0] : updatedSourceRaw;
    
    // Calculate diff and record event
    const changes = calculateDiff(currentSource, updatedSource);
    await recordEvent({
      productionId: currentSource.production_id,
      eventType: EventType.SOURCE,
      operation: EventOperation.UPDATE,
      entityId: updatedSource.id,
      entityData: updatedSource,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: newVersion
    });

    // Broadcast event to production room
    const camelCaseUpdated = toCamelCase(updatedSource);
    const broadcastUpdated = {
      ...camelCaseUpdated,
      outputs: camelCaseUpdated.sourceOutputs || []
    };
    delete broadcastUpdated.sourceOutputs;
    
    io.to(`production:${currentSource.production_id}`).emit('entity:updated', {
      entityType: 'source',
      entity: broadcastUpdated,
      changes,
      userId,
      userName
    });

    res.json(broadcastUpdated);
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
    
    // Use raw SQL to bypass Prisma's composite unique constraint bug
    const newVersion = source.version + 1;
    const lastModifiedBy = userId || 'system';
    
    await prisma.$executeRaw`
      UPDATE sources
      SET
        is_deleted = true,
        version = ${newVersion},
        last_modified_by = ${lastModifiedBy}
      WHERE id = ${req.params.id}
    `;
    
    // Fetch the deleted source for the event
    const deletedSourceRaw = await prisma.$queryRaw`
      SELECT s.*, json_agg(
        json_build_object(
          'id', so.id,
          'connector', so.connector,
          'output_index', so.output_index
        )
      ) FILTER (WHERE so.id IS NOT NULL) as source_outputs
      FROM sources s
      LEFT JOIN source_outputs so ON so.source_id = s.id
      WHERE s.id = ${req.params.id}
      GROUP BY s.id, s.uuid, s.production_id, s.category, s.name, s.type, s.rate, s.note, s.format_assignment_mode, s.h_res, s.v_res, s.standard, s.secondary_device, s.blanking, s.version, s.last_modified_by, s.updated_at, s.created_at, s.synced_at, s.is_deleted
    `;
    
    const deletedSource = Array.isArray(deletedSourceRaw) ? deletedSourceRaw[0] : deletedSourceRaw;
    
    // Record DELETE event
    await recordEvent({
      productionId: source.production_id,
      eventType: EventType.SOURCE,
      operation: EventOperation.DELETE,
      entityId: deletedSource.id,
      entityData: deletedSource,
      userId: userId || 'system',
      userName: userName || 'System',
      version: newVersion
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
