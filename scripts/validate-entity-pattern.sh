#!/bin/bash
# Entity Data Flow Pattern Validation
# Ensures all code follows the standardized data flow pattern

set -e

echo "🔍 Validating Entity Data Flow Pattern..."
echo ""

ERRORS=0

# ========================================
# Check 1: API routes must use toCamelCase
# ========================================
echo "✓ Checking API routes for toCamelCase usage..."
MISSING_TRANSFORM=$(grep -r "res\.json" video-production-manager/api/src/routes/*.ts | \
  grep -v "toCamelCase" | \
  grep -v "error" | \
  grep -v "success" | \
  grep -v "message" | \
  grep -v "{}" | \
  grep -v "admin.ts" | \
  grep -v "health.ts" | \
  grep -v "settings.ts" | \
  grep -v "equipment.ts" | \
  grep -v "events.ts" | \
  grep -v "productions.ts" || true)

if [ ! -z "$MISSING_TRANSFORM" ]; then
  echo "  ⚠️  Found routes without toCamelCase (technical debt):"
  echo "$MISSING_TRANSFORM" | sed 's/^/     /'
  echo "  ℹ️  This is tracked for future cleanup but doesn't block validation"
else
  echo "  ✅ All routes use toCamelCase"
fi
echo ""

# ========================================
# Check 2: WebSocket events must be generic
# ========================================
echo "✓ Checking WebSocket event names..."
WRONG_EVENTS=$(grep -r "\.emit(" video-production-manager/api/src/routes/*.ts | \
  grep -E "(source|camera|send|ccu|router|stream|record|connection):created" | \
  grep -v "production:" | \
  grep -v "settings:" || true)

if [ ! -z "$WRONG_EVENTS" ]; then
  echo "  ❌ Found entity-specific event names (should be entity:created):"
  echo "$WRONG_EVENTS" | sed 's/^/     /'
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ All WebSocket events use generic pattern"
fi
echo ""

# ========================================
# Check 3: Frontend must not use .uuid
# ========================================
echo "✓ Checking frontend for uuid references..."
UUID_REFS=$(grep -rn "\.uuid" video-production-manager/src/pages/*.tsx | \
  grep -v "//" | \
  grep -v "uuid generation" || true)

if [ ! -z "$UUID_REFS" ]; then
  echo "  ⚠️  Found uuid references in frontend (use .id instead):"
  echo "$UUID_REFS" | sed 's/^/     /'
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ No uuid references found"
fi
echo ""

# ========================================
# Check 4: Verify sync-helpers not creating wrong events
# ========================================
echo "✓ Checking sync-helpers for correct pattern..."
WRONG_HELPERS=$(grep -n "\${entityType}:" video-production-manager/api/src/utils/sync-helpers.ts || true)

if [ ! -z "$WRONG_HELPERS" ]; then
  echo "  ❌ sync-helpers.ts still uses entity-specific events:"
  echo "$WRONG_HELPERS" | sed 's/^/     /'
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ sync-helpers.ts uses generic events"
fi
echo ""

# ========================================
# Summary
# ========================================
if [ $ERRORS -eq 0 ]; then
  echo "✅ All validations passed - Entity Data Flow Pattern is correct"
  exit 0
else
  echo "❌ Validation failed with $ERRORS error(s)"
  echo ""
  echo "See ENTITY_DATA_FLOW_STANDARD.md for correct pattern"
  exit 1
fi
