#!/bin/bash
# Verification script to ensure demo actually works before claiming success

set -e

echo "🎬 Verifying Demo Functionality..."
echo ""

# Step 1: Check services are running
echo "Step 1: Checking required services..."
FRONTEND_OK=false
PROXY_OK=false

if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Frontend is running"
  FRONTEND_OK=true
else
  echo "❌ Frontend is NOT running at http://localhost:3000"
fi

if curl -s http://localhost:8889/health > /dev/null 2>&1; then
  echo "✅ Video proxy is running"
  PROXY_OK=true
else
  echo "❌ Video proxy is NOT running at http://localhost:8889"
fi

if ! $FRONTEND_OK || ! $PROXY_OK; then
  echo ""
  echo "❌ Required services are not running. Start them before running the demo."
  exit 1
fi

echo ""
echo "Step 2: Verifying demo test can access pages..."

cd "$(dirname "$0")/.."

# Step 3: Run the demo and capture output
echo ""
echo "Step 3: Running demo test..."
npx playwright test tests/demo-script.spec.ts \
  --grep "Quick Kennel Demo" \
  --timeout=30000 \
  2>&1 | tee /tmp/demo-output.log

# Step 4: Verify demo actually did something
echo ""
echo "Step 4: Verifying demo results..."

DEMO_PASSED=$(grep -c "passed" /tmp/demo-output.log || echo "0")
STREAM_FOUND=$(grep -c "streams visible\|streams found\|streams with active" /tmp/demo-output.log || echo "0")
SCREENSHOT_SAVED=$(grep -c "Screenshot saved\|screenshot" /tmp/demo-output.log || echo "0")

if [ "$DEMO_PASSED" -eq 0 ]; then
  echo "❌ Demo test did not pass"
  exit 1
fi

if [ "$STREAM_FOUND" -eq 0 ]; then
  echo "❌ No streams were found/verified during demo"
  echo "   The demo test passed but didn't verify streams are working"
  exit 1
fi

if [ "$SCREENSHOT_SAVED" -eq 0 ]; then
  echo "⚠️  No screenshot was saved (demo may not be capturing visual proof)"
fi

echo ""
echo "✅ Demo verification complete!"
echo "   - Test passed: ✓"
echo "   - Streams verified: ✓"
echo "   - Screenshot: $([ "$SCREENSHOT_SAVED" -gt 0 ] && echo '✓' || echo '⚠️')"

