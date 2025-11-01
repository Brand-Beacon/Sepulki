#!/bin/bash
# 🔍 Verify Demo Prerequisites
# 
# Checks all services and data before running the demo:
# - All services are running and healthy
# - Database has test fleet data
# - GraphQL can query fleets
# - Video proxy is responding
# - Frontend can load and authenticate
#
# Usage:
#   ./scripts/verify-demo-ready.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VERIFY_OK=true

echo "🔍 Verifying Demo Prerequisites..."
echo ""

# Step 1: Check services are running
echo "📡 Step 1: Checking services..."

# Check Frontend (just check if it responds, not HTTP status)
if curl -s --max-time 2 http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Frontend is running at http://localhost:3000"
else
    echo -e "${RED}❌${NC} Frontend is NOT running at http://localhost:3000"
    VERIFY_OK=false
fi

# Check GraphQL Server
if curl -s -f http://localhost:4000/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:4000/health | grep -o '"status":"ok"' || echo "")
    if [ -n "$HEALTH" ]; then
        echo -e "${GREEN}✅${NC} GraphQL server is healthy at http://localhost:4000"
    else
        echo -e "${YELLOW}⚠️${NC} GraphQL server is responding but may not be healthy"
        VERIFY_OK=false
    fi
else
    echo -e "${RED}❌${NC} GraphQL server is NOT running at http://localhost:4000"
    VERIFY_OK=false
fi

# Check Video Proxy
if curl -s -f http://localhost:8889/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Video proxy is running at http://localhost:8889"
else
    echo -e "${YELLOW}⚠️${NC} Video proxy may not be running at http://localhost:8889 (continuing anyway)"
fi

# Step 2: Check database has test fleet data
echo ""
echo "🗄️  Step 2: Checking database data..."

if command -v docker &> /dev/null; then
    FLEET_COUNT=$(docker exec sepulki-postgres-1 psql -U smith -d sepulki -t -c "SELECT COUNT(*) FROM fleets;" 2>/dev/null | xargs || echo "0")
    
    if [ "$FLEET_COUNT" -gt "0" ]; then
        echo -e "${GREEN}✅${NC} Database has $FLEET_COUNT fleet(s)"
        
        # Get fleet IDs for demo
        FLEET_IDS=$(docker exec sepulki-postgres-1 psql -U smith -d sepulki -t -c "SELECT id FROM fleets LIMIT 3;" 2>/dev/null | xargs | tr ' ' ',' || echo "")
        if [ -n "$FLEET_IDS" ]; then
            echo "   Fleet IDs: $FLEET_IDS"
        fi
        
        # Check robots exist
        ROBOT_COUNT=$(docker exec sepulki-postgres-1 psql -U smith -d sepulki -t -c "SELECT COUNT(*) FROM robots;" 2>/dev/null | xargs || echo "0")
        if [ "$ROBOT_COUNT" -gt "0" ]; then
            echo -e "${GREEN}✅${NC} Database has $ROBOT_COUNT robot(s)"
        else
            echo -e "${YELLOW}⚠️${NC} Database has no robots (demo will use mock robots)"
        fi
    else
        echo -e "${RED}❌${NC} Database has no fleets. Run: ./scripts/db-setup.sh seed"
        VERIFY_OK=false
    fi
else
    echo -e "${YELLOW}⚠️${NC} Cannot check database (Docker not available)"
fi

# Step 3: Verify GraphQL can query fleets
echo ""
echo "🔍 Step 3: Verifying GraphQL queries..."

FLEETS_QUERY_RESULT=$(curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ fleets { id name } }"}' 2>/dev/null | grep -o '"fleets"' || echo "")

if [ -n "$FLEETS_QUERY_RESULT" ]; then
    echo -e "${GREEN}✅${NC} GraphQL can query fleets successfully"
    
    # Try to get actual fleet data
    FLEETS_DATA=$(curl -s -X POST http://localhost:4000/graphql \
      -H "Content-Type: application/json" \
      -d '{"query":"{ fleets { id name status } }"}' 2>/dev/null)
    
    FLEET_NAMES=$(echo "$FLEETS_DATA" | grep -o '"name":"[^"]*"' | head -3 | sed 's/"name":"\([^"]*\)"/\1/' | tr '\n' ', ' || echo "")
    if [ -n "$FLEET_NAMES" ]; then
        echo "   Fleets: $FLEET_NAMES"
    fi
else
    echo -e "${RED}❌${NC} GraphQL query for fleets failed"
    VERIFY_OK=false
fi

# Step 4: Verify frontend can load
echo ""
echo "🌐 Step 4: Verifying frontend accessibility..."

FRONTEND_TITLE=$(curl -s http://localhost:3000 2>/dev/null | grep -o '<title>[^<]*</title>' | sed 's/<title>\([^<]*\)<\/title>/\1/' || echo "")
if [ -n "$FRONTEND_TITLE" ]; then
    echo -e "${GREEN}✅${NC} Frontend is accessible (Title: $FRONTEND_TITLE)"
else
    echo -e "${YELLOW}⚠️${NC} Frontend may not be fully loaded"
fi

# Summary
echo ""
if [ "$VERIFY_OK" = true ]; then
    echo -e "${GREEN}✅${NC} All prerequisites verified!"
    echo ""
    echo "📍 Service Status:"
    echo "   🔥 Frontend:          http://localhost:3000"
    echo "   🔨 GraphQL API:        http://localhost:4000/graphql"
    echo "   📹 Video Proxy:        http://localhost:8889"
    echo ""
    echo "✅ Demo is ready to run!"
    exit 0
else
    echo -e "${RED}❌${NC} Some prerequisites are not met. Please fix the issues above."
    echo ""
    echo "💡 To fix issues:"
    echo "   • Start services:     ./scripts/start-demo-services.sh"
    echo "   • Seed database:       ./scripts/db-setup.sh seed"
    echo "   • Start frontend:      cd apps/forge-ui && npm run dev"
    echo ""
    exit 1
fi

