import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// Get all ip-addresses for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const ipAddresses = await prisma.ip_addresses.findMany({
      where: {
        production_id: productionId,
        // Note: ip_addresses table doesn't have is_deleted field
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.json(toCamelCase(ipAddresses));
  } catch (error) {
    console.error('Error fetching ip-addresses:', error);
    res.status(500).json({ error: 'Failed to fetch ip-addresses' });
  }
});

// Create ipAddress
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...ipAddress_data } = req.body;
    
    const ipAddress = await prisma.ip_addresses.create({
      data: ipAddress_data
    });
    
    // Record event
    await recordEvent({
      productionId: ipAddress.production_id,
      eventType: EventType.IP_ADDRESS,
      operation: EventOperation.CREATE,
      entityId: ipAddress.id,
      entityData: ipAddress,
      userId: userId || 'system',
      userName: userName || 'System',
      version: ipAddress.version
    });
    
    // Broadcast to production room
    io.to(`production:${ipAddress.production_id}`).emit('entity:created', {
      entityType: 'ipAddress',
      entity: ipAddress,
      userId,
      userName
    });
    
    res.status(201).json(ipAddress);
  } catch (error) {
    console.error('Error creating ipAddress:', error);
    res.status(500).json({ error: 'Failed to create ipAddress' });
  }
});

// Update ipAddress
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.ip_addresses.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'IPAddress not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This ipAddress has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const ipAddress = await prisma.ip_addresses.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, ipAddress);
    
    await recordEventFn({
      productionId: ipAddress.production_id,
      eventType: EventType.IP_ADDRESS,
      operation: EventOperation.UPDATE,
      entityId: ipAddress.id,
      entityData: ipAddress,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: ipAddress.version
    });
    
    // Broadcast to production room
    io.to(`production:${ipAddress.production_id}`).emit('entity:updated', {
      entityType: 'ipAddress',
      entity: ipAddress,
      userId,
      userName
    });
    
    res.json(ipAddress);
  } catch (error) {
    console.error('Error updating ipAddress:', error);
    res.status(500).json({ error: 'Failed to update ipAddress' });
  }
});

// Delete ipAddress (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.ip_addresses.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'IPAddress not found' });
    }
    
    // Note: ip_addresses table doesn't have is_deleted field - using hard delete
    await prisma.ip_addresses.delete({
      where: { id }
    });
    
    // Record event
    await recordEvent({
      productionId: current.production_id,
      eventType: EventType.IP_ADDRESS,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.production_id}`).emit('entity:deleted', {
      entityType: 'ipAddress',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting ipAddress:', error);
    res.status(500).json({ error: 'Failed to delete ipAddress' });
  }
});

export default router;
