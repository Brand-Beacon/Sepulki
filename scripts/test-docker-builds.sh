#!/bin/bash

# ==========================================
# Docker Build Test Script
# ==========================================
# Tests Docker builds for all services
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

ERRORS=0

print_header "Testing Docker Builds"

# ==========================================
# Test hammer-orchestrator
# ==========================================

print_info "Building hammer-orchestrator..."
if docker build -f services/hammer-orchestrator/Dockerfile -t sepulki-hammer:test . 2>&1 | tee /tmp/hammer-build.log | grep -q "Successfully built"; then
    print_success "hammer-orchestrator builds successfully"
    
    # Check image size
    SIZE=$(docker images sepulki-hammer:test --format "{{.Size}}")
    print_info "Image size: $SIZE"
    
    # Cleanup
    docker rmi sepulki-hammer:test >/dev/null 2>&1 || true
else
    print_error "hammer-orchestrator build failed"
    echo "Check logs at: /tmp/hammer-build.log"
    ((ERRORS++))
fi

# ==========================================
# Test local-auth
# ==========================================

print_info "Building local-auth..."
if docker build -f services/local-auth/Dockerfile -t sepulki-auth:test . 2>&1 | tee /tmp/auth-build.log | grep -q "Successfully built"; then
    print_success "local-auth builds successfully"
    
    # Check image size
    SIZE=$(docker images sepulki-auth:test --format "{{.Size}}")
    print_info "Image size: $SIZE"
    
    # Cleanup
    docker rmi sepulki-auth:test >/dev/null 2>&1 || true
else
    print_error "local-auth build failed"
    echo "Check logs at: /tmp/auth-build.log"
    ((ERRORS++))
fi

# ==========================================
# Summary
# ==========================================

print_header "Build Test Summary"

if [ $ERRORS -eq 0 ]; then
    print_success "All Docker builds passed! ✨"
    echo -e "\n${GREEN}Your containers are ready for deployment!${NC}"
    exit 0
else
    print_error "$ERRORS build(s) failed"
    echo -e "\n${RED}Please fix build errors before deploying.${NC}"
    exit 1
fi
