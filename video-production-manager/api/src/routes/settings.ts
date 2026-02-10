import { Router, Request, Response } from 'express';
import { prisma, io } from '../server';

const router = Router();

// ============================================================================
// CONNECTOR TYPES (Must come before generic :key routes)
// ============================================================================

router.get('/connector-types', async (req: Request, res: Response) => {
  try {
    const connectorTypes = await prisma.connector_types.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' }
    });
    res.json(connectorTypes.map(ct => ct.name));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch connector types' });
  }
});

router.post('/connector-types', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const maxOrder = await prisma.connector_types.aggregate({
      _max: { sort_order: true }
    });
    const connectorType = await prisma.connector_types.create({
      data: {
        name,
        sort_order: (maxOrder._max.sort_order || 0) + 1,
        id: `conn-${Date.now()}`,
        updated_at: new Date()
      }
    });
    
    // Broadcast to all clients
    // io already imported from server
    io.emit('settings:connector-types-updated', { action: 'add', type: connectorType.name });
    
    res.json(connectorType);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create connector type' });
  }
});

router.delete('/connector-types/:name', async (req: Request, res: Response) => {
  try {
    await prisma.connector_types.update({
      where: { name: req.params.name },
      data: { is_active: false, updated_at: new Date() }
    });
    
    // io already imported from server
    io.emit('settings:connector-types-updated', { action: 'delete', name: req.params.name });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete connector type' });
  }
});

router.put('/connector-types/reorder', async (req: Request, res: Response) => {
  try {
    const { types } = req.body;
    const updates = types.map((name: string, index: number) => 
      prisma.connector_types.update({
        where: { name },
        data: { sort_order: index, updated_at: new Date() }
      })
    );
    await prisma.$transaction(updates);
    
    // io already imported from server
    io.emit('settings:connector-types-updated', { action: 'reorder', types });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reorder connector types' });
  }
});

router.post('/connector-types/restore-defaults', async (req: Request, res: Response) => {
  try {
    // Deactivate all existing connector types
    await prisma.connector_types.updateMany({
      data: { is_active: false, updated_at: new Date() }
    });
    
    // Default connector types from seed script
    const defaults = ['HDMI', 'SDI', 'DP', 'NDI', 'USB-C', 'ETH', 'OPTICON DUO', 'OPTICON QUAD', 'SMPTE FIBER', 'LC - FIBER (SM)', 'ST - FIBER (SM)', 'SC - FIBER (SM)', 'LC - FIBER (MM)', 'ST - FIBER (MM)', 'SC - FIBER (MM)', 'XLR', 'DMX'];
    const newTypes: string[] = [];
    
    for (let i = 0; i < defaults.length; i++) {
      const type = await prisma.connector_types.create({
        data: {
          id: `conn-type-${Date.now()}-${i}`,
          name: defaults[i],
          sort_order: i,
          is_active: true,
          updated_at: new Date()
        }
      });
      newTypes.push(type.name);
    }
    
    // io already imported from server
    io.emit('settings:connector-types-updated', { action: 'restore-defaults', types: newTypes });
    
    res.json(newTypes);
  } catch (error: any) {
    console.error('Failed to restore default connector types:', error);
    res.status(500).json({ error: 'Failed to restore defaults' });
  }
});

// ============================================================================
// SOURCE TYPES
// ============================================================================

router.get('/source-types', async (req: Request, res: Response) => {
  try {
    const sourceTypes = await prisma.source_types.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' }
    });
    res.json(sourceTypes.map(st => st.name));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch source types' });
  }
});

router.post('/source-types', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const maxOrder = await prisma.source_types.aggregate({
      _max: { sort_order: true }
    });
    const sourceType = await prisma.source_types.create({
      data: {
        id: `src-type-${Date.now()}`,
        name,
        sort_order: (maxOrder._max.sort_order || 0) + 1,
        updated_at: new Date()
      }
    });
    
    // io already imported from server
    io.emit('settings:source-types-updated', { action: 'add', type: sourceType.name });
    
    res.json(sourceType);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create source type' });
  }
});

router.delete('/source-types/:name', async (req: Request, res: Response) => {
  try {
    await prisma.source_types.update({
      where: { name: req.params.name },
      data: { is_active: false, updated_at: new Date() }
    });
    
    // io already imported from server
    io.emit('settings:source-types-updated', { action: 'delete', name: req.params.name });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete source type' });
  }
});

router.put('/source-types/reorder', async (req: Request, res: Response) => {
  try {
    const { types } = req.body;
    const updates = types.map((name: string, index: number) => 
      prisma.source_types.update({
        where: { name },
        data: { sort_order: index, updated_at: new Date() }
      })
    );
    await prisma.$transaction(updates);
    
    // io already imported from server
    io.emit('settings:source-types-updated', { action: 'reorder', types });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reorder source types' });
  }
});

// Restore defaults
router.post('/source-types/restore-defaults', async (req: Request, res: Response) => {
  try {
    // Deactivate all existing
    await prisma.source_types.updateMany({
      data: { is_active: false, updated_at: new Date() }
    });
    
    // Create defaults
    const defaults = [
      'Laptop - PC MISC', 'Laptop - PC GFX', 'Laptop - PC WIDE',
      'Laptop - MAC MISC', 'Laptop - MAC GFX',
      'Desktop - PC MISC', 'Desktop - PC GFX', 'Desktop - PC SERVER',
      'Desktop - MAC MISC', 'Desktop - MAC GFX', 'Desktop - MAC SERVER'
    ];
    
    const newTypes = [];
    for (let i = 0; i < defaults.length; i++) {
      const type = await prisma.source_types.create({
        data: {
          id: `src-type-${Date.now()}-${i}`,
          name: defaults[i],
          sort_order: i,
          is_active: true,
          updated_at: new Date()
        }
      });
      newTypes.push(type.name);
    }
    
    // io already imported from server
    io.emit('settings:source-types-updated', { action: 'restore-defaults', types: newTypes });
    
    res.json(newTypes);
  } catch (error: any) {
    console.error('Failed to restore default source types:', error);
    res.status(500).json({ error: 'Failed to restore defaults' });
  }
});

// ============================================================================
// FRAME RATES
// ============================================================================

router.get('/frame-rates', async (req: Request, res: Response) => {
  try {
    const frameRates = await prisma.frame_rates.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' }
    });
    res.json(frameRates.map(fr => fr.rate));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch frame rates' });
  }
});

router.post('/frame-rates', async (req: Request, res: Response) => {
  try {
    const { rate } = req.body;
    const maxOrder = await prisma.frame_rates.aggregate({
      _max: { sort_order: true }
    });
    const frameRate = await prisma.frame_rates.create({
      data: {
        id: `frame-rate-${Date.now()}`,
        rate,
        sort_order: (maxOrder._max.sort_order || 0) + 1,
        updated_at: new Date()
      }
    });
    
    // io already imported from server
    io.emit('settings:frame-rates-updated', { action: 'add', rate: frameRate.rate });
    
    res.json(frameRate);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create frame rate' });
  }
});

router.delete('/frame-rates/:rate', async (req: Request, res: Response) => {
  try {
    await prisma.frame_rates.update({
      where: { rate: req.params.rate },
      data: { 
        is_active: false,
        updated_at: new Date()
      }
    });
    
    // io already imported from server
    io.emit('settings:frame-rates-updated', { action: 'delete', rate: req.params.rate });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete frame rate' });
  }
});

router.put('/frame-rates/reorder', async (req: Request, res: Response) => {
  try {
    const { rates } = req.body;
    const updates = rates.map((rate: string, index: number) => 
      prisma.frame_rates.update({
        where: { rate },
        data: { 
          sort_order: index,
          updated_at: new Date()
        }
      })
    );
    await prisma.$transaction(updates);
    
    // io already imported from server
    io.emit('settings:frame-rates-updated', { action: 'reorder', rates });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reorder frame rates' });
  }
});

router.post('/frame-rates/restore-defaults', async (req: Request, res: Response) => {
  try {
    // Deactivate all existing frame rates
    await prisma.frame_rates.updateMany({
      data: { is_active: false, updated_at: new Date() }
    });
    
    // Default frame rates from seed script
    const defaults = ['60', '59.94', '50', '30', '29.97', '25', '24', '23.98'];
    const newRates: string[] = [];
    
    for (let i = 0; i < defaults.length; i++) {
      const rate = await prisma.frame_rates.create({
        data: {
          id: `frame-rate-${Date.now()}-${i}`,
          rate: defaults[i],
          sort_order: i,
          is_active: true,
          updated_at: new Date()
        }
      });
      newRates.push(rate.rate);
    }
    
    // io already imported from server
    io.emit('settings:frame-rates-updated', { action: 'restore-defaults', rates: newRates });
    
    res.json(newRates);
  } catch (error: any) {
    console.error('Failed to restore default frame rates:', error);
    res.status(500).json({ error: 'Failed to restore defaults' });
  }
});

// ============================================================================
// RESOLUTION PRESETS
// ============================================================================

router.get('/resolutions', async (req: Request, res: Response) => {
  try {
    const resolutions = await prisma.resolution_presets.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' }
    });
    res.json(resolutions.map(r => r.name));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch resolutions' });
  }
});

router.post('/resolutions', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const maxOrder = await prisma.resolution_presets.aggregate({
      _max: { sort_order: true }
    });
    const resolution = await prisma.resolution_presets.create({
      data: {
        id: `resolution-${Date.now()}`,
        name,
        sort_order: (maxOrder._max.sort_order || 0) + 1,
        updated_at: new Date()
      }
    });
    
    // io already imported from server
    io.emit('settings:resolution-presets-updated', { action: 'add', name: resolution.name });
    
    res.json(resolution);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create resolution' });
  }
});

router.delete('/resolutions/:name', async (req: Request, res: Response) => {
  try {
    await prisma.resolution_presets.update({
      where: { name: req.params.name },
      data: { 
        is_active: false,
        updated_at: new Date()
      }
    });
    
    // io already imported from server
    io.emit('settings:resolution-presets-updated', { action: 'delete', name: req.params.name });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete resolution' });
  }
});

router.put('/resolutions/reorder', async (req: Request, res: Response) => {
  try {
    const { resolutions } = req.body;
    const updates = resolutions.map((name: string, index: number) => 
      prisma.resolution_presets.update({
        where: { name },
        data: { 
          sort_order: index,
          updated_at: new Date()
        }
      })
    );
    await prisma.$transaction(updates);
    
    // io already imported from server
    io.emit('settings:resolution-presets-updated', { action: 'reorder', resolutions });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reorder resolutions' });
  }
});

router.post('/resolutions/restore-defaults', async (req: Request, res: Response) => {
  try {
    // Deactivate all existing resolutions
    await prisma.resolution_presets.updateMany({
      data: { is_active: false, updated_at: new Date() }
    });
    
    // Default resolutions from seed script
    const defaults = ['8192 x 1080', '7680 x 1080', '4096 x 2160', '3840 x 2160', '3840 x 1080', '3240 x 1080', '1920 x 1200', '1920 x 1080', '1280 x 720'];
    const newResolutions: string[] = [];
    
    for (let i = 0; i < defaults.length; i++) {
      const resolution = await prisma.resolution_presets.create({
        data: {
          id: `resolution-${Date.now()}-${i}`,
          name: defaults[i],
          sort_order: i,
          is_active: true,
          updated_at: new Date()
        }
      });
      newResolutions.push(resolution.name);
    }
    
    // io already imported from server
    io.emit('settings:resolution-presets-updated', { action: 'restore-defaults', resolutions: newResolutions });
    
    res.json(newResolutions);
  } catch (error: any) {
    console.error('Failed to restore default resolutions:', error);
    res.status(500).json({ error: 'Failed to restore defaults' });
  }
});

// ============================================================================
// GENERIC SETTINGS (Must come LAST - after all specific routes)
// ============================================================================

// GET all settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findMany();
    
    // Convert to key-value object
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);

    res.json(settingsObj);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET single setting
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: req.params.key }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(setting.value);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// POST/PUT upsert setting
router.post('/:key', async (req: Request, res: Response) => {
  try {
    const { value, category } = req.body;

    const setting = await prisma.settings.upsert({
      where: { key: req.params.key },
      create: {
        key: req.params.key,
        value,
        category
      },
      update: {
        value,
        category
      }
    });

    res.json(setting);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

// DELETE setting
router.delete('/:key', async (req: Request, res: Response) => {
  try {
    await prisma.settings.delete({
      where: { key: req.params.key }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

export default router;
