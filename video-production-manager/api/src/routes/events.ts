/**
 * Events API Routes
 * Endpoints for querying change events
 */

import { Router, Request, Response } from 'express';
import { getProductionEvents, getEntityEvents, getEventsSince } from '../services/eventService';

const router = Router();

// GET all events for a production
router.get('/productions/:productionId/events', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    const events = await getProductionEvents(productionId, limit);
    res.json(events);
  } catch (error: any) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events', details: error.message });
  }
});

// GET events for a specific entity
router.get('/productions/:productionId/events/entity/:entityId', async (req: Request, res: Response) => {
  try {
    const { productionId, entityId } = req.params;
    const events = await getEntityEvents(productionId, entityId);
    res.json(events);
  } catch (error: any) {
    console.error('Get entity events error:', error);
    res.status(500).json({ error: 'Failed to get entity events', details: error.message });
  }
});

// GET events since timestamp (for incremental sync)
router.get('/productions/:productionId/events/since/:timestamp', async (req: Request, res: Response) => {
  try {
    const { productionId, timestamp } = req.params;
    const since = new Date(parseInt(timestamp));
    
    if (isNaN(since.getTime())) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }
    
    const events = await getEventsSince(productionId, since);
    res.json(events);
  } catch (error: any) {
    console.error('Get events since error:', error);
    res.status(500).json({ error: 'Failed to get events', details: error.message });
  }
});

export default router;
