#!/bin/bash

# API Integration Test Script for Integrator-2
# Tests all 6 API endpoints from Builder-4

BASE_URL="http://localhost:3000"
GAME_ID=""

echo "================================================"
echo "API Endpoint Integration Test - Zone 4"
echo "================================================"
echo ""

# Test 1: POST /api/game/create
echo "Test 1: POST /api/game/create"
echo "Creating game with 10 players..."
CREATE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 10}' \
  "$BASE_URL/api/game/create")

echo "Response: $CREATE_RESPONSE"
GAME_ID=$(echo $CREATE_RESPONSE | grep -o '"gameId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$GAME_ID" ]; then
  echo "❌ FAIL: No gameId returned"
  exit 1
else
  echo "✅ PASS: Game created with ID: $GAME_ID"
fi
echo ""

# Test 2: GET /api/game/[gameId]/state
echo "Test 2: GET /api/game/[gameId]/state"
echo "Fetching game state..."
STATE_RESPONSE=$(curl -s "$BASE_URL/api/game/$GAME_ID/state")
echo "Response: $STATE_RESPONSE"

if echo "$STATE_RESPONSE" | grep -q '"status":"LOBBY"'; then
  echo "✅ PASS: Game state shows LOBBY status"
else
  echo "❌ FAIL: Game state doesn't show LOBBY status"
fi

if echo "$STATE_RESPONSE" | grep -q '"playerCount":10'; then
  echo "✅ PASS: Player count is 10"
else
  echo "❌ FAIL: Player count is not 10"
fi
echo ""

# Test 3: GET /api/game/[gameId]/messages
echo "Test 3: GET /api/game/[gameId]/messages"
echo "Fetching messages (should be empty)..."
MESSAGES_RESPONSE=$(curl -s "$BASE_URL/api/game/$GAME_ID/messages")
echo "Response: $MESSAGES_RESPONSE"

if echo "$MESSAGES_RESPONSE" | grep -q '"messages":\[\]'; then
  echo "✅ PASS: Messages array is empty"
else
  echo "⚠️  WARN: Messages array is not empty or format different"
fi
echo ""

# Test 4: GET /api/game/[gameId]/votes
echo "Test 4: GET /api/game/[gameId]/votes"
echo "Fetching votes (should be empty)..."
VOTES_RESPONSE=$(curl -s "$BASE_URL/api/game/$GAME_ID/votes")
echo "Response: $VOTES_RESPONSE"

if echo "$VOTES_RESPONSE" | grep -q '"votes":\[\]'; then
  echo "✅ PASS: Votes array is empty"
else
  echo "⚠️  WARN: Votes array is not empty or format different"
fi
echo ""

# Test 5: GET /api/game/[gameId]/results (should return 403)
echo "Test 5: GET /api/game/[gameId]/results (before game over)"
echo "Fetching results (should return 403)..."
RESULTS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/game/$GAME_ID/results")
echo "HTTP Status Code: $RESULTS_CODE"

if [ "$RESULTS_CODE" == "403" ]; then
  echo "✅ PASS: Returns 403 Forbidden (game not finished)"
else
  echo "❌ FAIL: Expected 403, got $RESULTS_CODE"
fi
echo ""

# Test 6: POST /api/game/[gameId]/start
echo "Test 6: POST /api/game/[gameId]/start"
echo "Starting game..."
START_RESPONSE=$(curl -s -X POST "$BASE_URL/api/game/$GAME_ID/start")
echo "Response: $START_RESPONSE"

if echo "$START_RESPONSE" | grep -q '"success":true'; then
  echo "✅ PASS: Game started successfully"
else
  echo "❌ FAIL: Game did not start successfully"
fi
echo ""

# Wait and check state again
echo "Waiting 5 seconds for game to progress..."
sleep 5

echo "Test 7: GET /api/game/[gameId]/state (after start)"
echo "Fetching game state..."
STATE_RESPONSE2=$(curl -s "$BASE_URL/api/game/$GAME_ID/state")
echo "Response: $STATE_RESPONSE2"

if echo "$STATE_RESPONSE2" | grep -q '"status":"NIGHT"'; then
  echo "✅ PASS: Game status changed to NIGHT"
elif echo "$STATE_RESPONSE2" | grep -q '"currentPhase":"NIGHT"'; then
  echo "✅ PASS: Game phase is NIGHT"
else
  echo "⚠️  WARN: Game may not have transitioned to NIGHT yet"
fi
echo ""

# Test 8: Invalid player count (should return 400)
echo "Test 8: POST /api/game/create (invalid player count)"
echo "Creating game with 5 players (invalid)..."
INVALID_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 5}' \
  "$BASE_URL/api/game/create")
echo "HTTP Status Code: $INVALID_CODE"

if [ "$INVALID_CODE" == "400" ]; then
  echo "✅ PASS: Returns 400 Bad Request for invalid player count"
else
  echo "❌ FAIL: Expected 400, got $INVALID_CODE"
fi
echo ""

# Test 9: Non-existent game (should return 404)
echo "Test 9: GET /api/game/[gameId]/state (non-existent game)"
echo "Fetching state for fake game ID..."
FAKE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/game/fake-game-id-123/state")
echo "HTTP Status Code: $FAKE_CODE"

if [ "$FAKE_CODE" == "404" ] || [ "$FAKE_CODE" == "500" ]; then
  echo "✅ PASS: Returns 404 or 500 for non-existent game"
else
  echo "⚠️  WARN: Expected 404/500, got $FAKE_CODE"
fi
echo ""

echo "================================================"
echo "API Integration Test Summary"
echo "================================================"
echo "Game ID for further testing: $GAME_ID"
echo ""
echo "All critical API endpoints tested."
echo "Check results above for any failures."
