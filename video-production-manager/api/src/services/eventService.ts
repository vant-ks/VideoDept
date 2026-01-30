/**
 * Event Service
 * Records all entity changes for sync, audit, and collaboration
 */

import { PrismaClient, EventType, EventOperation } from '@prisma/client';

const prisma = new PrismaClient();

export interface RecordEventParams {
  productionId: string;
  eventType: EventType;
  operation: EventOperation;
  entityId: string;
  entityData?: any; // Full entity snapshot after change
  changes?: any; // Diff of what changed (optional)
  userId: string;
  userName?: string;
  version?: number; // Entity version (default 1)
}

/**
 * Record a change event
 */
export async function recordEvent(params: RecordEventParams) {
  const {
    productionId,
    eventType,
    operation,
    entityId,
    entityData,
    changes,
    userId,
    userName,
    version = 1
  } = params;

  try {
    const event = await prisma.event.create({
      data: {
        productionId,
        eventType,
        operation,
        entityId,
        entityData: entityData || null,
        changes: changes || null,
        userId,
        userName,
        version,
        timestamp: new Date()
      }
    });

    console.log(`📝 Event recorded: ${operation} ${eventType} ${entityId} by ${userName || userId}`);
    return event;
  } catch (error) {
    console.error('Failed to record event:', error);
    throw error;
  }
}

/**
 * Get all events for a production
 */
export async function getProductionEvents(productionId: string, limit = 100) {
  return prisma.event.findMany({
    where: { productionId },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
}

/**
 * Get events for a specific entity
 */
export async function getEntityEvents(productionId: string, entityId: string) {
  return prisma.event.findMany({
    where: {
      productionId,
      entityId
    },
    orderBy: { timestamp: 'desc' }
  });
}

/**
 * Get events since a timestamp (for incremental sync)
 */
export async function getEventsSince(productionId: string, since: Date) {
  return prisma.event.findMany({
    where: {
      productionId,
      timestamp: {
        gt: since
      }
    },
    orderBy: { timestamp: 'asc' }
  });
}

/**
 * Calculate diff between old and new entity (simple version)
 */
export function calculateDiff(oldEntity: any, newEntity: any): any {
  if (!oldEntity) return { all: 'created' };
  
  const changes: any = {};
  const allKeys = new Set([...Object.keys(oldEntity), ...Object.keys(newEntity)]);
  
  for (const key of allKeys) {
    if (JSON.stringify(oldEntity[key]) !== JSON.stringify(newEntity[key])) {
      changes[key] = {
        from: oldEntity[key],
        to: newEntity[key]
      };
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}
