#!/bin/bash

# Batch Entity Generator
# Generates all missing entity infrastructure

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GENERATE_SCRIPT="$SCRIPT_DIR/generate-entity.sh"

echo "🚀 Batch Entity Generation"
echo "=========================="
echo ""

# Array of entities to generate
# Format: "EntityName:entityVar:entityPlural:ENTITY_ENUM"
ENTITIES=(
  "MediaServer:mediaServer:media-servers:MEDIA_SERVER"
  "Router:router:routers:ROUTER"
  "CableSnake:cableSnake:cable-snakes:CABLE_SNAKE"
  "Record:record:records:RECORD"
  "Stream:stream:streams:STREAM"
  "VisionSwitcher:visionSwitcher:vision-switchers:VIDEO_SWITCHER"
  "CamSwitcher:camSwitcher:cam-switchers:CAM_SWITCHER"
  "LEDScreen:ledScreen:led-screens:LED_SCREEN"
  "ProjectionScreen:projectionScreen:projection-screens:PROJECTION_SCREEN"
  "IPAddress:ipAddress:ip-addresses:IP_ADDRESS"
  "ChecklistItem:checklistItem:checklist-items:CHECKLIST_ITEM"
  "Connection:connection:connections:CONNECTION"
)

SUCCESS_COUNT=0
SKIP_COUNT=0

for ENTITY_SPEC in "${ENTITIES[@]}"; do
  IFS=':' read -r ENTITY_NAME ENTITY_VAR ENTITY_PLURAL ENTITY_ENUM <<< "$ENTITY_SPEC"
  
  echo "----------------------------------------"
  echo "Generating: $ENTITY_NAME"
  echo "----------------------------------------"
  
  if "$GENERATE_SCRIPT" "$ENTITY_NAME" "$ENTITY_VAR" "$ENTITY_PLURAL" "$ENTITY_ENUM"; then
    ((SUCCESS_COUNT++))
  else
    echo "⚠️  Skipped or failed: $ENTITY_NAME"
    ((SKIP_COUNT++))
  fi
  
  echo ""
done

echo "========================================"
echo "✅ Batch generation complete!"
echo "   - Generated: $SUCCESS_COUNT"
echo "   - Skipped: $SKIP_COUNT"
echo "========================================"
echo ""
echo "⚠️  Important: Database schema updates needed!"
echo ""
echo "Next steps:"
echo "1. Review api/prisma/schema.prisma for missing models:"
echo "   - MediaServer, Router, CableSnake, Record, Stream"
echo "   - VisionSwitcher, CamSwitcher, LEDScreen, ProjectionScreen"
echo ""
echo "2. Ensure EventType enum has all entries:"
echo "   - MEDIA_SERVER, ROUTER, CABLE_SNAKE, RECORD, STREAM"
echo "   - VIDEO_SWITCHER, CAM_SWITCHER, LED_SCREEN, PROJECTION_SCREEN"
echo "   - IP_ADDRESS, CHECKLIST_ITEM, CONNECTION"
echo ""
echo "3. Run migration:"
echo "   cd api && npx prisma migrate dev --name add-all-entities"
echo ""
echo "4. Update frontend pages to use new API hooks"
echo ""
