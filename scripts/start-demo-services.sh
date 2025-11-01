#!/bin/bash
# 🎬 Start Demo Services
# 
# Ensures all required services are running for the demo:
# - PostgreSQL (database)
# - Redis (pub/sub for subscriptions)
# - Hammer Orchestrator (GraphQL API)
# - Video Proxy (already running on port 8889)
# - Frontend (already running on port 3000)
#
# Usage:
#   ./scripts/start-demo-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-"/health"}
    
    if curl -s -f "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $service_name is running on port $port"
        return 0
    else
        echo -e "${YELLOW}⚠️${NC} $service_name is not responding on port $port"
        return 1
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-"/health"}
    local max_attempts=${4:-30}
    local attempt=0
    
    echo "⏳ Waiting for $service_name to be ready..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "http://localhost:$port$endpoint" > /dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} $service_name is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    echo -e "${RED}❌${NC} $service_name failed to start after $max_attempts seconds"
    return 1
}

# Function to check if a process is running on a port
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

echo "🎬 Starting Demo Services..."
echo ""

# Step 1: Start Docker services (PostgreSQL, Redis)
echo "📦 Step 1: Starting infrastructure services..."
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    # Try docker-compose first, fallback to docker compose
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi
    
    # Start postgres and redis
    $DOCKER_COMPOSE_CMD up -d postgres redis 2>/dev/null || {
        echo -e "${YELLOW}⚠️${NC} Docker services may already be running or docker-compose failed"
    }
    
    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for PostgreSQL to be ready..."
    pg_ready=false
    for i in {1..30}; do
        if docker exec sepulki-postgres-1 pg_isready -U smith -d sepulki > /dev/null 2>&1; then
            pg_ready=true
            break
        fi
        sleep 1
    done
    
    if [ "$pg_ready" = true ]; then
        echo -e "${GREEN}✅${NC} PostgreSQL is ready"
    else
        echo -e "${RED}❌${NC} PostgreSQL failed to start"
        exit 1
    fi
    
    # Check Redis
    if check_port 6379; then
        echo -e "${GREEN}✅${NC} Redis is running"
    else
        echo -e "${YELLOW}⚠️${NC} Redis may not be running (continuing anyway)"
    fi
else
    echo -e "${RED}❌${NC} Docker not found. Please start PostgreSQL and Redis manually."
    exit 1
fi

# Step 2: Seed database if needed
echo ""
echo "🌱 Step 2: Checking database seed data..."
FLEET_COUNT=$(docker exec sepulki-postgres-1 psql -U smith -d sepulki -t -c "SELECT COUNT(*) FROM fleets;" 2>/dev/null | xargs || echo "0")

if [ "$FLEET_COUNT" -eq "0" ] || [ -z "$FLEET_COUNT" ]; then
    echo "📊 No fleet data found, seeding database..."
    
    # Check if init.sql has been run
    TABLE_COUNT=$(docker exec sepulki-postgres-1 psql -U smith -d sepulki -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
    
    if [ "$TABLE_COUNT" -eq "0" ] || [ -z "$TABLE_COUNT" ]; then
        echo "📋 Running schema initialization..."
        docker exec -i sepulki-postgres-1 psql -U smith -d sepulki < "$PROJECT_ROOT/infrastructure/sql/init.sql" 2>/dev/null || {
            echo -e "${YELLOW}⚠️${NC} Schema initialization may have already run"
        }
    fi
    
    # Seed test data
    if [ -f "$PROJECT_ROOT/scripts/seed-dev-data.sql" ]; then
        echo "🌱 Seeding test data..."
        docker exec -i sepulki-postgres-1 psql -U smith -d sepulki < "$PROJECT_ROOT/scripts/seed-dev-data.sql" 2>/dev/null || {
            echo -e "${YELLOW}⚠️${NC} Seed data may have already been inserted (continuing)"
        }
    else
        echo -e "${YELLOW}⚠️${NC} Seed data file not found: scripts/seed-dev-data.sql"
    fi
    
    # Verify seed data
    FLEET_COUNT_AFTER=$(docker exec sepulki-postgres-1 psql -U smith -d sepulki -t -c "SELECT COUNT(*) FROM fleets;" 2>/dev/null | xargs || echo "0")
    if [ "$FLEET_COUNT_AFTER" -gt "0" ]; then
        echo -e "${GREEN}✅${NC} Database seeded with $FLEET_COUNT_AFTER fleet(s)"
    else
        echo -e "${YELLOW}⚠️${NC} No fleets found after seeding (may need manual seeding)"
    fi
else
    echo -e "${GREEN}✅${NC} Database already has $FLEET_COUNT fleet(s)"
fi

# Step 3: Start Hammer Orchestrator (GraphQL server)
echo ""
echo "🔨 Step 3: Starting Hammer Orchestrator (GraphQL API)..."

if check_port 4000; then
    if check_service "Hammer Orchestrator" 4000 "/health"; then
        echo -e "${GREEN}✅${NC} Hammer Orchestrator is already running"
    else
        echo -e "${YELLOW}⚠️${NC} Port 4000 is in use but service may not be responding"
        echo "   Killing existing process on port 4000..."
        lsof -ti:4000 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
else
    echo "🚀 Starting Hammer Orchestrator..."
    cd "$PROJECT_ROOT/services/hammer-orchestrator"
    
    # Set environment variables
    export DATABASE_URL="${DATABASE_URL:-postgresql://smith:forge_dev@localhost:5432/sepulki}"
    export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
    export NODE_ENV="${NODE_ENV:-development}"
    export PORT="${PORT:-4000}"
    export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3000}"
    
    # Start in background and save PID
    npm run dev > /tmp/hammer-orchestrator.log 2>&1 &
    HAMMER_PID=$!
    echo $HAMMER_PID > /tmp/hammer-orchestrator.pid
    
    cd "$PROJECT_ROOT"
    
    # Wait for service to be ready
    if wait_for_service "Hammer Orchestrator" 4000 "/health" 30; then
        echo -e "${GREEN}✅${NC} Hammer Orchestrator started (PID: $HAMMER_PID)"
    else
        echo -e "${RED}❌${NC} Failed to start Hammer Orchestrator"
        echo "   Check logs: /tmp/hammer-orchestrator.log"
        exit 1
    fi
fi

# Step 4: Verify all services
echo ""
echo "🔍 Step 4: Verifying all services..."

SERVICES_OK=true

if ! check_service "Frontend" 3000 "/"; then
    echo -e "${YELLOW}⚠️${NC} Frontend may not be running. Start with: cd apps/forge-ui && npm run dev"
    SERVICES_OK=false
fi

if ! check_service "Hammer Orchestrator" 4000 "/health"; then
    echo -e "${RED}❌${NC} Hammer Orchestrator is not healthy"
    SERVICES_OK=false
fi

if ! check_service "Video Proxy" 8889 "/health"; then
    echo -e "${YELLOW}⚠️${NC} Video Proxy may not be running. Start with: cd services/video-stream-proxy && npm run dev"
    SERVICES_OK=false
fi

# Step 5: Verify GraphQL can query fleets
echo ""
echo "🔍 Step 5: Verifying GraphQL queries..."

FLEETS_QUERY_RESULT=$(curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ fleets { id name } }"}' 2>/dev/null | grep -o '"fleets"' || echo "")

if [ -n "$FLEETS_QUERY_RESULT" ]; then
    echo -e "${GREEN}✅${NC} GraphQL can query fleets successfully"
else
    echo -e "${YELLOW}⚠️${NC} GraphQL query test failed (may be OK if no fleets exist)"
fi

# Summary
echo ""
if [ "$SERVICES_OK" = true ]; then
    echo -e "${GREEN}✅${NC} All critical services are running!"
    echo ""
    echo "📍 Service Status:"
    echo "   🔥 Frontend:          http://localhost:3000"
    echo "   🔨 GraphQL API:        http://localhost:4000/graphql"
    echo "   📹 Video Proxy:        http://localhost:8889"
    echo "   🗄️  PostgreSQL:        localhost:5432"
    echo "   📡 Redis:              localhost:6379"
    echo ""
    echo "✅ Demo services are ready!"
    exit 0
else
    echo -e "${YELLOW}⚠️${NC} Some services may not be running. Check the output above."
    echo ""
    echo "💡 To start missing services:"
    echo "   Frontend:    cd apps/forge-ui && npm run dev"
    echo "   Video Proxy: cd services/video-stream-proxy && npm run dev"
    exit 1
fi

