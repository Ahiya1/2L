#!/bin/bash
# Quick test to verify SSE endpoint structure

echo "Testing SSE Endpoint..."
echo ""
echo "Starting dev server in background..."

# Start dev server in background
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start (5 seconds)..."
sleep 5

# Test SSE endpoint
echo ""
echo "Testing SSE endpoint with curl..."
echo "Press Ctrl+C to stop"
echo ""

timeout 10 curl -N http://localhost:3000/api/game/test-123/stream 2>/dev/null || echo "(Connection test complete)"

echo ""
echo ""
echo "Stopping dev server..."
kill $SERVER_PID 2>/dev/null

echo "✓ Test complete"
