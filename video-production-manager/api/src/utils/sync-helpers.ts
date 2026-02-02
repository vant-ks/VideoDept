import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Utility functions for field-level versioning and real-time sync
 */

export interface VersionedUpdate {
  version: number;
  lastModifiedBy?: string | null;
  syncedAt?: Date;
}

export interface BroadcastOptions {
  io: SocketIOServer;
  productionId: string;
  entityType: string;
  entityId: string;
  data: any;
}

/**
 * Broadcast entity update to WebSocket room
 * Emits to production-specific room for real-time sync
 */
export function broadcastEntityUpdate(options: BroadcastOptions): void {
  const { io, productionId, entityType, entityId, data } = options;
  
  const room = `production:${productionId}`;
  const event = `${entityType}:updated`;
  
  console.log(`📡 Broadcasting ${event} to room ${room}`, {
    entityId,
    version: data.version,
    lastModifiedBy: data.last_modified_by || data.lastModifiedBy
  });
  
  io.to(room).emit(event, data);
}

/**
 * Broadcast entity creation to WebSocket room
 */
export function broadcastEntityCreated(options: BroadcastOptions): void {
  const { io, productionId, entityType, entityId, data } = options;
  
  const room = `production:${productionId}`;
  const event = `${entityType}:created`;
  
  console.log(`📡 Broadcasting ${event} to room ${room}`, {
    entityId,
    version: data.version
  });
  
  io.to(room).emit(event, data);
}

/**
 * Broadcast entity deletion to WebSocket room
 */
export function broadcastEntityDeleted(options: Omit<BroadcastOptions, 'data'> & { data?: any }): void {
  const { io, productionId, entityType, entityId, data } = options;
  
  const room = `production:${productionId}`;
  const event = `${entityType}:deleted`;
  
  console.log(`📡 Broadcasting ${event} to room ${room}`, {
    entityId
  });
  
  io.to(room).emit(event, { id: entityId, ...data });
}

/**
 * Increment version and set modification metadata
 * Returns update data for Prisma
 */
export function prepareVersionedUpdate(lastModifiedBy?: string): any {
  return {
    version: { increment: 1 },
    lastModifiedBy: lastModifiedBy || null,
    syncedAt: new Date()
  };
}

/**
 * Extract common versioning fields from request body
 */
export interface VersioningFields {
  version?: number;
  lastModifiedBy?: string;
}

export function extractVersioningFields(body: any): VersioningFields {
  return {
    version: body.version,
    lastModifiedBy: body.lastModifiedBy || body.last_modified_by
  };
}

/**
 * Create standard versioning response metadata
 */
export function createVersionMetadata(entity: any) {
  return {
    version: entity.version,
    lastModifiedBy: entity.last_modified_by || entity.lastModifiedBy,
    updatedAt: entity.updated_at || entity.updatedAt,
    syncedAt: entity.synced_at || entity.syncedAt
  };
}
