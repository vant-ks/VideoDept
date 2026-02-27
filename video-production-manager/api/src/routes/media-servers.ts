import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Helper: Transform database media_server to frontend format
// Converts outputs_data → outputs to match TypeScript interfaces
function normalizeMediaServer(server: any) {
  const camelCased = toCamelCase(server);
  return {
    ...camelCased,
    outputs: camelCased.outputsData || [], // Ensure outputs is always an array
    outputsData: undefined // Remove the database field name
  };
}

// Get all media-servers for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const mediaServers = await prisma.media_servers.findMany({
      where: {
        production_id: productionId,
        is_deleted: false
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(mediaServers.map(normalizeMediaServer));
  } catch (error) {
    console.error('Error fetching media-servers:', error);
    res.status(500).json({ error: 'Failed to fetch media-servers' });
  }
});

// Create mediaServer
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, productionId, outputs, ...mediaServerData } = req.body;
    const snakeCaseData = toSnakeCase(mediaServerData);
    
    console.log('📥 Creating media server:', {
      productionId,
      id: mediaServerData.id,
      name: mediaServerData.name,
      hasOutputs: !!outputs,
      snakeCaseKeys: Object.keys(snakeCaseData)
    });
    
    const mediaServer = await prisma.media_servers.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        outputs_data: outputs || [], // Store as outputs_data, default to empty array
        updated_at: new Date(),
        version: 1
      }
    });
    
    // Record event
    await recordEvent({
      productionId: mediaServer.production_id,
      eventType: EventType.MEDIA_SERVER,
      operation: EventOperation.CREATE,
      entityId: mediaServer.id,
      entityData: mediaServer,
      userId: userId || 'system',
      userName: userName || 'System',
      version: mediaServer.version
    });
    
    // Broadcast to production room
    io.to(`production:${mediaServer.production_id}`).emit('entity:created', {
      entityType: 'mediaServer',
      entity: normalizeMediaServer(mediaServer),
      userId,
      userName
    });
    
    console.log('✅ Media server created:', mediaServer.id, 'uuid:', mediaServer.uuid);
    
    res.status(201).json(normalizeMediaServer(mediaServer));
  } catch (error) {
    console.error('❌ Error creating mediaServer:', error);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({ error: 'Failed to create mediaServer' });
  }
});

// Update mediaServer
router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { version: clientVersion, userId, userName, outputs, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.media_servers.findUnique({
      where: { uuid }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'MediaServer not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This mediaServer has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Prepare update data - transform outputs → outputs_data if present
    const updateData: any = { ...updates, version: current.version + 1 };
    if (outputs !== undefined) {
      updateData.outputs_data = outputs;
    }
    
    // Update with incremented version
    const mediaServer = await prisma.media_servers.update({
      where: { uuid },
      data: updateData
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, mediaServer);
    
    await recordEventFn({
      productionId: mediaServer.production_id,
      eventType: EventType.MEDIA_SERVER,
      operation: EventOperation.UPDATE,
      entityId: mediaServer.id,
      entityData: mediaServer,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: mediaServer.version
    });
    
    // Broadcast to production room
    io.to(`production:${mediaServer.production_id}`).emit('entity:updated', {
      entityType: 'mediaServer',
      entity: normalizeMediaServer(mediaServer),
      userId,
      userName
    });
    
    res.json(normalizeMediaServer(mediaServer));
  } catch (error) {
    console.error('Error updating mediaServer:', error);
    res.status(500).json({ error: 'Failed to update mediaServer' });
  }
});

// Delete mediaServer (soft delete)
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.media_servers.findUnique({ where: { uuid } });
    
    if (!current) {
      return res.status(404).json({ error: 'MediaServer not found' });
    }
    
    // Soft delete
    await prisma.media_servers.update({
      where: { uuid },
      data: { is_deleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.MEDIA_SERVER,
      operation: EventOperation.DELETE,
      entityId: uuid,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'mediaServer',
      entityId: uuid,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mediaServer:', error);
    res.status(500).json({ error: 'Failed to delete mediaServer' });
  }
});

export default router;
