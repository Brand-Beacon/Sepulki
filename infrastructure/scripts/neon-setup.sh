#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_message() {
    echo -e "${1}${2}${NC}"
}

print_message "$GREEN" "🚀 Starting Neon PostgreSQL setup..."

if [ -z "$DATABASE_URL" ]; then
    print_message "$RED" "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

print_message "$YELLOW" "Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    print_message "$GREEN" "✓ Database connection successful"
else
    print_message "$RED" "✗ Failed to connect to database"
    exit 1
fi

print_message "$YELLOW" "Enabling PostgreSQL extensions..."
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > /dev/null 2>&1
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" > /dev/null 2>&1
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";" > /dev/null 2>&1
print_message "$GREEN" "✓ Extensions enabled"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATIONS_DIR="$SCRIPT_DIR/../sql/migrations"

if [ -d "$MIGRATIONS_DIR" ] && ls "$MIGRATIONS_DIR"/*.sql 1> /dev/null 2>&1; then
    print_message "$YELLOW" "Running database migrations..."
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        filename=$(basename "$migration")
        print_message "$YELLOW" "Running: $filename"
        if psql "$DATABASE_URL" -f "$migration" > /dev/null 2>&1; then
            print_message "$GREEN" "✓ $filename completed"
        else
            print_message "$RED" "✗ Failed to run $filename"
            exit 1
        fi
    done
fi

print_message "$GREEN" "🎉 Neon PostgreSQL setup completed successfully!"
