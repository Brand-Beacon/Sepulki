#!/bin/bash

###############################################################################
# Neon Database Migration Runner
# Description: Run database migrations with rollback support
# Usage: ./migrate-neon.sh [up|down|status|reset] [version]
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
MIGRATIONS_DIR="$PROJECT_ROOT/infrastructure/sql/migrations"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Load environment
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

COMMAND="${1:-status}"
VERSION="${2:-}"

show_usage() {
    cat << EOF
Usage: $0 [command] [version]

Commands:
  up        Apply pending migrations (default: all)
  down      Rollback last migration
  status    Show migration status
  reset     Reset database (WARNING: destructive)

Version (optional):
  Specific migration version to target

Examples:
  $0 status
  $0 up
  $0 up 002_add_performance_indexes.sql
  $0 down

EOF
}

ensure_migrations_table() {
    psql "$DATABASE_URL" -c "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            checksum VARCHAR(64)
        );
    " > /dev/null 2>&1
}

calculate_checksum() {
    local file="$1"
    if command -v shasum &> /dev/null; then
        shasum -a 256 "$file" | cut -d' ' -f1
    elif command -v sha256sum &> /dev/null; then
        sha256sum "$file" | cut -d' ' -f1
    else
        echo "unknown"
    fi
}

migration_status() {
    log_info "Migration Status"
    echo ""

    ensure_migrations_table

    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        return 1
    fi

    local migration_files=($(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort))

    if [ ${#migration_files[@]} -eq 0 ]; then
        log_info "No migration files found"
        return 0
    fi

    printf "%-40s %-10s %-25s\n" "Migration" "Status" "Applied At"
    printf "%-40s %-10s %-25s\n" "----------------------------------------" "----------" "-------------------------"

    for migration_file in "${migration_files[@]}"; do
        local migration_name=$(basename "$migration_file")
        local applied_at=$(psql "$DATABASE_URL" -t -c "SELECT applied_at FROM schema_migrations WHERE version = '$migration_name';" | xargs)

        if [ -n "$applied_at" ]; then
            printf "%-40s ${GREEN}%-10s${NC} %-25s\n" "$migration_name" "Applied" "$applied_at"
        else
            printf "%-40s ${YELLOW}%-10s${NC} %-25s\n" "$migration_name" "Pending" "-"
        fi
    done

    echo ""
}

migrate_up() {
    log_info "Running migrations..."

    ensure_migrations_table

    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        return 1
    fi

    local migration_files=($(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort))

    if [ ${#migration_files[@]} -eq 0 ]; then
        log_info "No migration files found"
        return 0
    fi

    local applied_count=0

    for migration_file in "${migration_files[@]}"; do
        local migration_name=$(basename "$migration_file")

        # Check if specific version requested
        if [ -n "$VERSION" ] && [ "$migration_name" != "$VERSION" ]; then
            continue
        fi

        # Check if already applied
        local applied=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$migration_name';" | xargs)

        if [ "$applied" -gt 0 ]; then
            log_info "Skipping $migration_name (already applied)"
            continue
        fi

        log_info "Applying: $migration_name"

        local checksum=$(calculate_checksum "$migration_file")

        if psql "$DATABASE_URL" <<EOF
BEGIN;
\i $migration_file
INSERT INTO schema_migrations (version, checksum) VALUES ('$migration_name', '$checksum');
COMMIT;
EOF
        then
            log_success "Applied: $migration_name"
            ((applied_count++))
        else
            log_error "Failed to apply: $migration_name"
            return 1
        fi

        # If specific version, stop after applying it
        if [ -n "$VERSION" ]; then
            break
        fi
    done

    if [ $applied_count -eq 0 ]; then
        log_info "No migrations to apply"
    else
        log_success "Applied $applied_count migration(s)"
    fi
}

migrate_down() {
    log_warning "Rollback functionality not yet implemented"
    log_info "To rollback, you'll need to:"
    echo "  1. Create a down migration file"
    echo "  2. Remove the migration record from schema_migrations"
    echo "  3. Apply the down migration manually"
}

migrate_reset() {
    log_error "DANGER: This will destroy all data!"
    read -p "Are you sure you want to reset the database? Type 'yes' to confirm: " -r
    echo
    if [ "$REPLY" != "yes" ]; then
        log_info "Reset cancelled"
        return 0
    fi

    log_warning "Dropping all tables..."

    psql "$DATABASE_URL" <<EOF
DO \$\$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
EOF

    log_success "Database reset complete"
    log_info "Run './migrate-neon.sh up' to recreate schema"
}

main() {
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL environment variable not set"
        exit 1
    fi

    case "$COMMAND" in
        up)
            migrate_up
            ;;
        down)
            migrate_down
            ;;
        status)
            migration_status
            ;;
        reset)
            migrate_reset
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
}

main
