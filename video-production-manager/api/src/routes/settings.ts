import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

// ============================================================================
// CONNECTOR TYPES (Must come before generic :key routes)
// ============================================================================

router.get('/connector-types', async (req: Request, res: Response) => {
  try {
    const connectorTypes = await prisma.connectorType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(connectorTypes.map(ct => ct.name));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch connector types' });
  }
});

router.post('/connector-types', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const maxOrder = await prisma.connectorType.aggregate({
      _max: { sortOrder: true }
    });
    const connectorType = await prisma.connectorType.create({
      data: {
        name,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      }
    });
    res.json(connectorType);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create connector type' });
  }
});

router.delete('/connector-types/:name', async (req: Request, res: Response) => {
  try {
    await prisma.connectorType.update({
      where: { name: req.params.name },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete connector type' });
  }
});

router.put('/connector-types/reorder', async (req: Request, res: Response) => {
  try {
    const { types } = req.body;
    const updates = types.map((name: string, index: number) => 
      prisma.connectorType.update({
        where: { name },
        data: { sortOrder: index }
      })
    );
    await prisma.$transaction(updates);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reorder connector types' });
  }
});

// ============================================================================
// SOURCE TYPES
// ============================================================================

router.get('/source-types', async (req: Request, res: Response) => {
  try {
    const sourceTypes = await prisma.sourceType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(sourceTypes.map(st => st.name));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch source types' });
  }
});

router.post('/source-types', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const maxOrder = await prisma.sourceType.aggregate({
      _max: { sortOrder: true }
    });
    const sourceType = await prisma.sourceType.create({
      data: {
        name,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      }
    });
    res.json(sourceType);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create source type' });
  }
});

router.delete('/source-types/:name', async (req: Request, res: Response) => {
  try {
    await prisma.sourceType.update({
      where: { name: req.params.name },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete source type' });
  }
});

router.put('/source-types/reorder', async (req: Request, res: Response) => {
  try {
    const { types } = req.body;
    const updates = types.map((name: string, index: number) => 
      prisma.sourceType.update({
        where: { name },
        data: { sortOrder: index }
      })
    );
    await prisma.$transaction(updates);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reorder source types' });
  }
});

// ============================================================================
// FRAME RATES
// ============================================================================

router.get('/frame-rates', async (req: Request, res: Response) => {
  try {
    const frameRates = await prisma.frameRate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(frameRates.map(fr => fr.rate));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch frame rates' });
  }
});

router.post('/frame-rates', async (req: Request, res: Response) => {
  try {
    const { rate } = req.body;
    const maxOrder = await prisma.frameRate.aggregate({
      _max: { sortOrder: true }
    });
    const frameRate = await prisma.frameRate.create({
      data: {
        rate,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      }
    });
    res.json(frameRate);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create frame rate' });
  }
});

router.delete('/frame-rates/:rate', async (req: Request, res: Response) => {
  try {
    await prisma.frameRate.update({
      where: { rate: req.params.rate },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete frame rate' });
  }
});

router.put('/frame-rates/reorder', async (req: Request, res: Response) => {
  try {
    const { rates } = req.body;
    const updates = rates.map((rate: string, index: number) => 
      prisma.frameRate.update({
        where: { rate },
        data: { sortOrder: index }
      })
    );
    await prisma.$transaction(updates);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reorder frame rates' });
  }
});

// ============================================================================
// RESOLUTION PRESETS
// ============================================================================

router.get('/resolutions', async (req: Request, res: Response) => {
  try {
    const resolutions = await prisma.resolutionPreset.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(resolutions.map(r => r.name));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch resolutions' });
  }
});

router.post('/resolutions', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const maxOrder = await prisma.resolutionPreset.aggregate({
      _max: { sortOrder: true }
    });
    const resolution = await prisma.resolutionPreset.create({
      data: {
        name,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      }
    });
    res.json(resolution);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create resolution' });
  }
});

router.delete('/resolutions/:name', async (req: Request, res: Response) => {
  try {
    await prisma.resolutionPreset.update({
      where: { name: req.params.name },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete resolution' });
  }
});

router.put('/resolutions/reorder', async (req: Request, res: Response) => {
  try {
    const { resolutions } = req.body;
    const updates = resolutions.map((name: string, index: number) => 
      prisma.resolutionPreset.update({
        where: { name },
        data: { sortOrder: index }
      })
    );
    await prisma.$transaction(updates);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reorder resolutions' });
  }
});

// ============================================================================
// GENERIC SETTINGS (Must come LAST - after all specific routes)
// ============================================================================

// GET all settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany();
    
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
    const setting = await prisma.setting.findUnique({
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

    const setting = await prisma.setting.upsert({
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
    await prisma.setting.delete({
      where: { key: req.params.key }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

export default router;
