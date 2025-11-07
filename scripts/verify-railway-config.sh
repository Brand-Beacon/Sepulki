#!/bin/bash
# ============================================
# Railway Configuration Verification Script
# ============================================
# Verifies that Railway configurations are correct for monorepo deployment
#
# Usage: ./scripts/verify-railway-config.sh

set -e

echo "🔍 Railway Configuration Verification"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check file exists
check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description: $file"
        return 0
    else
        echo -e "${RED}✗${NC} $description: $file (NOT FOUND)"
        ((ERRORS++))
        return 1
    fi
}

# Function to check JSON field
check_json_field() {
    local file=$1
    local field=$2
    local expected=$3
    local description=$4

    if ! [ -f "$file" ]; then
        return 1
    fi

    actual=$(jq -r "$field" "$file" 2>/dev/null || echo "null")

    if [ "$actual" == "$expected" ]; then
        echo -e "${GREEN}✓${NC} $description: $actual"
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        echo -e "   Expected: ${expected}"
        echo -e "   Actual:   ${actual}"
        ((ERRORS++))
        return 1
    fi
}

# Function to check JSON field does NOT exist
check_json_field_absent() {
    local file=$1
    local field=$2
    local description=$3

    if ! [ -f "$file" ]; then
        return 1
    fi

    actual=$(jq -r "$field" "$file" 2>/dev/null || echo "null")

    if [ "$actual" == "null" ]; then
        echo -e "${GREEN}✓${NC} $description (correctly absent)"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $description (should not be set)"
        echo -e "   Found:    ${actual}"
        ((WARNINGS++))
        return 1
    fi
}

# Check repository root
echo "1. Repository Structure"
echo "----------------------"

check_file "railway.json" "Root railway.json"
check_file "services/hammer-orchestrator/railway.json" "Hammer Orchestrator railway.json"
check_file "services/local-auth/railway.json" "Local Auth railway.json"
check_file "services/hammer-orchestrator/Dockerfile.railway" "Hammer Orchestrator Dockerfile"
check_file "services/local-auth/Dockerfile.railway" "Local Auth Dockerfile"

echo ""
echo "2. Root Configuration (railway.json)"
echo "-----------------------------------"

check_json_field "railway.json" '.monorepo.services."hammer-orchestrator".root' "services/hammer-orchestrator" "Hammer root directory"
check_json_field "railway.json" '.monorepo.services."local-auth".root' "services/local-auth" "Auth root directory"

echo ""
echo "3. Hammer Orchestrator Configuration"
echo "------------------------------------"

HAMMER_CONFIG="services/hammer-orchestrator/railway.json"

check_json_field "$HAMMER_CONFIG" '.build.builder' "DOCKERFILE" "Build method"
check_json_field "$HAMMER_CONFIG" '.build.dockerfilePath' "services/hammer-orchestrator/Dockerfile.railway" "Dockerfile path"
check_json_field "$HAMMER_CONFIG" '.deploy.healthcheckPath' "/health" "Health check path"

# These should NOT be set
check_json_field_absent "$HAMMER_CONFIG" '.build.buildContext' "buildContext (should be absent)"
check_json_field_absent "$HAMMER_CONFIG" '.build.rootDirectory' "rootDirectory (should be absent)"

# Check watch patterns
WATCH_COUNT=$(jq -r '.build.watchPatterns | length' "$HAMMER_CONFIG" 2>/dev/null || echo "0")
if [ "$WATCH_COUNT" == "2" ]; then
    echo -e "${GREEN}✓${NC} watchPatterns count: 2"

    PATTERN1=$(jq -r '.build.watchPatterns[0]' "$HAMMER_CONFIG")
    PATTERN2=$(jq -r '.build.watchPatterns[1]' "$HAMMER_CONFIG")

    if [ "$PATTERN1" == "services/hammer-orchestrator/**" ]; then
        echo -e "${GREEN}✓${NC} watchPattern[0]: $PATTERN1"
    else
        echo -e "${RED}✗${NC} watchPattern[0]: $PATTERN1 (expected: services/hammer-orchestrator/**)"
        ((ERRORS++))
    fi

    if [ "$PATTERN2" == "packages/**" ]; then
        echo -e "${GREEN}✓${NC} watchPattern[1]: $PATTERN2"
    else
        echo -e "${RED}✗${NC} watchPattern[1]: $PATTERN2 (expected: packages/**)"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} watchPatterns count: $WATCH_COUNT (expected: 2)"
    ((ERRORS++))
fi

echo ""
echo "4. Local Auth Configuration"
echo "---------------------------"

AUTH_CONFIG="services/local-auth/railway.json"

check_json_field "$AUTH_CONFIG" '.build.builder' "DOCKERFILE" "Build method"
check_json_field "$AUTH_CONFIG" '.build.dockerfilePath' "services/local-auth/Dockerfile.railway" "Dockerfile path"
check_json_field "$AUTH_CONFIG" '.deploy.healthcheckPath' "/health" "Health check path"

# These should NOT be set
check_json_field_absent "$AUTH_CONFIG" '.build.buildContext' "buildContext (should be absent)"
check_json_field_absent "$AUTH_CONFIG" '.build.rootDirectory' "rootDirectory (should be absent)"

# Check watch patterns
WATCH_COUNT=$(jq -r '.build.watchPatterns | length' "$AUTH_CONFIG" 2>/dev/null || echo "0")
if [ "$WATCH_COUNT" == "1" ]; then
    echo -e "${GREEN}✓${NC} watchPatterns count: 1"

    PATTERN1=$(jq -r '.build.watchPatterns[0]' "$AUTH_CONFIG")

    if [ "$PATTERN1" == "services/local-auth/**" ]; then
        echo -e "${GREEN}✓${NC} watchPattern[0]: $PATTERN1"
    else
        echo -e "${RED}✗${NC} watchPattern[0]: $PATTERN1 (expected: services/local-auth/**)"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} watchPatterns count: $WATCH_COUNT (expected: 1)"
    ((ERRORS++))
fi

echo ""
echo "5. Dockerfile Analysis"
echo "---------------------"

# Check hammer-orchestrator Dockerfile
if grep -q "COPY package.json package-lock.json" "services/hammer-orchestrator/Dockerfile.railway"; then
    echo -e "${GREEN}✓${NC} Hammer Dockerfile: Copies root package files"
else
    echo -e "${RED}✗${NC} Hammer Dockerfile: Missing root package file copy"
    ((ERRORS++))
fi

if grep -q "COPY packages/" "services/hammer-orchestrator/Dockerfile.railway"; then
    echo -e "${GREEN}✓${NC} Hammer Dockerfile: Copies shared packages"
else
    echo -e "${RED}✗${NC} Hammer Dockerfile: Missing shared packages copy"
    ((ERRORS++))
fi

# Check local-auth Dockerfile
if grep -q "COPY package.json package-lock.json" "services/local-auth/Dockerfile.railway"; then
    echo -e "${GREEN}✓${NC} Auth Dockerfile: Copies root package files"
else
    echo -e "${RED}✗${NC} Auth Dockerfile: Missing root package file copy"
    ((ERRORS++))
fi

echo ""
echo "======================================"
echo "Verification Summary"
echo "======================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your Railway configuration is correct for monorepo deployment."
    echo ""
    echo "Next steps:"
    echo "1. railway login"
    echo "2. railway link"
    echo "3. git push origin main (auto-deploys via GitHub)"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) found${NC}"
    echo ""
    echo "Configuration should work, but some fields could be cleaned up."
    echo "See warnings above for details."
    echo ""
    exit 0
else
    echo -e "${RED}✗ ${ERRORS} error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors above before deploying."
    echo ""
    echo "See docs/RAILWAY_DEPLOYMENT.md for detailed guidance."
    echo ""
    exit 1
fi
