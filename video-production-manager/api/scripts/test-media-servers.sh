#!/bin/bash
# Automated test for media server creation
# Tests both API endpoint and database persistence

set -e  # Exit on error

API_URL="${API_URL:-http://localhost:3010}"
PRODUCTION_ID="${PRODUCTION_ID:-447902cb-5ade-4756-b181-82b741cd1a40}"

echo "🧪 Testing Media Server Creation"
echo "================================"
echo ""

# Test 1: Create a media server pair (A server)
echo "📝 Test 1: Creating Media Server A..."
RESPONSE_A=$(curl -s -X POST "$API_URL/api/media-servers" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"AUTO-TEST-1A\",
    \"name\": \"Automated Test Server 1A\",
    \"pairNumber\": 100,
    \"isBackup\": false,
    \"platform\": \"Watchout\",
    \"outputs\": [
      {
        \"id\": \"TEST-1A-OUT1\",
        \"name\": \"AUTO 1A.1\",
        \"type\": \"DP\",
        \"resolution\": {\"width\": 1920, \"height\": 1080},
        \"frameRate\": 59.94
      }
    ],
    \"note\": \"Automated test A server\",
    \"productionId\": \"$PRODUCTION_ID\",
    \"userId\": \"autotest\",
    \"userName\": \"Automated Test\"
  }")

UUID_A=$(echo "$RESPONSE_A" | jq -r '.uuid')
if [ -z "$UUID_A" ] || [ "$UUID_A" == "null" ]; then
  echo "❌ FAILED: No UUID returned for A server"
  echo "Response: $RESPONSE_A"
  exit 1
fi
echo "✅ Server A created with UUID: $UUID_A"

# Test 2: Create backup server (B server)
echo ""
echo "📝 Test 2: Creating Media Server B (backup)..."
RESPONSE_B=$(curl -s -X POST "$API_URL/api/media-servers" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"AUTO-TEST-1B\",
    \"name\": \"Automated Test Server 1B\",
    \"pairNumber\": 100,
    \"isBackup\": true,
    \"platform\": \"Watchout\",
    \"outputs\": [
      {
        \"id\": \"TEST-1B-OUT1\",
        \"name\": \"AUTO 1B.1\",
        \"type\": \"DP\",
        \"resolution\": {\"width\": 1920, \"height\": 1080},
        \"frameRate\": 59.94
      }
    ],
    \"note\": \"Automated test B server\",
    \"productionId\": \"$PRODUCTION_ID\",
    \"userId\": \"autotest\",
    \"userName\": \"Automated Test\"
  }")

UUID_B=$(echo "$RESPONSE_B" | jq -r '.uuid')
if [ -z "$UUID_B" ] || [ "$UUID_B" == "null" ]; then
  echo "❌ FAILED: No UUID returned for B server"
  echo "Response: $RESPONSE_B"
  exit 1
fi
echo "✅ Server B created with UUID: $UUID_B"

# Test 3: Verify servers exist in database
echo ""
echo "📝 Test 3: Verifying servers exist in database..."
cd "$(dirname "$0")/.."
DB_CHECK=$(npx prisma db execute --stdin <<SQL
SELECT id, uuid, pair_number, is_backup, platform 
FROM media_servers 
WHERE id IN ('AUTO-TEST-1A', 'AUTO-TEST-1B')
ORDER BY is_backup;
SQL
)

if echo "$DB_CHECK" | grep -q "AUTO-TEST-1A" && echo "$DB_CHECK" | grep -q "AUTO-TEST-1B"; then
  echo "✅ Both servers found in database"
else
  echo "❌ FAILED: Servers not found in database"
  echo "$DB_CHECK"
  exit 1
fi

# Test 4: Verify pair matching
echo ""
echo "📝 Test 4: Verifying pair numbers match..."
PAIR_A=$(echo "$RESPONSE_A" | jq -r '.pairNumber')
PAIR_B=$(echo "$RESPONSE_B" | jq -r '.pairNumber')

if [ "$PAIR_A" == "$PAIR_B" ]; then
  echo "✅ Pair numbers match: $PAIR_A"
else
  echo "❌ FAILED: Pair numbers don't match (A: $PAIR_A, B: $PAIR_B)"
  exit 1
fi

# Test 5: Clean up test servers
echo ""
echo "🧹 Cleaning up test servers..."
curl -s -X DELETE "$API_URL/api/media-servers/$UUID_A" >/dev/null
curl -s -X DELETE "$API_URL/api/media-servers/$UUID_B" >/dev/null
echo "✅ Test servers deleted"

echo ""
echo "================================"
echo "✅ ALL TESTS PASSED"
echo "================================"
