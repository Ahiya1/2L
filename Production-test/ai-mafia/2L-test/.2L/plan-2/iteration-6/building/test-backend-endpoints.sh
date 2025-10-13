#!/bin/bash
# Backend API Testing Script for Builder-1 Changes
# Tests night-messages endpoint and role field in state endpoint

set -e

GAME_ID=${1:-}
BASE_URL="http://localhost:3001"

if [ -z "$GAME_ID" ]; then
  echo "Usage: $0 <gameId>"
  echo ""
  echo "Manual test workflow:"
  echo "1. Start dev server: npm run dev"
  echo "2. Create game in browser: http://localhost:3001/"
  echo "3. Copy game ID from URL"
  echo "4. Run: ./test-backend-endpoints.sh <gameId>"
  exit 1
fi

echo "Testing Backend Endpoints for Game: $GAME_ID"
echo "=============================================="
echo ""

# Test 1: Night Messages API Endpoint
echo "Test 1: GET /api/game/$GAME_ID/night-messages"
echo "----------------------------------------------"
response=$(curl -s "$BASE_URL/api/game/$GAME_ID/night-messages")
echo "$response" | jq '.'
echo ""
echo "Expected: JSON with 'messages' array (may be empty before Night phase)"
echo "Status: $(echo "$response" | jq -r 'if .error then "FAIL" else "PASS" end')"
echo ""

# Test 2: Night Messages with Round Filter
echo "Test 2: GET /api/game/$GAME_ID/night-messages?round=1"
echo "----------------------------------------------"
response=$(curl -s "$BASE_URL/api/game/$GAME_ID/night-messages?round=1")
echo "$response" | jq '.'
echo ""
echo "Expected: JSON with 'messages' array filtered by round 1"
echo "Status: $(echo "$response" | jq -r 'if .error then "FAIL" else "PASS" end')"
echo ""

# Test 3: Game State API with Role Field
echo "Test 3: GET /api/game/$GAME_ID/state"
echo "----------------------------------------------"
response=$(curl -s "$BASE_URL/api/game/$GAME_ID/state")
echo "$response" | jq '.'
echo ""
echo "Expected: JSON with 'players' array, each player has 'role' field"
role_count=$(echo "$response" | jq '.players | length')
role_field=$(echo "$response" | jq -r '.players[0].role // "MISSING"')
echo "Player count: $role_count"
echo "First player role: $role_field"
if [ "$role_field" = "MISSING" ]; then
  echo "Status: FAIL (role field missing)"
else
  echo "Status: PASS (role field present)"
fi
echo ""

# Test 4: SSE Endpoint Connection
echo "Test 4: GET /api/game/$GAME_ID/stream (SSE)"
echo "----------------------------------------------"
echo "Testing SSE connection for 5 seconds..."
timeout 5 curl -N -s "$BASE_URL/api/game/$GAME_ID/stream" | head -10 || true
echo ""
echo "Expected: 'CONNECTED' event followed by keepalive or game events"
echo "Status: CHECK MANUALLY (should see event stream above)"
echo ""

echo "=============================================="
echo "Testing Complete"
echo ""
echo "Manual SSE Testing (run in separate terminal):"
echo "  curl -N http://localhost:3001/api/game/$GAME_ID/stream"
echo ""
echo "Watch for 'NIGHT_MESSAGE' events during Night phase"
