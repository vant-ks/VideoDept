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
    
    // Map show_name to name for frontend compatibility
    const mapped = productions.map(p => ({ ...p, name: p.show_name }));
    
    logger.manager(LogCategory.API, 'Productions fetched', { 
      requestId, 
      count: productions.length, 
      duration 
    });
    
    res.json(mapped);
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
    
    // Map show_name to name for frontend compatibility
    res.json({ ...production, name: production.show_name });
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
    
    // Only include fields that exist in the database schema
    const dbData: any = {
      show_name: name || restData.show_name, // Map 'name' to 'show_name'
      updated_at: new Date(),
      field_versions: initFieldVersions() // Initialize field-level versions
    };
    
    // Include optional ID if provided, otherwise auto-generate
    if (restData.id) {
      dbData.id = restData.id;
    } else {
      dbData.id = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Add other allowed fields
    if (restData.client) dbData.client = restData.client;
    if (restData.status) dbData.status = restData.status;
    if (restData.venue) dbData.venue = restData.venue;
    if (restData.room) dbData.room = restData.room;
    if (restData.load_in) dbData.load_in = new Date(restData.load_in);
    if (restData.load_out) dbData.load_out = new Date(restData.load_out);
    if (restData.show_info_url) dbData.show_info_url = restData.show_info_url;
    
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
    
    io.to('production-list').emit('production:created', {
      production: { ...production, name: production.show_name },
      userId: userId || 'system',
      userName: userName || 'System'
    });
    
    res.status(201).json({ ...production, name: production.show_name });
  } catch (error: any) {
    const duration = Date.now() - startTime;
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
    let serverFieldVersions = current.field_versions as FieldVersions || initFieldVersions();
    
    // If client provided field_versions, use field-level conflict detection
    if (clientFieldVersions && isValidFieldVersions(clientFieldVersions)) {
      logger.tech(LogCategory.SYNC, 'Using field-level versioning', {
        requestId,
        productionId,
        fieldsUpdated: Object.keys(updateData)
      });
      
      // Prepare client data with mapped fields
      const clientData: Record<string, any> = {};
      if (name !== undefined) clientData.show_name = name;
      if (updateData.client !== undefined) clientData.client = updateData.client;
      if (updateData.status !== undefined) clientData.status = updateData.status;
      if (updateData.venue !== undefined) clientData.venue = updateData.venue;
      if (updateData.room !== undefined) clientData.room = updateData.room;
      if (updateData.load_in !== undefined) clientData.load_in = updateData.load_in;
      if (updateData.load_out !== undefined) clientData.load_out = updateData.load_out;
      if (updateData.show_info_url !== undefined) clientData.show_info_url = updateData.show_info_url;
      if (updateData.production_type !== undefined) clientData.production_type = updateData.production_type;
      if (updateData.contact_name !== undefined) clientData.contact_name = updateData.contact_name;
      if (updateData.contact_email !== undefined) clientData.contact_email = updateData.contact_email;
      if (updateData.contact_phone !== undefined) clientData.contact_phone = updateData.contact_phone;
      if (updateData.show_date !== undefined) clientData.show_date = updateData.show_date;
      if (updateData.show_time !== undefined) clientData.show_time = updateData.show_time;
      
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
      
      const production = await prisma.productions.update({
        where: { id: productionId },
        data: dbData
      });
      
      const duration = Date.now() - startTime;
      logger.logDbOperation('UPDATE', 'productions', duration, 1, { requestId, productionId });
      
      logger.tech(LogCategory.API, `Production updated (field-level): ${production.show_name}`, {
        requestId,
        productionId,
        fieldsUpdated: Object.keys(clientData),
        newVersion: production.version
      });
      
      // Broadcast update via WebSocket
      io.emit('production:updated', { ...production, name: production.show_name });
      
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
      
      // Map and validate each field explicitly
      if (name !== undefined) dbData.show_name = name;
      if (updateData.client !== undefined) dbData.client = updateData.client;
      if (updateData.status !== undefined) dbData.status = updateData.status;
      if (updateData.venue !== undefined) dbData.venue = updateData.venue;
      if (updateData.room !== undefined) dbData.room = updateData.room;
      if (updateData.load_in !== undefined) dbData.load_in = new Date(updateData.load_in);
      if (updateData.load_out !== undefined) dbData.load_out = new Date(updateData.load_out);
      if (updateData.show_info_url !== undefined) dbData.show_info_url = updateData.show_info_url;
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

// DELETE production
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.productions.update({
      where: { id: req.params.id },
      data: { is_deleted: true, version: { increment: 1 } }
    });
    
    // Broadcast to production list room
    io.to('production-list').emit('production:deleted', {
      productionId: req.params.id
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete production' });
  }
});

export default router;
