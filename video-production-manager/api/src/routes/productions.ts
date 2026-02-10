import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { logger, LogCategory } from '../utils/logger';
import { 
  initFieldVersions, 
  mergeNonConflictingFields, 
  isValidFieldVersions,
  FieldVersions 
} from '../utils/fieldVersioning';
import { toSnakeCase, toCamelCase } from '../utils/caseConverter';

const router = Router();

// GET all productions
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = logger.generateRequestId();
  
  try {
    logger.admin(LogCategory.API, 'GET /productions', { requestId });
    
    const productions = await prisma.productions.findMany({
      where: { is_deleted: false },
      orderBy: { created_at: 'desc' }
    });
    
    const duration = Date.now() - startTime;
    logger.logDbOperation('SELECT', 'productions', duration, productions.length, { requestId });
    
    // Transform all productions to camelCase for frontend
    const camelCaseProductions = productions.map(p => {
      const camelP = toCamelCase(p);
      return { ...camelP, name: camelP.showName };
    });
    
    logger.manager(LogCategory.API, 'Productions fetched', { 
      requestId, 
      count: productions.length, 
      duration 
    });
    
    res.json(camelCaseProductions);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(LogCategory.API, 'Failed to fetch productions', error, { requestId, duration });
    res.status(500).json({ error: 'Failed to fetch productions' });
  }
});

// GET single production
router.get('/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = logger.generateRequestId();
  const productionId = req.params.id;
  
  try {
    logger.admin(LogCategory.API, `GET /productions/${productionId}`, { requestId, productionId });
    
    const production = await prisma.productions.findUnique({
      where: { id: productionId }
    });

    const duration = Date.now() - startTime;
    
    if (!production || production.is_deleted) {
      logger.manager(LogCategory.API, 'Production not found', { requestId, productionId, duration });
      return res.status(404).json({ error: 'Production not found' });
    }

    logger.manager(LogCategory.API, 'Production fetched', { 
      requestId, 
      productionId, 
      name: production.show_name,
      duration 
    });
    
    // Transform to camelCase for frontend
    const camelCaseProduction = toCamelCase(production);
    res.json({ ...camelCaseProduction, name: camelCaseProduction.showName });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(LogCategory.API, 'Failed to fetch production', error, { requestId, productionId, duration });
    res.status(500).json({ error: 'Failed to fetch production' });
  }
});

// POST create production
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = logger.generateRequestId();
  
  try {
    // Extract and separate frontend fields from database fields
    const { name, metadata, userId, userName, ...restData } = req.body;
    
    logger.admin(LogCategory.API, 'POST /productions', {
      requestId,
      id: restData.id || '(auto-generate)',
      name,
      client: restData.client,
      status: restData.status,
      userId,
      userName
    });
    
    // Transform camelCase to snake_case
    const snakeCaseData = toSnakeCase(restData);
    
    console.log('=== CREATE PRODUCTION DEBUG ===');
    console.log('1. Original restData:', JSON.stringify(restData, null, 2));
    console.log('2. After toSnakeCase:', JSON.stringify(snakeCaseData, null, 2));
    
    // Only include fields that exist in the database schema
    const dbData: any = {
      show_name: name || snakeCaseData.show_name, // Map 'name' to 'show_name'
      client: snakeCaseData.client || '', // Required field, default to empty string
      updated_at: new Date(),
      field_versions: initFieldVersions() // Initialize field-level versions
    };
    
    // Include optional ID if provided, otherwise auto-generate
    if (snakeCaseData.id) {
      dbData.id = snakeCaseData.id;
    } else {
      dbData.id = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Add default source types if not provided
    if (snakeCaseData.source_types) {
      dbData.source_types = snakeCaseData.source_types;
    } else {
      dbData.source_types = [
        'Laptop - PC MISC',
        'Laptop - PC GFX',
        'Laptop - PC WIDE',
        'Laptop - MAC MISC',
        'Laptop - MAC GFX',
        'Desktop - PC MISC',
        'Desktop - PC GFX',
        'Desktop - PC SERVER',
        'Desktop - MAC MISC',
        'Desktop - MAC GFX',
        'Desktop - MAC SERVER'
      ];
    }
    
    // Add other allowed fields (now in snake_case)
    if (snakeCaseData.status) dbData.status = snakeCaseData.status;
    if (snakeCaseData.venue) dbData.venue = snakeCaseData.venue;
    if (snakeCaseData.room) dbData.room = snakeCaseData.room;
    if (snakeCaseData.load_in) dbData.load_in = snakeCaseData.load_in; // Already a Date object
    if (snakeCaseData.load_out) dbData.load_out = snakeCaseData.load_out; // Already a Date object
    if (snakeCaseData.show_info_url) dbData.show_info_url = snakeCaseData.show_info_url;
    
    console.log('3. Final dbData to Prisma:', JSON.stringify(dbData, null, 2));
    console.log('===========================');
    
    const production = await prisma.productions.create({ data: dbData });
    
    const duration = Date.now() - startTime;
    logger.logDbOperation('INSERT', 'productions', duration, 1, { requestId, productionId: production.id });
    
    logger.tech(LogCategory.API, `Production created: ${production.show_name}`, {
      requestId,
      productionId: production.id,
      client: production.client
    });
    
    // Broadcast to production list room
    logger.logWsEvent('production:created', 'production-list', { 
      requestId, 
      productionId: production.id, 
      userId, 
      userName 
    });
    
    const camelCaseProduction = toCamelCase(production);
    io.to('production-list').emit('production:created', {
      production: camelCaseProduction,
      userId: userId || 'system',
      userName: userName || 'System'
    });
    
    res.status(201).json(camelCaseProduction);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('CREATE PRODUCTION ERROR:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    logger.error(LogCategory.API, 'Failed to create production', error, { requestId, duration });
    res.status(500).json({ error: 'Failed to create production', details: error.message });
  }
});

// PUT update production with field-level versioning
router.put('/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = logger.generateRequestId();
  const productionId = req.params.id;
  
  try {
    const { 
      version: clientVersion, 
      field_versions: clientFieldVersions,
      name, 
      userId, 
      userName, 
      ...updateData 
    } = req.body;
    
    logger.admin(LogCategory.API, `PUT /productions/${productionId}`, {
      requestId,
      productionId,
      clientVersion,
      hasFieldVersions: !!clientFieldVersions,
      userId,
      userName
    });
    
    // Get current version from database
    const current = await prisma.productions.findUnique({
      where: { id: productionId }
    });
    
    if (!current || current.is_deleted) {
      logger.manager(LogCategory.API, 'Production not found for update', { requestId, productionId });
      return res.status(404).json({ error: 'Production not found' });
    }
    
    // Initialize field_versions if not present (backward compatibility)
    let serverFieldVersions = (current.field_versions as unknown) as FieldVersions || initFieldVersions();
    
    // If client provided field_versions, use field-level conflict detection
    if (clientFieldVersions && isValidFieldVersions(clientFieldVersions)) {
      logger.tech(LogCategory.SYNC, 'Using field-level versioning', {
        requestId,
        productionId,
        fieldsUpdated: Object.keys(updateData)
      });
      
      // Transform camelCase to snake_case before processing
      const snakeCaseUpdateData = toSnakeCase(updateData);
      
      // Prepare client data with mapped fields
      const clientData: Record<string, any> = {};
      if (name !== undefined) clientData.show_name = name;
      if (snakeCaseUpdateData.client !== undefined) clientData.client = snakeCaseUpdateData.client;
      if (snakeCaseUpdateData.status !== undefined) clientData.status = snakeCaseUpdateData.status;
      if (snakeCaseUpdateData.venue !== undefined) clientData.venue = snakeCaseUpdateData.venue;
      if (snakeCaseUpdateData.room !== undefined) clientData.room = snakeCaseUpdateData.room;
      if (snakeCaseUpdateData.load_in !== undefined) clientData.load_in = snakeCaseUpdateData.load_in;
      if (snakeCaseUpdateData.load_out !== undefined) clientData.load_out = snakeCaseUpdateData.load_out;
      if (snakeCaseUpdateData.show_info_url !== undefined) clientData.show_info_url = snakeCaseUpdateData.show_info_url;
      if (snakeCaseUpdateData.source_types !== undefined) clientData.source_types = snakeCaseUpdateData.source_types;
      if (snakeCaseUpdateData.production_type !== undefined) clientData.production_type = snakeCaseUpdateData.production_type;
      if (snakeCaseUpdateData.contact_name !== undefined) clientData.contact_name = snakeCaseUpdateData.contact_name;
      if (snakeCaseUpdateData.contact_email !== undefined) clientData.contact_email = snakeCaseUpdateData.contact_email;
      if (snakeCaseUpdateData.contact_phone !== undefined) clientData.contact_phone = snakeCaseUpdateData.contact_phone;
      if (snakeCaseUpdateData.show_date !== undefined) clientData.show_date = snakeCaseUpdateData.show_date;
      if (snakeCaseUpdateData.show_time !== undefined) clientData.show_time = snakeCaseUpdateData.show_time;
      
      // Merge non-conflicting fields
      const mergeResult = mergeNonConflictingFields(
        clientFieldVersions,
        serverFieldVersions,
        clientData,
        current
      );
      
      // If conflicts detected, return 409 with details
      if (mergeResult.hasConflicts) {
        logger.manager(LogCategory.SYNC, 'Field-level conflicts detected', {
          requestId,
          productionId,
          conflicts: mergeResult.conflicts.map(c => c.fieldName)
        });
        
        return res.status(409).json({
          error: 'Conflict',
          message: 'Some fields were modified by another user',
          conflicts: mergeResult.conflicts,
          serverData: { ...current, name: current.show_name },
          serverFieldVersions: serverFieldVersions
        });
      }
      
      // Apply merged data
      const dbData: any = {
        ...mergeResult.mergedData,
        field_versions: mergeResult.mergedVersions,
        version: current.version + 1, // Increment record version
        updated_at: new Date()
      };
      
      if (userId) dbData.last_modified_by = userId;
      
      console.log('💾 Updating production (field-level) with data:', {
        productionId,
        currentVersion: current.version,
        newVersion: current.version + 1,
        lastModifiedBy: userId,
        fieldsUpdating: Object.keys(mergeResult.mergedData)
      });
      
      const production = await prisma.productions.update({
        where: { id: productionId },
        data: dbData
      });
      
      console.log('💾 Production updated, actual new version:', {
        id: production.id,
        version: production.version,
        lastModifiedBy: production.last_modified_by
      });
      
      const duration = Date.now() - startTime;
      logger.logDbOperation('UPDATE', 'productions', duration, 1, { requestId, productionId });
      
      logger.tech(LogCategory.API, `Production updated (field-level): ${production.show_name}`, {
        requestId,
        productionId,
        fieldsUpdated: Object.keys(clientData),
        newVersion: production.version,
        lastModifiedBy: production.last_modified_by
      });
      
      // Broadcast update via WebSocket to production room
      console.log(`📡 Broadcasting production:updated to room production:${productionId}`, {
        version: production.version,
        lastModifiedBy: production.last_modified_by
      });
      io.to(`production:${productionId}`).emit('production:updated', { 
        ...production, 
        name: production.show_name 
      });
      
      res.json({ ...production, name: production.show_name });
      
    } else {
      // Fallback to record-level versioning for backward compatibility
      logger.tech(LogCategory.SYNC, 'Using record-level versioning (legacy)', {
        requestId,
        productionId,
        clientVersion
      });
      
      // Validate version provided
      if (clientVersion === undefined) {
        logger.manager(LogCategory.VALIDATION, 'Version missing', { requestId, productionId });
        return res.status(400).json({ 
          error: 'Version required for conflict detection'
        });
      }
      
      // Check for version conflict
      if (current.version !== clientVersion) {
        logger.manager(LogCategory.SYNC, 'Version conflict detected', {
          requestId,
          productionId,
          clientVersion,
          serverVersion: current.version
        });
        
        return res.status(409).json({ 
          error: 'Conflict',
          message: 'Production was modified by another user',
          currentVersion: current.version,
          serverData: { ...current, name: current.show_name }
        });
      }
      
      // Build validated update data - only include known schema fields
      const dbData: any = {
        version: clientVersion + 1,
        updated_at: new Date()
      };
      
      // Transform camelCase to snake_case
      const snakeCaseUpdateData = toSnakeCase(updateData);
      
      // Map and validate each field explicitly
      if (name !== undefined) dbData.show_name = name;
      if (snakeCaseUpdateData.client !== undefined) dbData.client = snakeCaseUpdateData.client;
      if (snakeCaseUpdateData.status !== undefined) dbData.status = snakeCaseUpdateData.status;
      if (snakeCaseUpdateData.venue !== undefined) dbData.venue = snakeCaseUpdateData.venue;
      if (snakeCaseUpdateData.room !== undefined) dbData.room = snakeCaseUpdateData.room;
      if (snakeCaseUpdateData.load_in !== undefined) dbData.load_in = snakeCaseUpdateData.load_in; // Already a Date object
      if (snakeCaseUpdateData.load_out !== undefined) dbData.load_out = snakeCaseUpdateData.load_out; // Already a Date object
      if (snakeCaseUpdateData.show_info_url !== undefined) dbData.show_info_url = snakeCaseUpdateData.show_info_url;
      if (userId) dbData.last_modified_by = userId;
      
      // Update with validated data
      const production = await prisma.productions.update({
        where: { id: productionId },
        data: dbData
      });
      
      const duration = Date.now() - startTime;
      logger.logDbOperation('UPDATE', 'productions', duration, 1, { requestId, productionId });
      
      logger.tech(LogCategory.API, `Production updated (record-level): ${production.show_name}`, {
        requestId,
        productionId,
        newVersion: production.version
      });
      
      // Broadcast to production list room
      logger.logWsEvent('production:updated', 'production-list', { 
        requestId, 
        productionId, 
        userId, 
        userName 
      });
      
      io.to('production-list').emit('production:updated', {
        production: { ...production, name: production.show_name },
        userId: userId || 'system',
        userName: userName || 'System'
      });
      
      res.json({ ...production, name: production.show_name });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(LogCategory.API, 'Failed to update production', error, { requestId, productionId, duration });
    res.status(500).json({ error: 'Failed to update production' });
  }
});

// DELETE production (HARD DELETE - cascade deletes all related data)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Hard delete - cascade will remove all sources, cameras, ccus, sends, etc.
    await prisma.productions.delete({
      where: { id: req.params.id }
    });
    
    // Broadcast to production list room
    io.to('production-list').emit('production:deleted', {
      productionId: req.params.id
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete production:', error);
    res.status(500).json({ error: 'Failed to delete production' });
  }
});

export default router;
