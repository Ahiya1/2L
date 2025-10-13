#!/bin/bash
# Verification script for Builder-4A deliverables

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Builder-4A Verification Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check file exists
check_file() {
  if [ -f "$1" ]; then
    echo "✓ $1"
    return 0
  else
    echo "✗ $1 (MISSING)"
    return 1
  fi
}

# Check all deliverable files
echo "Checking SSE Implementation..."
check_file "app/api/game/[gameId]/stream/route.ts"
echo ""

echo "Checking Page..."
check_file "app/test-discussion/page.tsx"
echo ""

echo "Checking Components..."
check_file "components/PhaseIndicator.tsx"
check_file "components/PlayerGrid.tsx"
check_file "components/DiscussionFeed.tsx"
echo ""

echo "Checking Documentation..."
check_file "docs/web-ui-usage.md"
check_file "BUILDER-4A-SUMMARY.md"
echo ""

echo "Checking Tests..."
check_file "src/test-sse.ts"
echo ""

# TypeScript check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running TypeScript Check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsc --noEmit 2>&1
if [ $? -eq 0 ]; then
  echo ""
  echo "✓ TypeScript: PASSING"
else
  echo ""
  echo "✗ TypeScript: FAILED"
  exit 1
fi
echo ""

# ESLint check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running ESLint Check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx eslint components/*.tsx app/**/*.tsx 2>&1
if [ $? -eq 0 ]; then
  echo ""
  echo "✓ ESLint: PASSING"
else
  echo ""
  echo "✗ ESLint: FAILED"
  exit 1
fi
echo ""

# Count lines
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Line Count Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
wc -l app/api/game/[gameId]/stream/route.ts \
      app/test-discussion/page.tsx \
      components/PhaseIndicator.tsx \
      components/PlayerGrid.tsx \
      components/DiscussionFeed.tsx \
      src/test-sse.ts \
      docs/web-ui-usage.md
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Builder-4A Verification COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next Steps:"
echo "1. Start dev server: npm run dev"
echo "2. Test SSE: curl http://localhost:3000/api/game/test-123/stream"
echo "3. Run CLI test: npm run test-discussion"
echo "4. Open viewer: http://localhost:3000/test-discussion?gameId=xxx"
echo ""
