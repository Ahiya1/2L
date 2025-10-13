#!/bin/bash

# Test API endpoints
# Run this script after starting the Next.js dev server

BASE_URL="http://localhost:3000"

echo "=== Testing AI Mafia API Endpoints ==="
echo ""

# Test 1: Create game
echo "1. Creating game with 10 players..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/game/create" \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 10}')

echo "Response: $RESPONSE"
GAME_ID=$(echo $RESPONSE | jq -r '.gameId')
echo "Game ID: $GAME_ID"
echo ""

if [ "$GAME_ID" == "null" ] || [ -z "$GAME_ID" ]; then
  echo "ERROR: Failed to create game"
  exit 1
fi

# Test 2: Get game state
echo "2. Getting game state..."
curl -s "$BASE_URL/api/game/$GAME_ID/state" | jq '.'
echo ""

# Test 3: Get messages (should be empty)
echo "3. Getting messages..."
curl -s "$BASE_URL/api/game/$GAME_ID/messages" | jq '.'
echo ""

# Test 4: Get votes (should be empty)
echo "4. Getting votes..."
curl -s "$BASE_URL/api/game/$GAME_ID/votes" | jq '.'
echo ""

# Test 5: Start game
echo "5. Starting game..."
curl -s -X POST "$BASE_URL/api/game/$GAME_ID/start" | jq '.'
echo ""

# Test 6: Wait a few seconds and check state again
echo "6. Waiting 5 seconds and checking state..."
sleep 5
curl -s "$BASE_URL/api/game/$GAME_ID/state" | jq '.game | {status, currentPhase, roundNumber}'
echo ""

# Test 7: Try to get results (should fail - game not over)
echo "7. Trying to get results (should fail)..."
curl -s "$BASE_URL/api/game/$GAME_ID/results" | jq '.'
echo ""

echo "=== Test complete ==="
echo "Game ID: $GAME_ID"
echo "Monitor game at: $BASE_URL/game/$GAME_ID"
