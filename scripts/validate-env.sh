#!/bin/bash

# ==========================================
# SEPULKI ENVIRONMENT VALIDATION SCRIPT
# ==========================================
# Validates all required environment variables are set correctly
# Can be run locally or in CI/CD pipelines
#
# Usage:
#   ./scripts/validate-env.sh [environment] [service]
#
# Arguments:
#   environment: development, production, staging (default: development)
#   service: forge-ui, hammer-orchestrator, local-auth, video-stream-proxy, all (default: all)
#
# Examples:
#   ./scripts/validate-env.sh development
#   ./scripts/validate-env.sh production forge-ui
#   ./scripts/validate-env.sh staging all

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-development}"
SERVICE="${2:-all}"
ERROR_COUNT=0
WARNING_COUNT=0
SUCCESS_COUNT=0

# Print colored output
print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERROR_COUNT++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNING_COUNT++))
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((SUCCESS_COUNT++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Check if variable is set
check_var() {
    local var_name="$1"
    local required="$2"
    local service_name="$3"

    if [ -z "${!var_name}" ]; then
        if [ "$required" = "true" ]; then
            print_error "$service_name: $var_name is not set (REQUIRED)"
            return 1
        else
            print_warning "$service_name: $var_name is not set (optional)"
            return 0
        fi
    else
        print_success "$service_name: $var_name is set"
        return 0
    fi
}

# Check if variable contains a placeholder value
check_placeholder() {
    local var_name="$1"
    local value="${!var_name}"
    local service_name="$2"

    if [[ "$value" =~ (your-|change-me|example|placeholder|secret-change|dev-secret) ]]; then
        print_warning "$service_name: $var_name contains a placeholder value: $value"
        return 1
    fi
    return 0
}

# Check URL format
check_url() {
    local var_name="$1"
    local value="${!var_name}"
    local service_name="$2"

    if [ -n "$value" ] && ! [[ "$value" =~ ^https?:// ]] && ! [[ "$value" =~ ^wss?:// ]]; then
        print_warning "$service_name: $var_name may have invalid URL format: $value"
        return 1
    fi
    return 0
}

# Check database URL format
check_database_url() {
    local var_name="$1"
    local value="${!var_name}"
    local service_name="$2"

    if [ -n "$value" ]; then
        if ! [[ "$value" =~ ^postgresql:// ]] && ! [[ "$value" =~ ^postgres:// ]]; then
            print_error "$service_name: $var_name must be a PostgreSQL URL"
            return 1
        fi

        # Check for SSL in production
        if [ "$ENVIRONMENT" = "production" ] && ! [[ "$value" =~ sslmode=require ]]; then
            print_warning "$service_name: $var_name should use SSL in production (?sslmode=require)"
        fi

        print_success "$service_name: $var_name format is valid"
    fi
    return 0
}

# Check Redis URL format
check_redis_url() {
    local var_name="$1"
    local value="${!var_name}"
    local service_name="$2"

    if [ -n "$value" ]; then
        if ! [[ "$value" =~ ^redis:// ]] && ! [[ "$value" =~ ^rediss:// ]]; then
            print_error "$service_name: $var_name must be a Redis URL"
            return 1
        fi

        # Check for SSL in production
        if [ "$ENVIRONMENT" = "production" ] && [[ "$value" =~ ^redis:// ]]; then
            print_warning "$service_name: Consider using rediss:// (SSL) in production"
        fi

        print_success "$service_name: $var_name format is valid"
    fi
    return 0
}

# Check JWT secret strength
check_jwt_secret() {
    local var_name="$1"
    local value="${!var_name}"
    local service_name="$2"

    if [ -n "$value" ]; then
        local length=${#value}

        if [ "$ENVIRONMENT" = "production" ]; then
            if [ "$length" -lt 32 ]; then
                print_error "$service_name: $var_name is too short for production (minimum 32 characters)"
                return 1
            fi
        else
            if [ "$length" -lt 16 ]; then
                print_warning "$service_name: $var_name is short (recommended 32+ characters)"
            fi
        fi

        # Check if it's a common weak secret
        if [[ "$value" =~ ^(secret|password|test|dev) ]]; then
            print_warning "$service_name: $var_name appears to be a weak secret"
        fi

        print_success "$service_name: $var_name has adequate length"
    fi
    return 0
}

# Load environment files
load_env_file() {
    local file="$1"
    if [ -f "$file" ]; then
        print_info "Loading $file"
        # Export variables without overwriting existing ones
        set -a
        source "$file"
        set +a
        return 0
    else
        print_warning "Environment file not found: $file"
        return 1
    fi
}

# Validate Frontend (forge-ui)
validate_frontend() {
    print_header "Validating Frontend (forge-ui)"

    # Load environment file
    load_env_file "apps/forge-ui/.env.local" || load_env_file "apps/forge-ui/.env"

    # Required variables
    check_var "NEXT_PUBLIC_GRAPHQL_URL" true "forge-ui"
    check_url "NEXT_PUBLIC_GRAPHQL_URL" "forge-ui"

    check_var "NEXT_PUBLIC_API_URL" true "forge-ui"
    check_url "NEXT_PUBLIC_API_URL" "forge-ui"

    check_var "NEXTAUTH_URL" true "forge-ui"
    check_url "NEXTAUTH_URL" "forge-ui"

    check_var "NEXTAUTH_SECRET" true "forge-ui"
    check_placeholder "NEXTAUTH_SECRET" "forge-ui"
    check_jwt_secret "NEXTAUTH_SECRET" "forge-ui"

    # Production-specific checks
    if [ "$ENVIRONMENT" = "production" ]; then
        check_var "GITHUB_CLIENT_ID" false "forge-ui"
        check_var "GITHUB_CLIENT_SECRET" false "forge-ui"

        if [ -z "$GITHUB_CLIENT_ID" ] && [ -z "$GOOGLE_CLIENT_ID" ]; then
            print_warning "forge-ui: No OAuth providers configured for production"
        fi

        # Check for HTTPS in production
        if [[ "$NEXT_PUBLIC_GRAPHQL_URL" =~ ^http:// ]]; then
            print_error "forge-ui: NEXT_PUBLIC_GRAPHQL_URL must use HTTPS in production"
        fi

        if [[ "$NEXTAUTH_URL" =~ ^http:// ]]; then
            print_error "forge-ui: NEXTAUTH_URL must use HTTPS in production"
        fi
    fi

    # Optional but recommended
    check_var "NEXT_PUBLIC_ISAAC_SIM_IP" false "forge-ui"
    check_var "NEXT_PUBLIC_VIDEO_PROXY_URL" false "forge-ui"
    check_url "NEXT_PUBLIC_VIDEO_PROXY_URL" "forge-ui"
}

# Validate Backend (hammer-orchestrator)
validate_backend() {
    print_header "Validating Backend (hammer-orchestrator)"

    # Load environment file
    load_env_file "services/hammer-orchestrator/.env"

    # Required variables
    check_var "DATABASE_URL" true "hammer-orchestrator"
    check_database_url "DATABASE_URL" "hammer-orchestrator"

    check_var "REDIS_URL" true "hammer-orchestrator"
    check_redis_url "REDIS_URL" "hammer-orchestrator"

    check_var "JWT_SECRET" true "hammer-orchestrator"
    check_placeholder "JWT_SECRET" "hammer-orchestrator"
    check_jwt_secret "JWT_SECRET" "hammer-orchestrator"

    check_var "CORS_ORIGIN" true "hammer-orchestrator"

    # Production-specific checks
    if [ "$ENVIRONMENT" = "production" ]; then
        # GraphQL security
        if [ "$GRAPHQL_PLAYGROUND" = "true" ]; then
            print_error "hammer-orchestrator: GRAPHQL_PLAYGROUND should be false in production"
        fi

        if [ "$GRAPHQL_INTROSPECTION" = "true" ]; then
            print_error "hammer-orchestrator: GRAPHQL_INTROSPECTION should be false in production"
        fi

        # File storage
        if [ "$FILE_STORAGE_TYPE" = "local" ]; then
            print_warning "hammer-orchestrator: Using local file storage in production (consider S3)"
        fi

        # Check S3 config if using S3
        if [ "$FILE_STORAGE_TYPE" = "s3" ]; then
            check_var "AWS_REGION" true "hammer-orchestrator"
            check_var "AWS_ACCESS_KEY_ID" true "hammer-orchestrator"
            check_var "AWS_SECRET_ACCESS_KEY" true "hammer-orchestrator"
            check_var "AWS_S3_BUCKET" true "hammer-orchestrator"
        fi
    fi

    # Optional but recommended
    check_var "SENTRY_DSN" false "hammer-orchestrator"
}

# Validate Authentication Service (local-auth)
validate_auth() {
    print_header "Validating Authentication Service (local-auth)"

    # Load environment file
    load_env_file "services/local-auth/.env"

    # Required variables
    check_var "DATABASE_URL" true "local-auth"
    check_database_url "DATABASE_URL" "local-auth"

    check_var "REDIS_URL" true "local-auth"
    check_redis_url "REDIS_URL" "local-auth"

    check_var "JWT_SECRET" true "local-auth"
    check_placeholder "JWT_SECRET" "local-auth"
    check_jwt_secret "JWT_SECRET" "local-auth"

    check_var "CORS_ORIGIN" true "local-auth"

    # Production-specific checks
    if [ "$ENVIRONMENT" = "production" ]; then
        if [ "$SESSION_COOKIE_SECURE" != "true" ]; then
            print_error "local-auth: SESSION_COOKIE_SECURE must be true in production"
        fi

        if [ "$SHOW_TEST_USERS" = "true" ]; then
            print_error "local-auth: SHOW_TEST_USERS must be false in production"
        fi

        if [ "$DEBUG_MODE" = "true" ]; then
            print_warning "local-auth: DEBUG_MODE should be false in production"
        fi

        if [ "$PASSWORD_HASH_ALGORITHM" = "sha256" ]; then
            print_error "local-auth: Use bcrypt for password hashing in production, not sha256"
        fi
    fi
}

# Validate Video Stream Proxy
validate_video_proxy() {
    print_header "Validating Video Stream Proxy (video-stream-proxy)"

    # Load environment file
    load_env_file "services/video-stream-proxy/.env"

    # Required variables
    check_var "CORS_ORIGIN" true "video-stream-proxy"

    # Production-specific checks
    if [ "$ENVIRONMENT" = "production" ]; then
        print_info "video-stream-proxy: Ensure WebSocket connections use WSS in production"
    fi
}

# Check JWT secret consistency across services
check_jwt_consistency() {
    print_header "Checking JWT Secret Consistency"

    # Load all service env files to compare JWT_SECRET
    local hammer_jwt=""
    local auth_jwt=""

    if [ -f "services/hammer-orchestrator/.env" ]; then
        hammer_jwt=$(grep "^JWT_SECRET=" services/hammer-orchestrator/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    fi

    if [ -f "services/local-auth/.env" ]; then
        auth_jwt=$(grep "^JWT_SECRET=" services/local-auth/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    fi

    if [ -n "$hammer_jwt" ] && [ -n "$auth_jwt" ]; then
        if [ "$hammer_jwt" = "$auth_jwt" ]; then
            print_success "JWT_SECRET matches between hammer-orchestrator and local-auth"
        else
            print_error "JWT_SECRET mismatch! hammer-orchestrator and local-auth must use the same JWT_SECRET"
            print_info "hammer-orchestrator JWT_SECRET: ${hammer_jwt:0:10}..."
            print_info "local-auth JWT_SECRET: ${auth_jwt:0:10}..."
        fi
    else
        print_warning "Could not verify JWT_SECRET consistency (one or both services not configured)"
    fi
}

# Check for common security issues
check_security() {
    print_header "Security Checks"

    # Check for .env files in git
    if git rev-parse --git-dir > /dev/null 2>&1; then
        if git ls-files | grep -q "\.env$"; then
            print_error "Found .env files tracked in git! Environment files should not be committed."
        else
            print_success "No .env files found in git repository"
        fi
    fi

    # Check .gitignore
    if [ -f ".gitignore" ]; then
        if grep -q "\.env" .gitignore; then
            print_success ".gitignore includes .env files"
        else
            print_warning ".gitignore does not include .env files"
        fi
    fi

    # Check for exposed secrets in environment variables
    if [ "$ENVIRONMENT" = "production" ]; then
        print_info "Reminder: Rotate secrets regularly in production (every 30-90 days)"
        print_info "Reminder: Use a secrets manager (AWS Secrets Manager, Vault) for sensitive data"
    fi
}

# Print summary
print_summary() {
    print_header "Validation Summary"

    echo -e "${GREEN}✅ Passed: $SUCCESS_COUNT${NC}"
    echo -e "${YELLOW}⚠️  Warnings: $WARNING_COUNT${NC}"
    echo -e "${RED}❌ Errors: $ERROR_COUNT${NC}"
    echo ""

    if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
        echo -e "${GREEN}🎉 All checks passed! Environment is properly configured.${NC}"
        return 0
    elif [ $ERROR_COUNT -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Some warnings found. Review and fix if needed.${NC}"
        return 0
    else
        echo -e "${RED}❌ Validation failed! Fix the errors above before deploying.${NC}"
        return 1
    fi
}

# Main execution
main() {
    print_header "Sepulki Environment Validation Script"
    print_info "Environment: $ENVIRONMENT"
    print_info "Service: $SERVICE"
    echo ""

    case "$SERVICE" in
        "forge-ui")
            validate_frontend
            ;;
        "hammer-orchestrator")
            validate_backend
            ;;
        "local-auth")
            validate_auth
            ;;
        "video-stream-proxy")
            validate_video_proxy
            ;;
        "all")
            validate_frontend
            validate_backend
            validate_auth
            validate_video_proxy
            check_jwt_consistency
            ;;
        *)
            print_error "Unknown service: $SERVICE"
            echo "Valid services: forge-ui, hammer-orchestrator, local-auth, video-stream-proxy, all"
            exit 1
            ;;
    esac

    check_security
    print_summary
}

# Run main function
main
exit_code=$?

exit $exit_code
