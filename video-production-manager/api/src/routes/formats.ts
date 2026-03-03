/**
 * formats.ts
 * CRUD routes for the `formats` table.
 *
 * System presets (is_system = true) are seeded by seed-formats.ts and are
 * read-only via the API — PUT/DELETE are blocked on them.
 * Users can create custom formats (is_system = false) for non-standard signals.
 *
 * URL layout (mounted at /api/formats):
 *   GET  /          — all formats, system first
 *   GET  /:uuid     — single format
 *   POST /          — create user-defined format
 *   PUT  /:uuid     — update user-defined format (system formats: 403)
 *   DELETE /:uuid   — delete user-defined format (system formats: 403)
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

const router = Router();

// ─── GET / ────────────────────────────────────────────────────────────────────
// Returns all formats, system presets first then user-defined, sorted by
// v_res desc → frame_rate desc so the list reads highest-quality first.

router.get('/', async (_req: Request, res: Response) => {
  try {
    const formats = await prisma.formats.findMany({
      orderBy: [
        { is_system: 'desc' },
        { v_res: 'desc' },
        { frame_rate: 'desc' },
      ],
    });
    res.json(toCamelCase(formats));
  } catch (error: any) {
    console.error('Failed to fetch formats:', error);
    res.status(500).json({ error: 'Failed to fetch formats' });
  }
});

// ─── GET /:uuid ───────────────────────────────────────────────────────────────

router.get('/:uuid', async (req: Request, res: Response) => {
  try {
    const format = await prisma.formats.findUnique({
      where: { uuid: req.params.uuid },
    });
    if (!format) {
      return res.status(404).json({ error: 'Format not found' });
    }
    res.json(toCamelCase(format));
  } catch (error: any) {
    console.error('Failed to fetch format:', error);
    res.status(500).json({ error: 'Failed to fetch format' });
  }
});

// ─── POST / ───────────────────────────────────────────────────────────────────
// Create a user-defined format. `id` must be unique (e.g. "2048p5994").
// `is_system` is forced to false regardless of what the client sends.

router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, hRes, vRes, frameRate, isInterlaced, blanking } = req.body;

    if (!id || !hRes || !vRes || !frameRate) {
      return res.status(400).json({ error: 'id, hRes, vRes, and frameRate are required' });
    }

    // Check uniqueness
    const existing = await prisma.formats.findUnique({ where: { id } });
    if (existing) {
      return res.status(409).json({ error: `Format id "${id}" already exists` });
    }

    const format = await prisma.formats.create({
      data: {
        id,
        h_res: hRes,
        v_res: vRes,
        frame_rate: frameRate,
        is_interlaced: isInterlaced ?? false,
        blanking: blanking ?? 'NONE',
        is_system: false,
        updated_at: new Date(),
      },
    });
    res.status(201).json(toCamelCase(format));
  } catch (error: any) {
    console.error('Failed to create format:', error);
    res.status(500).json({ error: 'Failed to create format' });
  }
});

// ─── PUT /:uuid ───────────────────────────────────────────────────────────────

router.put('/:uuid', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.formats.findUnique({
      where: { uuid: req.params.uuid },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Format not found' });
    }
    if (existing.is_system) {
      return res.status(403).json({ error: 'System format presets cannot be modified' });
    }

    const { id, hRes, vRes, frameRate, isInterlaced, blanking } = req.body;

    // If id is being changed, check it isn't already taken by another format
    if (id && id !== existing.id) {
      const conflict = await prisma.formats.findUnique({ where: { id } });
      if (conflict) {
        return res.status(409).json({ error: `Format id "${id}" already exists` });
      }
    }

    const format = await prisma.formats.update({
      where: { uuid: req.params.uuid },
      data: {
        id:            id            ?? existing.id,
        h_res:         hRes         ?? existing.h_res,
        v_res:         vRes         ?? existing.v_res,
        frame_rate:    frameRate    ?? existing.frame_rate,
        is_interlaced: isInterlaced ?? existing.is_interlaced,
        blanking:      blanking     ?? existing.blanking,
        updated_at: new Date(),
      },
    });
    res.json(toCamelCase(format));
  } catch (error: any) {
    console.error('Failed to update format:', error);
    res.status(500).json({ error: 'Failed to update format' });
  }
});

// ─── DELETE /:uuid ────────────────────────────────────────────────────────────

router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.formats.findUnique({
      where: { uuid: req.params.uuid },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Format not found' });
    }
    if (existing.is_system) {
      return res.status(403).json({ error: 'System format presets cannot be deleted' });
    }
    await prisma.formats.delete({ where: { uuid: req.params.uuid } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete format:', error);
    res.status(500).json({ error: 'Failed to delete format' });
  }
});

export default router;
