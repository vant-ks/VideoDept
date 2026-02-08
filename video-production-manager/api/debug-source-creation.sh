#!/bin/bash

# Debug script to trace source creation issue
# This will simulate the exact user workflow and capture all data at each step

set -e

API_URL="http://localhost:3010/api"
DB_CONN="postgresql://kevin@localhost:5432/video_production"
PRODUCTION_ID=""

echo "=================================="
echo "🔍 SOURCE CREATION DEBUG TEST"
echo "=================================="
echo ""

# Get production ID
echo "📋 Step 1: Getting production ID..."
PRODUCTION_ID=$(psql $DB_CONN -t -c "SELECT id FROM productions WHERE is_deleted = false LIMIT 1;" | xargs)
echo "   Production ID: $PRODUCTION_ID"
echo ""

# Clear sources table
echo "🗑️  Step 2: Clearing sources table..."
psql $DB_CONN -c "DELETE FROM sources;" > /dev/null
INITIAL_COUNT=$(psql $DB_CONN -t -c "SELECT COUNT(*) FROM sources;" | xargs)
echo "   Sources in DB: $INITIAL_COUNT"
echo ""

# Verify constraints
echo "🔒 Step 3: Verifying database constraints..."
psql $DB_CONN -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'sources'::regclass AND contype = 'u';"
echo ""

# Test 1: Create SRC 1
echo "📝 Step 4: Creating SRC 1..."
echo "   Request payload:"
cat <<EOF | tee /tmp/src1_request.json
{
  "id": "SRC 1",
  "productionId": "$PRODUCTION_ID",
  "type": "Laptop - PC MISC",
  "name": "Test Source 1",
  "formatAssignmentMode": "system-wide",
  "hRes": 1920,
  "vRes": 1080,
  "rate": 59.94
}
EOF

echo ""
echo "   Making API call..."
RESPONSE1=$(curl -s -X POST "$API_URL/sources" \
  -H "Content-Type: application/json" \
  -d @/tmp/src1_request.json \
  -w "\nHTTP_CODE:%{http_code}")

BODY1=$(echo "$RESPONSE1" | grep -v "HTTP_CODE:")
HTTP_CODE1=$(echo "$RESPONSE1" | grep "HTTP_CODE:" | cut -d: -f2)

echo "   HTTP Status: $HTTP_CODE1"
echo "   Response body:"
echo "$BODY1" | jq '.' 2>/dev/null || echo "$BODY1"
echo ""

# Check database after SRC 1
echo "   Database state after SRC 1:"
psql $DB_CONN -c "SELECT id, uuid, production_id, name FROM sources ORDER BY created_at;"
echo ""

# Wait for WebSocket to process (simulate user delay)
echo "⏱️  Step 5: Waiting 2 seconds (simulating user reading screen)..."
sleep 2
echo ""

# Test 2: Create SRC 2
echo "📝 Step 6: Creating SRC 2..."
echo "   Request payload:"
cat <<EOF | tee /tmp/src2_request.json
{
  "id": "SRC 2",
  "productionId": "$PRODUCTION_ID",
  "type": "Laptop - PC MISC",
  "name": "Test Source 2",
  "formatAssignmentMode": "system-wide",
  "hRes": 1920,
  "vRes": 1080,
  "rate": 59.94
}
EOF

echo ""
echo "   Making API call..."
RESPONSE2=$(curl -s -X POST "$API_URL/sources" \
  -H "Content-Type: application/json" \
  -d @/tmp/src2_request.json \
  -w "\nHTTP_CODE:%{http_code}")

BODY2=$(echo "$RESPONSE2" | grep -v "HTTP_CODE:")
HTTP_CODE2=$(echo "$RESPONSE2" | grep "HTTP_CODE:" | cut -d: -f2)

echo "   HTTP Status: $HTTP_CODE2"
echo "   Response body:"
echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
echo ""

# Check database after SRC 2
echo "   Database state after SRC 2:"
psql $DB_CONN -c "SELECT id, uuid, production_id, name FROM sources ORDER BY created_at;"
echo ""

# Test 3: Try to create duplicate SRC 1 (should fail)
echo "📝 Step 7: Testing duplicate SRC 1 (should fail)..."
echo "   Request payload:"
cat <<EOF | tee /tmp/src1_dup_request.json
{
  "id": "SRC 1",
  "productionId": "$PRODUCTION_ID",
  "type": "Laptop - PC MISC",
  "name": "Duplicate Source 1",
  "formatAssignmentMode": "system-wide",
  "hRes": 1920,
  "vRes": 1080,
  "rate": 59.94
}
EOF

echo ""
echo "   Making API call..."
RESPONSE3=$(curl -s -X POST "$API_URL/sources" \
  -H "Content-Type: application/json" \
  -d @/tmp/src1_dup_request.json \
  -w "\nHTTP_CODE:%{http_code}")

BODY3=$(echo "$RESPONSE3" | grep -v "HTTP_CODE:")
HTTP_CODE3=$(echo "$RESPONSE3" | grep "HTTP_CODE:" | cut -d: -f2)

echo "   HTTP Status: $HTTP_CODE3"
echo "   Response body:"
echo "$BODY3" | jq '.' 2>/dev/null || echo "$BODY3"
echo ""

# Check database after duplicate attempt
echo "   Database state after duplicate attempt:"
psql $DB_CONN -c "SELECT id, uuid, production_id, name FROM sources ORDER BY created_at;"
echo ""

# Test 4: Create SRC 1 in DIFFERENT production (should succeed)
echo "📝 Step 8: Testing SRC 1 in different production..."

# Create a temporary second production
echo "   Creating temporary second production..."
PRODUCTION_ID_2=$(psql $DB_CONN -t -c "INSERT INTO productions (id, client, show_name, status, updated_at) VALUES (gen_random_uuid()::text, 'TEST', 'Test Production 2', 'PLANNING', NOW()) RETURNING id;" | xargs)
echo "   Second Production ID: $PRODUCTION_ID_2"

cat <<EOF | tee /tmp/src1_prod2_request.json
{
  "id": "SRC 1",
  "productionId": "$PRODUCTION_ID_2",
  "type": "Laptop - PC MISC",
  "name": "Source 1 in Production 2",
  "formatAssignmentMode": "system-wide",
  "hRes": 1920,
  "vRes": 1080,
  "rate": 59.94
}
EOF

echo ""
echo "   Making API call..."
RESPONSE4=$(curl -s -X POST "$API_URL/sources" \
  -H "Content-Type: application/json" \
  -d @/tmp/src1_prod2_request.json \
  -w "\nHTTP_CODE:%{http_code}")

BODY4=$(echo "$RESPONSE4" | grep -v "HTTP_CODE:")
HTTP_CODE4=$(echo "$RESPONSE4" | grep "HTTP_CODE:" | cut -d: -f2)

echo "   HTTP Status: $HTTP_CODE4"
echo "   Response body:"
echo "$BODY4" | jq '.' 2>/dev/null || echo "$BODY4"
echo ""

# Final database state
echo "   Final database state (showing both productions):"
psql $DB_CONN -c "SELECT id, uuid, production_id, name FROM sources ORDER BY production_id, id;"
echo ""

# Cleanup temp production
echo "🧹 Cleaning up temporary production..."
psql $DB_CONN -c "DELETE FROM sources WHERE production_id = '$PRODUCTION_ID_2';" > /dev/null
psql $DB_CONN -c "DELETE FROM productions WHERE id = '$PRODUCTION_ID_2';" > /dev/null
echo ""

# Summary
echo "=================================="
echo "📊 TEST SUMMARY"
echo "=================================="
echo "Test 1 - Create SRC 1:           HTTP $HTTP_CODE1"
echo "Test 2 - Create SRC 2:           HTTP $HTTP_CODE2"
echo "Test 3 - Duplicate SRC 1:        HTTP $HTTP_CODE3 (expected 409)"
echo "Test 4 - SRC 1 in Production 2:  HTTP $HTTP_CODE4 (expected 201)"
echo ""

if [ "$HTTP_CODE1" = "201" ] && [ "$HTTP_CODE2" = "201" ] && [ "$HTTP_CODE3" = "409" ] && [ "$HTTP_CODE4" = "201" ]; then
    echo "✅ ALL TESTS PASSED - API is working correctly!"
    echo ""
    echo "🔍 If frontend still fails, the issue is in:"
    echo "   1. Frontend state management (Sources.tsx)"
    echo "   2. Frontend ID generation (SourceFormModal.tsx)"
    echo "   3. Frontend-API data mapping (useSourcesAPI.ts)"
else
    echo "❌ TESTS FAILED - API has issues!"
fi

echo ""
