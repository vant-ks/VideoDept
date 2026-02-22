import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Validation helper functions for API routes
 */

/**
 * Verify that a production exists in the database
 * Throws descriptive error if not found
 */
export async function validateProductionExists(productionId: string): Promise<void> {
  const production = await prisma.productions.findUnique({
    where: { id: productionId },
    select: { id: true, show_name: true, client: true, is_deleted: true }
  });

  if (!production) {
    throw new Error(
      `Production ${productionId} not found in database. ` +
      `This production may exist only in local cache. ` +
      `Please refresh the page or create a new production.`
    );
  }

  if (production.is_deleted) {
    throw new Error(
      `Production ${productionId} has been deleted. ` +
      `Cannot create entities for deleted productions.`
    );
  }
}

/**
 * Verify that an entity exists and belongs to the correct production
 */
export async function validateEntityExists(
  entityType: string,
  entityId: string,
  productionId?: string
): Promise<any> {
  let entity: any;

  switch (entityType) {
    case 'source':
      // Sources use id as PK, check is_deleted to exclude soft-deleted records
      entity = await prisma.sources.findFirst({ 
        where: { 
          id: entityId,
          is_deleted: false 
        } 
      });
      break;
    case 'camera':
      entity = await prisma.cameras.findUnique({ where: { id: entityId } });
      break;
    case 'ccu':
      entity = await prisma.ccus.findUnique({ where: { id: entityId } });
      break;
    case 'send':
      entity = await prisma.sends.findUnique({ where: { id: entityId } });
      break;
    // Add more as needed
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }

  if (!entity) {
    throw new Error(`${entityType} ${entityId} not found`);
  }

  if (productionId && entity.production_id !== productionId) {
    throw new Error(
      `${entityType} ${entityId} belongs to production ${entity.production_id}, ` +
      `not ${productionId}`
    );
  }

  return entity;
}

/**
 * Extract and validate common request fields
 */
export interface ValidatedRequestData {
  productionId: string;
  userId: string;
  userName: string;
  entityData: any;
}

export async function validateAndExtractRequestData(
  body: any,
  requireProduction: boolean = true
): Promise<ValidatedRequestData> {
  const { productionId, userId, userName, ...entityData } = body;

  // Validate required fields
  if (!userId) {
    throw new Error('userId is required');
  }

  if (requireProduction) {
    if (!productionId) {
      throw new Error('productionId is required');
    }
    
    // Verify production exists
    await validateProductionExists(productionId);
  }

  return {
    productionId,
    userId: userId || 'anonymous',
    userName: userName || 'Anonymous',
    entityData
  };
}
