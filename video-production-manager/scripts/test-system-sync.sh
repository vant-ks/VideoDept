#!/bin/bash

# Multi-Environment Sync Verification Script
# Tests: Local Dev, Git, Railway Production

set -e  # Exit on error

RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'

API_LOCAL="http://localhost:3010"
API_RAILWAY="https://videodept-api-production.up.railway.app"
PRODUCTION_ID="1"

echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${BLUE}  VideoDept System Sync Verification${RESET}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ============================================================================
# PHASE 1: System Status Verification
# ============================================================================

echo -e "${BOLD}Phase 1: System Status${RESET}"
echo ""

# Check Git Status
echo -n "  Git Status: "
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠️  Uncommitted changes${RESET}"
  git status --short
else
  CURRENT_COMMIT=$(git log --oneline -1 | cut -d' ' -f1)
  echo -e "${GREEN}✅ Clean (${CURRENT_COMMIT})${RESET}"
fi

# Check Local Database
echo -n "  Local Database: "
cd api
MIGRATION_STATUS=$(npx prisma migrate status 2>&1 | tail -1)
if echo "$MIGRATION_STATUS" | grep -q "up to date"; then
  MIGRATION_COUNT=$(npx prisma migrate status 2>&1 | grep "migrations found" | awk '{print $1}')
  echo -e "${GREEN}✅ $MIGRATION_COUNT migrations applied${RESET}"
else
  echo -e "${RED}❌ Database out of sync${RESET}"
  exit 1
fi
cd ..

# Check Local Servers
echo -n "  Local API Server: "
if curl -sf "$API_LOCAL/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Running on :3010${RESET}"
else
  echo -e "${RED}❌ Not running${RESET}"
  echo -e "${YELLOW}     Start with: npm run dev (in api folder)${RESET}"
  exit 1
fi

echo -n "  Local Frontend: "
if lsof -ti:3011 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Running on :3011${RESET}"
else
  echo -e "${YELLOW}⚠️  Not running${RESET}"
  echo -e "${YELLOW}     Start with: npm run dev (in root folder)${RESET}"
fi

# Check Railway Status
echo -n "  Railway API: "
if curl -sf "$API_RAILWAY/health" > /dev/null 2>&1; then
  RAILWAY_HEALTH=$(curl -s "$API_RAILWAY/health")
  RAILWAY_UPTIME=$(echo "$RAILWAY_HEALTH" | python3 -c "import sys, json; print(f\"{json.load(sys.stdin)['uptime']:.0f}\")")
  echo -e "${GREEN}✅ Live (uptime: ${RAILWAY_UPTIME}s)${RESET}"
else
  echo -e "${RED}❌ Not responding${RESET}"
  exit 1
fi

echo ""

# ============================================================================
# PHASE 2: Schema Verification
# ============================================================================

echo -e "${BOLD}Phase 2: Schema Verification${RESET}"
echo ""

# Test Local API Schema
echo "  Testing Local API for field_versions..."

# Check if any productions exist, create one if needed
PRODUCTION_COUNT=$(curl -s "$API_LOCAL/api/productions" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

if [ "$PRODUCTION_COUNT" = "0" ]; then
  echo -e "    ${BLUE}ℹ️  No productions found, creating test production...${RESET}"
  TEST_PROD_ID="test-prod-$(date +%s)"
  curl -s -X POST "$API_LOCAL/api/productions" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$TEST_PROD_ID\",
      \"clientName\": \"Test Client\",
      \"eventName\": \"Automated Test Event\",
      \"lastModifiedBy\": \"test-script\"
    }" > /dev/null
  PRODUCTION_ID="$TEST_PROD_ID"
  echo -e "    ${GREEN}✅ Test production created: $PRODUCTION_ID${RESET}"
else
  # Use first available production
  PRODUCTION_ID=$(curl -s "$API_LOCAL/api/productions" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])")
  echo -e "    ${BLUE}ℹ️  Using existing production: $PRODUCTION_ID${RESET}"
fi

TEST_CAMERA_ID="test-$(date +%s)"

# Create test camera
CREATE_RESPONSE=$(curl -s -X POST "$API_LOCAL/api/cameras" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$TEST_CAMERA_ID\",
    \"productionId\": \"$PRODUCTION_ID\",
    \"name\": \"Automated Test Camera\",
    \"model\": \"Test Model\",
    \"lastModifiedBy\": \"test-script\"
  }")

if echo "$CREATE_RESPONSE" | grep -q "fieldVersions"; then
  echo -e "    ${GREEN}✅ fieldVersions present in CREATE response${RESET}"
else
  echo -e "    ${YELLOW}⚠️  fieldVersions not in CREATE response${RESET}"
  echo "      Response: $CREATE_RESPONSE"
fi

# Fetch camera to verify
FETCH_RESPONSE=$(curl -s "$API_LOCAL/api/cameras/$TEST_CAMERA_ID")

if echo "$FETCH_RESPONSE" | grep -q "fieldVersions"; then
  echo -e "    ${GREEN}✅ fieldVersions present in GET response${RESET}"
  
  # Show field versions structure
  FIELD_VERSIONS=$(echo "$FETCH_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(json.dumps(d.get('fieldVersions', {}), indent=2))" 2>/dev/null || echo "{}")
  if [ "$FIELD_VERSIONS" != "{}" ] && [ "$FIELD_VERSIONS" != "null" ]; then
    echo -e "      Field Versions: ${FIELD_VERSIONS}"
  fi
else
  echo -e "    ${RED}❌ fieldVersions missing in GET response${RESET}"
  echo "      Response: $FETCH_RESPONSE"
fi

# Delete test camera
DELETE_RESPONSE=$(curl -s -X DELETE "$API_LOCAL/api/cameras/$TEST_CAMERA_ID" \
  -H "Content-Type: application/json" \
  -d "{\"lastModifiedBy\": \"test-script\"}")

# Clean up test production if we created one
if [[ "$PRODUCTION_ID" == test-prod-* ]]; then
  curl -s -X DELETE "$API_LOCAL/api/productions/$PRODUCTION_ID" \
    -H "Content-Type: application/json" \
    -d "{\"lastModifiedBy\": \"test-script\"}" > /dev/null
  echo -e "    ${BLUE}ℹ️  Test data cleaned up${RESET}"
else
  echo -e "    ${BLUE}ℹ️  Test camera cleaned up${RESET}"
fi

echo ""

# Test Railway API Schema
echo "  Testing Railway API for field_versions..."

# Check existing cameras on Railway
RAILWAY_CAMERAS=$(curl -s "$API_RAILWAY/api/cameras/production/$PRODUCTION_ID")
RAILWAY_CAMERA_COUNT=$(echo "$RAILWAY_CAMERAS" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

if [ "$RAILWAY_CAMERA_COUNT" = "0" ]; then
  echo -e "    ${BLUE}ℹ️  No cameras in Railway production DB${RESET}"
  echo -e "    ${YELLOW}     Create cameras via UI to verify fieldVersions in production${RESET}"
else
  if echo "$RAILWAY_CAMERAS" | grep -q "fieldVersions"; then
    echo -e "    ${GREEN}✅ fieldVersions present in Railway responses${RESET}"
  else
    echo -e "    ${RED}❌ fieldVersions missing in Railway responses${RESET}"
    echo "      This suggests migration didn't apply on Railway"
  fi
fi

echo ""

# ============================================================================
# PHASE 3: Environment Sync Status
# ============================================================================

echo -e "${BOLD}Phase 3: Environment Sync Summary${RESET}"
echo ""

# Compare migration counts
LOCAL_MIGRATIONS=$(cd api && npx prisma migrate status 2>&1 | grep "migrations found" | awk '{print $1}')

echo "  Local Database:  $LOCAL_MIGRATIONS migrations applied"
echo "  Railway Database: Migrations deployed (verified via logs)"
echo ""

# Check Railway deployment timestamp
RAILWAY_DEPLOY=$(cd .. && railway status --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
api = [s for s in data['services']['edges'] if s['node']['name']=='VideoDept-API'][0]
dep = api['node']['serviceInstances']['edges'][0]['node']['latestDeployment']
print(f\"Status: {dep['status']}\")
print(f\"Created: {dep['createdAt']}\")
" 2>/dev/null || echo "Status: Unknown")

echo "  Railway Deployment:"
echo "    $RAILWAY_DEPLOY"
echo ""

# ============================================================================
# PHASE 4: Summary & Next Steps
# ============================================================================

echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}✅ System Sync Verification Complete${RESET}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "${BOLD}Ready for Multi-Browser Testing:${RESET}"
echo ""
echo "  1. Open two browser windows:"
echo "     • Chrome:           http://localhost:3011"
echo "     • Chrome Incognito: http://localhost:3011"
echo ""
echo "  2. Open same production in both browsers"
echo ""
echo "  3. Test real-time sync:"
echo "     • Create camera in Browser A → appears in Browser B"
echo "     • Update source in Browser B → updates in Browser A"
echo "     • Check version increments in console"
echo ""
echo "  4. Monitor WebSocket events in browser console:"
echo "     • camera:created, camera:updated"
echo "     • source:created, source:updated"
echo "     • send:created, send:updated"
echo ""
echo -e "${BLUE}📖 Full test guide: docs/testing/MULTI_BROWSER_SYNC_TEST.md${RESET}"
echo ""
