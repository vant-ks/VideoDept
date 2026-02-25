#!/bin/bash
# Systematic UUID Migration Fix for All Entity Routes
# Updates all route files to use uuid instead of id for primary key lookups

# Get the script's directory and navigate to routes folder
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROUTES_DIR="$SCRIPT_DIR/../video-production-manager/api/src/routes"
UTILS_DIR="$SCRIPT_DIR/../video-production-manager/api/src/utils"

cd "$ROUTES_DIR" || { echo "❌ Could not find routes directory"; exit 1; }

echo "🔄 Updating all entity routes to use UUID pattern..."
echo "📂 Working in: $ROUTES_DIR"
echo ""

# List of entity route files that need updating (excluding sources.ts which is already fixed)
files=(
  "cable-snakes.ts"
  "cam-switchers.ts"
  "cameras.ts"
  "ccus.ts"
  "checklist-items.ts"
  "connections.ts"
  "equipment.ts"
  "ip-addresses.ts"
  "led-screens.ts"
  "media-servers.ts"
  "projection-screens.ts"
  "records.ts"
  "routers.ts"
  "sends.ts"
  "streams.ts"
  "vision-switchers.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  📝 Updating $file..."
    
    # Update route parameters from /:id to /:uuid (for GET, PUT, PATCH, DELETE)
    sed -i '' "s|router\.get('/:id'|router.get('/:uuid'|g" "$file"
    sed -i '' "s|router\.put('/:id'|router.put('/:uuid'|g" "$file"
    sed -i '' "s|router\.patch('/:id'|router.patch('/:uuid'|g" "$file"
    sed -i '' "s|router\.delete('/:id'|router.delete('/:uuid'|g" "$file"
    
    # Update destructured params: const { id } = req.params -> const { uuid } = req.params
    sed -i '' "s|const { id } = req\.params|const { uuid } = req.params|g" "$file"
    
    # Update Prisma where clauses with all patterns:
    # where: { id: req.params.id } -> where: { uuid: req.params.uuid }
    sed -i '' "s|where: { id: req\.params\.id }|where: { uuid: req.params.uuid }|g" "$file"
    
    # where: { id } -> where: { uuid }
    sed -i '' "s|where: { id }|where: { uuid }|g" "$file"
    
    # where: { id }, -> where: { uuid },
    sed -i '' "s|where: { id },|where: { uuid },|g" "$file"
    
    # Update any other references to req.params.id to req.params.uuid
    sed -i '' "s|req\.params\.id|req.params.uuid|g" "$file"
    
    # Update entityId references in event recording and broadcasting
    # entityId: id, -> entityId: uuid,
    sed -i '' "s|entityId: id,|entityId: uuid,|g" "$file"
    # entityId: id } or entityId: id} (at end of object)
    sed -i '' "s|entityId: id}|entityId: uuid}|g" "$file"
    sed -i '' "s|entityId: id }|entityId: uuid }|g" "$file"
    
    # Update console.log references
    sed -i '' "s|: id, '|: uuid, '|g" "$file"
    sed -i '' "s|: id)|: uuid)|g" "$file"
    
    # Update console.error references
    sed -i '' "s|', id)|', uuid)|g" "$file"
    
    echo "  ✅ $file updated"
  else
    echo "  ⚠️  $file not found, skipping"
  fi
done

# Also update validation-helpers.ts
echo ""
echo "  📝 Updating validation-helpers.ts..."
cd "$UTILS_DIR" || { echo "❌ Could not find utils directory"; exit 1; }

if [ -f "validation-helpers.ts" ]; then
  # Update validation helper where clauses: { id: entityId } -> { uuid: entityId }
  sed -i '' "s|{ id: entityId }|{ uuid: entityId }|g" "validation-helpers.ts"
  echo "  ✅ validation-helpers.ts updated"
else
  echo "  ⚠️  validation-helpers.ts not found"
fi

echo ""
echo "✅ All entity routes updated to use UUID pattern"
echo "🔍 Please review the changes and test locally before deploying"
