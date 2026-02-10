/**
 * Admin Testing Endpoints
 * 
 * Provides testing utilities for field-level versioning and concurrent editing scenarios.
 * These endpoints are for development/testing only.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { logger, LogCategory } from '../utils/logger';
import { 
  mergeNonConflictingFields, 
  FieldVersions 
} from '../utils/fieldVersioning';

const router = Router();

/**
 * POST /api/admin/test-field-conflict
 * 
 * Simulates concurrent editing scenario for testing field-level conflict detection.
 * 
 * Request body:
 * {
 *   productionId: string,
 *   userA: { fieldName: string, value: any, field_versions: FieldVersions },
 *   userB: { fieldName: string, value: any, field_versions: FieldVersions }
 * }
 * 
 * Returns:
 * - Conflict detection results
 * - Merge outcome
 * - Which user's change would win/lose
 */
router.post('/test-field-conflict', async (req: Request, res: Response) => {
  const requestId = logger.generateRequestId();
  
  try {
    const { productionId, userA, userB } = req.body;
    
    logger.admin(LogCategory.API, 'POST /admin/test-field-conflict', {
      requestId,
      productionId,
      userA_field: userA.fieldName,
      userB_field: userB.fieldName
    });
    
    // Validate input
    if (!productionId || !userA || !userB) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['productionId', 'userA', 'userB']
      });
    }
    
    // Get current production state
    const production = await prisma.productions.findUnique({
      where: { id: productionId }
    });
    
    if (!production || production.is_deleted) {
      return res.status(404).json({ error: 'Production not found' });
    }
    
    const serverFieldVersions = (production.field_versions as unknown) as FieldVersions || {};
    const serverData = { ...production };
    
    // Simulate User A's update
    const userAData: Record<string, any> = {};
    userAData[userA.fieldName] = userA.value;
    
    const userAResult = mergeNonConflictingFields(
      userA.field_versions,
      serverFieldVersions,
      userAData,
      serverData
    );
    
    // Simulate User B's update (assuming User A's update happened first)
    const userBData: Record<string, any> = {};
    userBData[userB.fieldName] = userB.value;
    
    const userBResult = mergeNonConflictingFields(
      userB.field_versions,
      userAResult.mergedVersions, // User B sees User A's updated versions
      userBData,
      userAResult.mergedData
    );
    
    // Analyze scenario
    const scenario = {
      sameField: userA.fieldName === userB.fieldName,
      userA_conflicts: userAResult.hasConflicts,
      userB_conflicts: userBResult.hasConflicts,
    };
    
    const outcome = {
      scenario,
      userA: {
        submitted: userAData,
        conflicts: userAResult.conflicts,
        success: !userAResult.hasConflicts,
        message: !userAResult.hasConflicts 
          ? 'User A update would succeed'
          : 'User A has conflicts (stale data)'
      },
      userB: {
        submitted: userBData,
        conflicts: userBResult.conflicts,
        success: !userBResult.hasConflicts,
        message: !userBResult.hasConflicts
          ? scenario.sameField 
            ? 'User B would get conflict (User A already updated this field)'
            : 'User B update would succeed (different field)'
          : 'User B has conflicts'
      },
      finalState: userBResult.hasConflicts ? userAResult.mergedData : userBResult.mergedData,
      finalVersions: userBResult.hasConflicts ? userAResult.mergedVersions : userBResult.mergedVersions,
      explanation: scenario.sameField
        ? 'Both users editing same field: First save wins, second gets 409 conflict'
        : 'Users editing different fields: Both succeed, changes merge automatically'
    };
    
    logger.tech(LogCategory.SYNC, 'Field conflict test completed', {
      requestId,
      productionId,
      scenario: scenario.sameField ? 'same-field' : 'different-fields',
      userA_success: outcome.userA.success,
      userB_success: outcome.userB.success
    });
    
    res.json(outcome);
    
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to test field conflict', error, { requestId });
    res.status(500).json({ error: 'Failed to test field conflict' });
  }
});

/**
 * POST /api/admin/simulate-concurrent-edits
 * 
 * Simulates a more complex scenario with multiple users editing different fields.
 * 
 * Request body:
 * {
 *   productionId: string,
 *   edits: Array<{
 *     userId: string,
 *     fieldName: string,
 *     value: any,
 *     field_versions: FieldVersions
 *   }>
 * }
 */
router.post('/simulate-concurrent-edits', async (req: Request, res: Response) => {
  const requestId = logger.generateRequestId();
  
  try {
    const { productionId, edits } = req.body;
    
    logger.admin(LogCategory.API, 'POST /admin/simulate-concurrent-edits', {
      requestId,
      productionId,
      editCount: edits?.length
    });
    
    if (!productionId || !Array.isArray(edits) || edits.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['productionId', 'edits (array)']
      });
    }
    
    // Get current production state
    const production = await prisma.productions.findUnique({
      where: { id: productionId }
    });
    
    if (!production || production.is_deleted) {
      return res.status(404).json({ error: 'Production not found' });
    }
    
    let currentFieldVersions = (production.field_versions as unknown) as FieldVersions || {};
    let currentData: any = { ...production };
    const results: any[] = [];
    
    // Process each edit sequentially (simulating concurrent arrival at server)
    for (const edit of edits) {
      const editData: Record<string, any> = {};
      editData[edit.fieldName] = edit.value;
      
      const result = mergeNonConflictingFields(
        edit.field_versions,
        currentFieldVersions,
        editData,
        currentData
      );
      
      results.push({
        userId: edit.userId,
        fieldName: edit.fieldName,
        value: edit.value,
        hasConflicts: result.hasConflicts,
        conflicts: result.conflicts,
        success: !result.hasConflicts
      });
      
      // If successful, update state for next edit
      if (!result.hasConflicts) {
        currentFieldVersions = result.mergedVersions;
        currentData = result.mergedData;
      }
    }
    
    const summary = {
      totalEdits: edits.length,
      successful: results.filter(r => r.success).length,
      conflicts: results.filter(r => !r.success).length,
      results,
      finalState: currentData,
      finalVersions: currentFieldVersions
    };
    
    logger.tech(LogCategory.SYNC, 'Concurrent edits simulation completed', {
      requestId,
      productionId,
      successful: summary.successful,
      conflicts: summary.conflicts
    });
    
    res.json(summary);
    
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to simulate concurrent edits', error, { requestId });
    res.status(500).json({ error: 'Failed to simulate concurrent edits' });
  }
});

/**
 * GET /api/admin/field-versions/:id
 * 
 * Get current field versions for a production (useful for testing)
 */
router.get('/field-versions/:id', async (req: Request, res: Response) => {
  const requestId = logger.generateRequestId();
  const productionId = req.params.id;
  
  try {
    logger.admin(LogCategory.API, `GET /admin/field-versions/${productionId}`, {
      requestId,
      productionId
    });
    
    const production = await prisma.productions.findUnique({
      where: { id: productionId },
      select: {
        id: true,
        version: true,
        field_versions: true,
        updated_at: true
      }
    });
    
    if (!production || (production as any).is_deleted) {
      return res.status(404).json({ error: 'Production not found' });
    }
    
    res.json({
      productionId: production.id,
      recordVersion: production.version,
      fieldVersions: production.field_versions,
      lastUpdated: production.updated_at
    });
    
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to get field versions', error, { requestId, productionId });
    res.status(500).json({ error: 'Failed to get field versions' });
  }
});

export default router;
