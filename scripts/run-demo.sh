#!/bin/bash
# 🎬 Run Sepulki Platform Demo Script
# 
# This script runs the automated demo using Playwright
# 
# Usage:
#   ./scripts/run-demo.sh                 # Fast mode (no delays)
#   ./scripts/run-demo.sh --demo          # Demo mode (with delays for presentations)
#   ./scripts/run-demo.sh --record        # Record video
#   ./scripts/run-demo.sh --kennel       # Quick kennel demo only
#   ./scripts/run-demo.sh --rag           # RAG to deployment flow only

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Default values
DEMO_MODE=false
RECORD_DEMO=false
TEST_FILE="tests/demo-script.spec.ts"
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --demo)
      DEMO_MODE=true
      shift
      ;;
    --record)
      RECORD_DEMO=true
      shift
      ;;
    --kennel)
      TEST_FILE="tests/demo-script.spec.ts"
      TEST_NAME="Quick Kennel Demo"
      shift
      ;;
    --rag)
      TEST_FILE="tests/demo-script.spec.ts"
      TEST_NAME="RAG to Deployment Flow Demo"
      shift
      ;;
    --full)
      TEST_FILE="tests/demo-script.spec.ts"
      TEST_NAME="Complete Platform Demo"
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --demo      Run in demo mode (with delays for presentations)"
      echo "  --record    Record video of the demo"
      echo "  --kennel    Run quick kennel demo only"
      echo "  --rag       Run RAG to deployment flow only"
      echo "  --full      Run complete platform demo"
      echo "  --help      Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --demo --record    # Run full demo with delays and record video"
      echo "  $0 --kennel           # Quick kennel demo (fast mode)"
      echo "  $0 --rag              # RAG deployment flow (fast mode)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if services are running
echo "🔍 Checking if services are running..."
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
  echo "❌ Frontend is not running at $BASE_URL"
  echo "   Please start the development server first:"
  echo "   cd apps/forge-ui && npm run dev"
  exit 1
fi

echo "✅ Frontend is running at $BASE_URL"

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
  echo "❌ npx not found. Please install Node.js and npm."
  exit 1
fi

# Build environment variables
export DEMO_MODE=$DEMO_MODE
export RECORD_DEMO=$RECORD_DEMO
export BASE_URL=$BASE_URL

# Run the demo
echo "🎬 Starting Sepulki Platform Demo..."
echo "   Mode: $([ "$DEMO_MODE" = "true" ] && echo "DEMO (with delays)" || echo "FAST (no delays)")"
echo "   Recording: $([ "$RECORD_DEMO" = "true" ] && echo "ON" || echo "OFF")"
echo "   Test: $TEST_FILE"
echo ""

cd apps/forge-ui

cd "$PROJECT_ROOT/apps/forge-ui"

if [ -n "$TEST_NAME" ]; then
  # Run specific test
  npx playwright test "../$TEST_FILE" \
    --grep "$TEST_NAME" \
    --headed
else
  # Run all tests in the file
  npx playwright test "../$TEST_FILE" \
    --headed
fi

echo ""
echo "✅ Demo completed!"
echo ""
if [ "$RECORD_DEMO" = "true" ]; then
  echo "📹 Videos saved to: apps/forge-ui/test-results/"
fi
echo "📸 Screenshots saved to: apps/forge-ui/test-results/"

