/**
 * Health Check & Diagnostics Endpoint
 * Provides detailed system status for monitoring and debugging
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Basic health check
 */
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: true,
        latency: `${dbLatency}ms`,
      },
      deployTest: 'db-reset-verification-2026-02-10-16:42',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Detailed diagnostics (for admin/dev use)
 */
router.get('/health/diagnostics', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Database connection test
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;
    
    // Count records in key tables
    const [
      productionCount,
      checklistItemCount,
      sourceCount,
      sendCount,
    ] = await Promise.all([
      prisma.productions.count(),
      prisma.checklist_items.count(),
      prisma.sources.count(),
      prisma.sends.count(),
    ]);
    
    // System info
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      
      database: {
        connected: true,
        latency: `${dbLatency}ms`,
        url: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'), // Hide password
        tables: {
          productions: productionCount,
          checklist_items: checklistItemCount,
          sources: sourceCount,
          sends: sendCount,
        },
      },
      
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        },
        cpuUsage: process.cpuUsage(),
      },
      
      features: {
        fieldLevelVersioning: false, // Will be enabled in Phase 1
        websocketSync: true,
        conflictDetection: true,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

export default router;
