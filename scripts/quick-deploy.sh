#!/bin/bash

# ==========================================
# Quick Deployment Script
# ==========================================
# Deploys all services in the correct order
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

# ==========================================
# Check Prerequisites
# ==========================================

print_header "Checking Prerequisites"

# Check if CLIs are installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not installed. Run: npm install -g vercel"
    exit 1
fi

if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not installed. Run: npm install -g @railway/cli"
    exit 1
fi

print_success "All CLIs installed"

# ==========================================
# Validate Configuration
# ==========================================

print_header "Validating Configuration"

./scripts/validate-deployment.sh || {
    print_error "Validation failed. Please fix errors before deploying."
    exit 1
}

# ==========================================
# 1. Deploy Database
# ==========================================

print_header "1. Deploying Database (Neon)"

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set. Please set it and try again."
    echo "Example: export DATABASE_URL='postgresql://user:pass@host/db'"
    exit 1
fi

print_info "Running database migrations..."
./infrastructure/scripts/neon-setup.sh

print_success "Database deployed and migrated"

# ==========================================
# 2. Deploy Backend Services (Railway)
# ==========================================

print_header "2. Deploying Backend Services (Railway)"

print_info "Deploying hammer-orchestrator..."
cd services/hammer-orchestrator
railway up --detach || {
    print_error "Failed to deploy hammer-orchestrator"
    exit 1
}
cd ../..
print_success "hammer-orchestrator deployed"

print_info "Deploying local-auth..."
cd services/local-auth
railway up --detach || {
    print_error "Failed to deploy local-auth"
    exit 1
}
cd ../..
print_success "local-auth deployed"

print_info "Waiting for services to start (30 seconds)..."
sleep 30

# ==========================================
# 3. Deploy Frontend (Vercel)
# ==========================================

print_header "3. Deploying Frontend (Vercel)"

print_info "Deploying to Vercel..."
cd apps/forge-ui
vercel --prod || {
    print_error "Failed to deploy frontend"
    exit 1
}
cd ../..
print_success "Frontend deployed"

# ==========================================
# 4. Verify Deployment
# ==========================================

print_header "4. Verifying Deployment"

print_info "This is a placeholder for health checks."
print_info "Add your actual URLs to verify deployment:"
echo "  - Frontend: https://your-domain.vercel.app/api/health"
echo "  - Hammer: https://your-hammer.railway.app/health"
echo "  - Auth: https://your-auth.railway.app/health"

# ==========================================
# Success!
# ==========================================

print_header "Deployment Complete! 🎉"

echo -e "${GREEN}All services deployed successfully!${NC}\n"
echo "Next steps:"
echo "  1. Visit your Vercel deployment URL"
echo "  2. Test authentication flow"
echo "  3. Verify GraphQL API connectivity"
echo "  4. Check Railway logs for any errors"
echo ""
echo "For troubleshooting, see: docs/DEPLOYMENT_COMPLETE.md"
