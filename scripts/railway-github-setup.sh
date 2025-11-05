#!/bin/bash

# ==========================================
# Railway GitHub Integration Setup
# ==========================================
# Due to Railway CLI upload timeouts,
# we'll use GitHub integration instead
# ==========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header "Railway GitHub Integration Setup"

echo "Railway CLI uploads are timing out due to network issues."
echo "We'll use GitHub integration instead (more reliable)."
echo ""

print_header "Step 1: Open Railway Dashboard"

echo "Your Railway project:"
echo "https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4"
echo ""
echo "Opening in browser..."
open "https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4" 2>/dev/null || echo "(Manual: Open the URL above)"
echo ""

print_header "Step 2: Connect hammer-orchestrator to GitHub"

echo "1. Click on 'hammer-orchestrator' service"
echo "2. Click 'Settings' tab"
echo "3. Under 'Source', click 'Connect Repo'"
echo "4. Select: CatsMeow492/Sepulki"
echo "5. Set Root Directory: /services/hammer-orchestrator"
echo "6. Click 'Connect'"
echo ""
echo "Press Enter when done..."
read

print_header "Step 3: Connect local-auth to GitHub"

echo "1. Click on 'local-auth' service"
echo "2. Click 'Settings' tab"
echo "3. Under 'Source', click 'Connect Repo'"
echo "4. Select: CatsMeow492/Sepulki"
echo "5. Set Root Directory: /services/local-auth"
echo "6. Click 'Connect'"
echo ""
echo "Press Enter when done..."
read

print_header "Step 4: Get Service Information"

echo "Collecting service information..."
echo ""

# Get project info
PROJECT_ID="cb1982ed-db09-409e-8af5-5bbd40e248f4"

# Try to get service IDs from Railway
railway service hammer-orchestrator 2>/dev/null || true
HAMMER_URL=$(railway domain 2>/dev/null | grep -oE 'https://[^[:space:]]+' | head -1 || echo "")

railway service local-auth 2>/dev/null || true
AUTH_URL=$(railway domain 2>/dev/null | grep -oE 'https://[^[:space:]]+' | head -1 || echo "")

print_header "Service URLs"

if [ -n "$HAMMER_URL" ]; then
    print_success "hammer-orchestrator: $HAMMER_URL"
else
    print_info "hammer-orchestrator: Check Railway dashboard for URL"
fi

if [ -n "$AUTH_URL" ]; then
    print_success "local-auth: $AUTH_URL"
else
    print_info "local-auth: Check Railway dashboard for URL"
fi

print_header "Step 5: Configure Environment Variables"

echo "For hammer-orchestrator, set these variables in Railway:"
echo ""
echo "NODE_ENV=production"
echo "PORT=4000"
echo "DATABASE_URL=<your-neon-url>"
echo "REDIS_URL=<your-upstash-url>"
echo "JWT_SECRET=<your-jwt-secret>"
echo "CORS_ORIGIN=<your-vercel-url>"
echo ""
echo "Press Enter when done..."
read

echo "For local-auth, set these variables in Railway:"
echo ""
echo "NODE_ENV=production"
echo "PORT=3001"
echo "DATABASE_URL=<your-neon-url>"
echo "REDIS_URL=<your-upstash-url>"
echo "JWT_SECRET=<your-jwt-secret>"
echo "SESSION_SECRET=<your-session-secret>"
echo "CORS_ORIGIN=<your-vercel-url>"
echo ""
echo "Press Enter when done..."
read

print_header "Step 6: Trigger Deployments"

echo "1. Both services should auto-deploy after connecting to GitHub"
echo "2. You can manually trigger deploys from the Railway dashboard"
echo "3. Or push a commit to the master branch"
echo ""

print_success "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Wait for deployments to complete (~5 minutes)"
echo "2. Check deployment logs in Railway dashboard"
echo "3. Verify health endpoints are responding"
echo "4. Continue with Vercel and database setup"

