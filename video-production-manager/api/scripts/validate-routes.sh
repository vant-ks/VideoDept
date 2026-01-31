#!/bin/bash

# Route Validation Script
# Validates that all route files reference valid Prisma models

set -e

API_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔍 Validating route files..."
echo ""

cd "$API_DIR"

# Get all Prisma models from the client
MODELS=$(node -e "
  try {
    const {PrismaClient} = require('@prisma/client');
    const p = new PrismaClient();
    const models = Object.keys(p).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    console.log(models.join('|'));
  } catch (e) {
    console.error('Error loading Prisma Client:', e.message);
    process.exit(1);
  }
" 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Failed to load Prisma Client"
  echo "$MODELS"
  exit 1
fi

echo "✓ Found Prisma models: $(echo $MODELS | tr '|' ', ')"
echo ""

ERRORS=0
WARNINGS=0

# Check each route file
for route in src/routes/*.ts; do
  if [ ! -f "$route" ]; then
    continue
  fi
  
  filename=$(basename "$route")
  echo "Checking $filename..."
  
  # Find all prisma.* method calls
  prisma_calls=$(grep -oE 'prisma\.[a-zA-Z_]+' "$route" || true)
  
  if [ -z "$prisma_calls" ]; then
    echo "  ⚠️  No Prisma calls found"
    WARNINGS=$((WARNINGS + 1))
    continue
  fi
  
  # Check each call
  while IFS= read -r call; do
    model=${call#prisma.}
    
    if echo "$MODELS" | grep -qw "$model"; then
      echo "  ✓ $model (valid)"
    else
      echo "  ❌ $model (INVALID - model does not exist)"
      ERRORS=$((ERRORS + 1))
    fi
  done <<< "$prisma_calls"
  
  echo ""
done

echo "=================================="
echo "Validation Complete"
echo "=================================="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ All route files are valid"
  exit 0
else
  echo "❌ Found $ERRORS errors - route files reference non-existent Prisma models"
  echo ""
  echo "Fix by either:"
  echo "  1. Creating the missing database tables and running 'npx prisma db push'"
  echo "  2. Commenting out the routes in src/server.ts"
  echo "  3. Deleting the invalid route files"
  exit 1
fi
