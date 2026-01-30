#!/bin/bash

# Entity Generator Script
# Usage: ./generate-entity.sh <EntityName> <entityName> <entityPlural> <ENTITY_ENUM>
# Example: ./generate-entity.sh Router router routers ROUTER

set -e

ENTITY_NAME=$1      # PascalCase: Router
ENTITY_VAR=$2       # camelCase: router
ENTITY_PLURAL=$3    # plural: routers
ENTITY_ENUM=$4      # SCREAMING_SNAKE: ROUTER

if [ -z "$ENTITY_NAME" ] || [ -z "$ENTITY_VAR" ] || [ -z "$ENTITY_PLURAL" ] || [ -z "$ENTITY_ENUM" ]; then
  echo "❌ Usage: $0 <EntityName> <entityName> <entityPlural> <ENTITY_ENUM>"
  echo "Example: $0 Router router routers ROUTER"
  exit 1
fi

API_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$(cd "$API_DIR/.." && pwd)"

echo "🚀 Generating entity: $ENTITY_NAME"
echo "   - Variable name: $ENTITY_VAR"
echo "   - Plural: $ENTITY_PLURAL"
echo "   - Enum: $ENTITY_ENUM"
echo ""

# =============================================================================
# Step 1: Create API Route
# =============================================================================

ROUTE_FILE="$API_DIR/src/routes/$ENTITY_PLURAL.ts"

if [ -f "$ROUTE_FILE" ]; then
  echo "⚠️  Route file already exists: $ROUTE_FILE"
else
  echo "📝 Creating API route: $ROUTE_FILE"
  
  cat > "$ROUTE_FILE" << 'ROUTE_EOF'
import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { recordEvent } from '../services/eventService';
import { EventType, EventOperation } from '@prisma/client';

const router = Router();

// Get all ENTITY_PLURAL for a production
router.get('/production/:productionId', async (req: Request, res: Response) => {
  try {
    const { productionId } = req.params;
    
    const ENTITY_PLURAL = await prisma.ENTITY_VAR.findMany({
      where: {
        productionId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(ENTITY_PLURAL);
  } catch (error) {
    console.error('Error fetching ENTITY_PLURAL:', error);
    res.status(500).json({ error: 'Failed to fetch ENTITY_PLURAL' });
  }
});

// Create ENTITY_VAR
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, ...ENTITY_VAR_data } = req.body;
    
    const ENTITY_VAR = await prisma.ENTITY_VAR.create({
      data: ENTITY_VAR_data
    });
    
    // Record event
    await recordEvent({
      productionId: ENTITY_VAR.productionId,
      eventType: EventType.ENTITY_ENUM,
      operation: EventOperation.CREATE,
      entityId: ENTITY_VAR.id,
      entityData: ENTITY_VAR,
      userId: userId || 'system',
      userName: userName || 'System',
      version: ENTITY_VAR.version
    });
    
    // Broadcast to production room
    io.to(`production:${ENTITY_VAR.productionId}`).emit('entity:created', {
      entityType: 'ENTITY_VAR',
      entity: ENTITY_VAR,
      userId,
      userName
    });
    
    res.status(201).json(ENTITY_VAR);
  } catch (error) {
    console.error('Error creating ENTITY_VAR:', error);
    res.status(500).json({ error: 'Failed to create ENTITY_VAR' });
  }
});

// Update ENTITY_VAR
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version: clientVersion, userId, userName, ...updates } = req.body;
    
    // Get current version for conflict detection
    const current = await prisma.ENTITY_VAR.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'ENTITY_NAME not found' });
    }
    
    // Check for version conflict
    if (clientVersion !== undefined && current.version !== clientVersion) {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'This ENTITY_VAR has been modified by another user. Please refresh and try again.',
        currentVersion: current.version,
        clientVersion
      });
    }
    
    // Update with incremented version
    const ENTITY_VAR = await prisma.ENTITY_VAR.update({
      where: { id },
      data: {
        ...updates,
        version: current.version + 1
      }
    });
    
    // Calculate diff and record event
    const { recordEvent: recordEventFn, calculateDiff } = await import('../services/eventService');
    const changes = calculateDiff(current, ENTITY_VAR);
    
    await recordEventFn({
      productionId: ENTITY_VAR.productionId,
      eventType: EventType.ENTITY_ENUM,
      operation: EventOperation.UPDATE,
      entityId: ENTITY_VAR.id,
      entityData: ENTITY_VAR,
      changes,
      userId: userId || 'system',
      userName: userName || 'System',
      version: ENTITY_VAR.version
    });
    
    // Broadcast to production room
    io.to(`production:${ENTITY_VAR.productionId}`).emit('entity:updated', {
      entityType: 'ENTITY_VAR',
      entity: ENTITY_VAR,
      userId,
      userName
    });
    
    res.json(ENTITY_VAR);
  } catch (error) {
    console.error('Error updating ENTITY_VAR:', error);
    res.status(500).json({ error: 'Failed to update ENTITY_VAR' });
  }
});

// Delete ENTITY_VAR (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    
    const current = await prisma.ENTITY_VAR.findUnique({ where: { id } });
    
    if (!current) {
      return res.status(404).json({ error: 'ENTITY_NAME not found' });
    }
    
    // Soft delete
    await prisma.ENTITY_VAR.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Record event
    await recordEvent({
      productionId: current.productionId,
      eventType: EventType.ENTITY_ENUM,
      operation: EventOperation.DELETE,
      entityId: id,
      entityData: current,
      userId: userId || 'system',
      userName: userName || 'System',
      version: current.version
    });
    
    // Broadcast to production room
    io.to(`production:${current.productionId}`).emit('entity:deleted', {
      entityType: 'ENTITY_VAR',
      entityId: id,
      userId,
      userName
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting ENTITY_VAR:', error);
    res.status(500).json({ error: 'Failed to delete ENTITY_VAR' });
  }
});

export default router;
ROUTE_EOF

  # Replace placeholders
  sed -i '' "s/ENTITY_NAME/$ENTITY_NAME/g" "$ROUTE_FILE"
  sed -i '' "s/ENTITY_VAR/$ENTITY_VAR/g" "$ROUTE_FILE"
  sed -i '' "s/ENTITY_PLURAL/$ENTITY_PLURAL/g" "$ROUTE_FILE"
  sed -i '' "s/ENTITY_ENUM/$ENTITY_ENUM/g" "$ROUTE_FILE"
  
  echo "✅ Created API route"
fi

# =============================================================================
# Step 2: Create API Hook
# =============================================================================

HOOK_FILE="$FRONTEND_DIR/src/hooks/use${ENTITY_NAME}API.ts"

if [ -f "$HOOK_FILE" ]; then
  echo "⚠️  Hook file already exists: $HOOK_FILE"
else
  echo "📝 Creating API hook: $HOOK_FILE"
  
  cat > "$HOOK_FILE" << 'HOOK_EOF'
import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface ENTITY_NAME {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface ENTITY_NAMEInput {
  productionId: string;
  name: string;
  version?: number;
  // Add other fields as needed
}

interface ConflictError {
  error: string;
  message: string;
  currentVersion: number;
  clientVersion: number;
}

function getUserInfo() {
  return {
    userId: localStorage.getItem('user_id') || 'anonymous',
    userName: localStorage.getItem('user_name') || 'Anonymous User'
  };
}

export function use${ENTITY_NAME}API() {
  const fetch${ENTITY_NAME}s = useCallback(async (productionId: string): Promise<ENTITY_NAME[]> => {
    try {
      return await apiClient.get<ENTITY_NAME[]>(`/ENTITY_PLURAL/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching ENTITY_PLURAL:', error);
      throw error;
    }
  }, []);

  const create${ENTITY_NAME} = useCallback(async (input: ENTITY_NAMEInput): Promise<ENTITY_NAME> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<ENTITY_NAME>('/ENTITY_PLURAL', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating ENTITY_VAR:', error);
      throw error;
    }
  }, []);

  const update${ENTITY_NAME} = useCallback(async (
    id: string,
    updates: Partial<ENTITY_NAMEInput>
  ): Promise<ENTITY_NAME | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<ENTITY_NAME>(`/ENTITY_PLURAL/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating ENTITY_VAR:', error);
      throw error;
    }
  }, []);

  const delete${ENTITY_NAME} = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/ENTITY_PLURAL/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting ENTITY_VAR:', error);
      throw error;
    }
  }, []);

  return {
    fetch${ENTITY_NAME}s,
    create${ENTITY_NAME},
    update${ENTITY_NAME},
    delete${ENTITY_NAME}
  };
}
HOOK_EOF

  # Replace placeholders
  sed -i '' "s/ENTITY_NAME/$ENTITY_NAME/g" "$HOOK_FILE"
  sed -i '' "s/ENTITY_VAR/$ENTITY_VAR/g" "$HOOK_FILE"
  sed -i '' "s/ENTITY_PLURAL/$ENTITY_PLURAL/g" "$HOOK_FILE"
  
  echo "✅ Created API hook"
fi

# =============================================================================
# Step 3: Register route in server.ts
# =============================================================================

echo "📝 Registering route in server.ts"

SERVER_FILE="$API_DIR/src/server.ts"

# Check if route already registered
if grep -q "import ${ENTITY_VAR}Router from './routes/${ENTITY_PLURAL}'" "$SERVER_FILE"; then
  echo "⚠️  Route already registered in server.ts"
else
  # Find the last import statement for routes
  LAST_ROUTE_IMPORT=$(grep -n "import.*Router from './routes/" "$SERVER_FILE" | tail -1 | cut -d: -f1)
  
  # Insert new import after last route import
  sed -i '' "${LAST_ROUTE_IMPORT}a\\
import ${ENTITY_VAR}Router from './routes/${ENTITY_PLURAL}';
" "$SERVER_FILE"
  
  # Find where routes are registered (look for app.use('/api/')
  LAST_ROUTE_USE=$(grep -n "app.use('/api/" "$SERVER_FILE" | tail -1 | cut -d: -f1)
  
  # Insert new route registration
  sed -i '' "${LAST_ROUTE_USE}a\\
app.use('/api/${ENTITY_PLURAL}', ${ENTITY_VAR}Router);
" "$SERVER_FILE"
  
  echo "✅ Registered route in server.ts"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "✅ Entity generation complete!"
echo ""
echo "Next steps:"
echo "1. Add $ENTITY_NAME model to prisma/schema.prisma if not exists"
echo "2. Add $ENTITY_ENUM to EventType enum in schema.prisma"
echo "3. Run: npx prisma migrate dev --name add-$ENTITY_VAR"
echo "4. Update your page component to use use${ENTITY_NAME}API hook"
echo "5. Add useProductionEvents for real-time sync"
echo ""
echo "Example usage in page:"
echo "  const ${ENTITY_VAR}sAPI = use${ENTITY_NAME}API();"
echo "  const [${ENTITY_PLURAL}, set${ENTITY_NAME}s] = useState<${ENTITY_NAME}[]>([]);"
echo "  "
echo "  useEffect(() => {"
echo "    ${ENTITY_VAR}sAPI.fetch${ENTITY_NAME}s(productionId).then(set${ENTITY_NAME}s);"
echo "  }, [productionId]);"
echo ""
