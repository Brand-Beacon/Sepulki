#!/bin/bash

# ==========================================
# Deployment Validation Script
# ==========================================
# Validates that all services are properly
# configured and ready for deployment
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

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

ERRORS=0
WARNINGS=0

# ==========================================
# 1. Check Dependencies
# ==========================================

print_header "1. Checking Dependencies"

if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not installed"
    ((ERRORS++))
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm not installed"
    ((ERRORS++))
fi

if command -v docker >/dev/null 2>&1; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker installed: $DOCKER_VERSION"
else
    print_warning "Docker not installed (required for Railway deployment)"
    ((WARNINGS++))
fi

if command -v psql >/dev/null 2>&1; then
    print_success "PostgreSQL client installed"
else
    print_warning "PostgreSQL client not installed (optional for local testing)"
    ((WARNINGS++))
fi

# ==========================================
# 2. Validate Configuration Files
# ==========================================

print_header "2. Validating Configuration Files"

# Vercel configuration
if [ -f "apps/forge-ui/vercel.json" ]; then
    print_success "Vercel configuration found"
else
    print_error "Vercel configuration missing: apps/forge-ui/vercel.json"
    ((ERRORS++))
fi

# Railway configurations
if [ -f "services/hammer-orchestrator/railway.json" ]; then
    print_success "Railway config found: hammer-orchestrator"
else
    print_error "Railway configuration missing: services/hammer-orchestrator/railway.json"
    ((ERRORS++))
fi

if [ -f "services/local-auth/railway.json" ]; then
    print_success "Railway config found: local-auth"
else
    print_error "Railway configuration missing: services/local-auth/railway.json"
    ((ERRORS++))
fi

# Dockerfiles
if [ -f "services/hammer-orchestrator/Dockerfile" ]; then
    print_success "Dockerfile found: hammer-orchestrator"
else
    print_error "Dockerfile missing: services/hammer-orchestrator/Dockerfile"
    ((ERRORS++))
fi

if [ -f "services/local-auth/Dockerfile" ]; then
    print_success "Dockerfile found: local-auth"
else
    print_error "Dockerfile missing: services/local-auth/Dockerfile"
    ((ERRORS++))
fi

# GitHub Actions workflows
if [ -f ".github/workflows/deploy-frontend.yml" ]; then
    print_success "GitHub Actions workflow: deploy-frontend.yml"
else
    print_error "GitHub Actions workflow missing: deploy-frontend.yml"
    ((ERRORS++))
fi

if [ -f ".github/workflows/deploy-backend.yml" ]; then
    print_success "GitHub Actions workflow: deploy-backend.yml"
else
    print_error "GitHub Actions workflow missing: deploy-backend.yml"
    ((ERRORS++))
fi

if [ -f ".github/workflows/run-migrations.yml" ]; then
    print_success "GitHub Actions workflow: run-migrations.yml"
else
    print_error "GitHub Actions workflow missing: run-migrations.yml"
    ((ERRORS++))
fi

# ==========================================
# 3. Check Environment Variables
# ==========================================

print_header "3. Checking Environment Variables"

# Check for .env.example files
if [ -f "apps/forge-ui/.env.example" ]; then
    print_success "Frontend .env.example found"
else
    print_warning "Frontend .env.example missing"
    ((WARNINGS++))
fi

if [ -f "services/hammer-orchestrator/.env.example" ]; then
    print_success "Hammer Orchestrator .env.example found"
else
    print_warning "Hammer Orchestrator .env.example missing"
    ((WARNINGS++))
fi

if [ -f "services/local-auth/.env.example" ]; then
    print_success "Local Auth .env.example found"
else
    print_warning "Local Auth .env.example missing"
    ((WARNINGS++))
fi

# ==========================================
# 4. Validate Package Structure
# ==========================================

print_header "4. Validating Package Structure"

# Check package.json files
if [ -f "package.json" ]; then
    print_success "Root package.json found"
else
    print_error "Root package.json missing"
    ((ERRORS++))
fi

if [ -f "apps/forge-ui/package.json" ]; then
    print_success "Frontend package.json found"
else
    print_error "Frontend package.json missing"
    ((ERRORS++))
fi

if [ -f "services/hammer-orchestrator/package.json" ]; then
    print_success "Hammer Orchestrator package.json found"
else
    print_error "Hammer Orchestrator package.json missing"
    ((ERRORS++))
fi

if [ -f "services/local-auth/package.json" ]; then
    print_success "Local Auth package.json found"
else
    print_error "Local Auth package.json missing"
    ((ERRORS++))
fi

# ==========================================
# 5. Test TypeScript Compilation
# ==========================================

print_header "5. Testing TypeScript Compilation"

print_info "Testing hammer-orchestrator build..."
if cd services/hammer-orchestrator && npm run build >/dev/null 2>&1; then
    print_success "Hammer Orchestrator builds successfully"
    cd ../..
else
    print_error "Hammer Orchestrator build failed"
    ((ERRORS++))
    cd ../..
fi

print_info "Testing local-auth build..."
if cd services/local-auth && npm run build >/dev/null 2>&1; then
    print_success "Local Auth builds successfully"
    cd ../..
else
    print_error "Local Auth build failed"
    ((ERRORS++))
    cd ../..
fi

# ==========================================
# 6. Validate Database Scripts
# ==========================================

print_header "6. Validating Database Scripts"

if [ -f "infrastructure/scripts/neon-setup.sh" ]; then
    if [ -x "infrastructure/scripts/neon-setup.sh" ]; then
        print_success "Neon setup script found and executable"
    else
        print_warning "Neon setup script not executable"
        chmod +x infrastructure/scripts/neon-setup.sh
        print_info "Made script executable"
    fi
else
    print_error "Neon setup script missing"
    ((ERRORS++))
fi

# Check migration files
if [ -d "infrastructure/sql/migrations" ]; then
    MIGRATION_COUNT=$(find infrastructure/sql/migrations -name "*.sql" | wc -l)
    print_success "Found $MIGRATION_COUNT migration files"
else
    print_warning "No migrations directory found"
    ((WARNINGS++))
fi

# ==========================================
# 7. Check Documentation
# ==========================================

print_header "7. Checking Documentation"

if [ -f "docs/DEPLOYMENT_COMPLETE.md" ]; then
    print_success "Deployment documentation found"
else
    print_error "Deployment documentation missing"
    ((ERRORS++))
fi

if [ -f "docs/deployment-checklist.md" ]; then
    print_success "Deployment checklist found"
else
    print_warning "Deployment checklist missing"
    ((WARNINGS++))
fi

# ==========================================
# Summary
# ==========================================

print_header "Validation Summary"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    print_success "All checks passed! ✨"
    echo -e "\n${GREEN}Your deployment is ready!${NC}"
    echo -e "Next steps:"
    echo -e "  1. Review docs/DEPLOYMENT_COMPLETE.md"
    echo -e "  2. Follow docs/deployment-checklist.md"
    echo -e "  3. Deploy to Vercel and Railway"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    print_warning "$WARNINGS warnings found"
    echo -e "\n${YELLOW}Deployment is mostly ready, but please address warnings.${NC}"
    exit 0
else
    print_error "$ERRORS errors and $WARNINGS warnings found"
    echo -e "\n${RED}Please fix errors before deploying.${NC}"
    exit 1
fi
