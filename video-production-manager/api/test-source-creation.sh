#!/bin/bash

# Comprehensive Source Creation Test Suite
# Tests every component to find where duplicate ID issue originates

PROD_ID="724a71e2-7d6e-4c55-bbc6-d3729dec6b93"
API_URL="http://localhost:3010/api"

echo "🧪 SOURCE CREATION DIAGNOSTIC TEST SUITE"
echo "========================================"
echo ""

# TEST 1: Check database state
echo "TEST 1: Database State Check"
echo "----------------------------"
psql postgresql://kevin@localhost:5432/video_production -c "SELECT id, category, name, is_deleted FROM sources WHERE production_id = '$PROD_ID' ORDER BY id;"
echo ""

# TEST 2: Check for any SRC 2 globally
echo "TEST 2: Check for SRC 2 anywhere in database"
echo "--------------------------------------------"
psql postgresql://kevin@localhost:5432/video_production -c "SELECT id, production_id, category, name FROM sources WHERE id = 'SRC 2';"
echo ""

# TEST 3: Verify unique constraint
echo "TEST 3: Verify Unique Constraint"
echo "--------------------------------"
psql postgresql://kevin@localhost:5432/video_production -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'sources'::regclass AND conname LIKE '%id%';"
echo ""

# TEST 4: Try to create SRC 2 via API
echo "TEST 4: API POST Request Test"
echo "-----------------------------"
echo "Sending POST request to create SRC 2..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/sources" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "SRC 2",
    "productionId": "'"$PROD_ID"'",
    "category": "COMPUTER",
    "type": "Laptop - PC MISC",
    "name": "TEST SOURCE",
    "rate": 59.94,
    "outputs": [{"id": "out-1", "connector": "HDMI"}],
    "userId": "test-user",
    "userName": "Test User"
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

# TEST 5: Check database after API attempt
echo "TEST 5: Database State After API Call"
echo "-------------------------------------"
psql postgresql://kevin@localhost:5432/video_production -c "SELECT id, category, name FROM sources WHERE production_id = '$PROD_ID' ORDER BY id;"
echo ""

# TEST 6: Try direct SQL insert
echo "TEST 6: Direct SQL Insert Test"
echo "------------------------------"
echo "Attempting direct INSERT of SRC 3..."
psql postgresql://kevin@localhost:5432/video_production -c "
INSERT INTO sources (
  id, production_id, category, name, rate, updated_at, created_at
) VALUES (
  'SRC 3', '$PROD_ID', 'COMPUTER', 'Direct SQL Test', 59.94, NOW(), NOW()
);" 2>&1
echo ""

# TEST 7: Check if direct insert worked
echo "TEST 7: Verify Direct Insert"
echo "----------------------------"
psql postgresql://kevin@localhost:5432/video_production -c "SELECT id, category, name FROM sources WHERE production_id = '$PROD_ID' ORDER BY id;"
echo ""

# TEST 8: Try duplicate direct insert (should fail)
echo "TEST 8: Duplicate Direct Insert Test (should fail)"
echo "--------------------------------------------------"
echo "Attempting to insert SRC 3 again (should get constraint error)..."
psql postgresql://kevin@localhost:5432/video_production -c "
INSERT INTO sources (
  id, production_id, category, name, rate, updated_at, created_at
) VALUES (
  'SRC 3', '$PROD_ID', 'COMPUTER', 'Duplicate Test', 59.94, NOW(), NOW()
);" 2>&1
echo ""

# TEST 9: Check sends table for ID conflicts
echo "TEST 9: Check Sends Table"
echo "------------------------"
psql postgresql://kevin@localhost:5432/video_production -c "SELECT id, name FROM sends WHERE production_id = '$PROD_ID' LIMIT 10;"
echo ""

# TEST 10: Check events table
echo "TEST 10: Check Events Table"
echo "--------------------------"
psql postgresql://kevin@localhost:5432/video_production -c "SELECT entity_id, event_type, operation FROM events WHERE production_id = '$PROD_ID' AND entity_type = 'SOURCE' ORDER BY timestamp DESC LIMIT 5;"
echo ""

# CLEANUP
echo "TEST 11: Cleanup Test Data"
echo "-------------------------"
echo "Removing test data (SRC 3)..."
psql postgresql://kevin@localhost:5432/video_production -c "DELETE FROM sources WHERE id = 'SRC 3' AND production_id = '$PROD_ID';"
echo ""

echo "========================================"
echo "✅ TEST SUITE COMPLETE"
echo "========================================"
