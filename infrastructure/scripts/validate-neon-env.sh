#!/bin/bash

###############################################################################
# Neon Environment Validation Script
# Description: Validate environment variables and connection for Neon database
# Usage: ./validate-neon-env.sh
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# Load environment
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║        Neon Database Environment Validation                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

validation_passed=true

# Check DATABASE_URL
log_info "Checking DATABASE_URL..."
if [ -z "${DATABASE_URL:-}" ]; then
    log_error "DATABASE_URL is not set"
    validation_passed=false
else
    # Validate Neon URL format
    if [[ "$DATABASE_URL" =~ ^postgresql://.*\.neon\.tech/.*\?sslmode=require$ ]]; then
        log_success "DATABASE_URL format is valid"

        # Extract components
        if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^/]+)/([^?]+) ]]; then
            db_user="${BASH_REMATCH[1]}"
            db_host="${BASH_REMATCH[3]}"
            db_name="${BASH_REMATCH[4]}"

            log_info "Database User: $db_user"
            log_info "Database Host: $db_host"
            log_info "Database Name: $db_name"
        fi
    else
        log_warning "DATABASE_URL doesn't appear to be a Neon connection string"
        log_info "Expected format: postgresql://user:pass@endpoint.neon.tech/db?sslmode=require"
    fi
fi

# Test connection
log_info "Testing database connection..."
if command -v psql &> /dev/null; then
    if [ -n "${DATABASE_URL:-}" ]; then
        if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            log_success "Database connection successful"

            # Get additional info
            pg_version=$(psql "$DATABASE_URL" -t -c "SELECT version();" | head -n 1 | xargs)
            log_info "PostgreSQL: $pg_version"

            table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
            log_info "Tables in database: $table_count"
        else
            log_error "Failed to connect to database"
            validation_passed=false
        fi
    fi
else
    log_warning "psql not installed - skipping connection test"
fi

# Check optional variables
log_info "Checking optional environment variables..."

optional_vars=(
    "NODE_ENV"
    "PORT"
    "ENABLE_TELEMETRY"
)

for var in "${optional_vars[@]}"; do
    if [ -n "${!var:-}" ]; then
        log_success "$var is set: ${!var}"
    else
        log_warning "$var is not set (optional)"
    fi
done

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
if [ "$validation_passed" = true ]; then
    log_success "All required validations passed!"
    exit 0
else
    log_error "Some validations failed. Please fix the issues above."
    exit 1
fi
