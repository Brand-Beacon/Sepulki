#!/bin/bash

# Railway GitHub Connection Script
# Connects Railway services to GitHub repository using GraphQL API

set -e

# Configuration
RAILWAY_TOKEN="4b6ba995-c08a-46e3-8516-db298d5c8361"
API_ENDPOINT="https://backboard.railway.app/graphql/v2"
GITHUB_REPO="Brand-Beacon/Sepulki"
GITHUB_BRANCH="master"

# Service IDs
HAMMER_SERVICE_ID="b0f943c3-a4f7-4568-96f4-10ba2f29e1f8"
AUTH_SERVICE_ID="5384e79a-8bcc-4b12-b607-7fc296508abe"

echo "============================================================"
echo "🚀 Railway GitHub Connection Script"
echo "============================================================"
echo ""

# Function to make GraphQL requests
graphql_request() {
    local query="$1"
    local variables="$2"

    # Escape query for JSON
    local escaped_query=$(echo "$query" | jq -Rs .)

    curl -s -X POST "$API_ENDPOINT" \
        -H "Authorization: Bearer $RAILWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $escaped_query, \"variables\": $variables}"
}

# Function to get service info
get_service_info() {
    local service_id="$1"
    local service_name="$2"

    echo "📋 Getting service info for $service_name..."

    local query='
    query ServiceInfo($serviceId: String!) {
      service(id: $serviceId) {
        id
        name
        icon
        createdAt
        updatedAt
      }
    }'

    local variables="{\"serviceId\": \"$service_id\"}"

    local response=$(graphql_request "$query" "$variables")

    if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
        echo "❌ Error getting service info for $service_name:"
        echo "$response" | jq '.errors'
        return 1
    else
        echo "✅ Service info for $service_name:"
        echo "$response" | jq '.data.service'
        return 0
    fi
}

# Function to connect service to GitHub
connect_service_to_github() {
    local service_id="$1"
    local service_name="$2"

    echo "📦 Connecting $service_name to GitHub..."

    # Try different mutation names as Railway API may have variations
    local mutation='
    mutation ServiceConnectGitHub($serviceId: String!, $repo: String!, $branch: String!) {
      serviceConnect(serviceId: $serviceId, repo: $repo, branch: $branch) {
        id
        name
      }
    }'

    local variables="{\"serviceId\": \"$service_id\", \"repo\": \"$GITHUB_REPO\", \"branch\": \"$GITHUB_BRANCH\"}"

    local response=$(graphql_request "$mutation" "$variables")

    if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
        echo "⚠️  First attempt failed, trying alternative mutation..."

        # Try alternative mutation format
        mutation='
        mutation ServiceUpdate($serviceId: String!, $input: ServiceUpdateInput!) {
          serviceUpdate(id: $serviceId, input: $input) {
            id
            name
          }
        }'

        variables="{\"serviceId\": \"$service_id\", \"input\": {\"source\": {\"repo\": \"$GITHUB_REPO\", \"branch\": \"$GITHUB_BRANCH\"}}}"

        response=$(graphql_request "$mutation" "$variables")

        if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
            echo "❌ Error connecting $service_name:"
            echo "$response" | jq '.errors'
            return 1
        fi
    fi

    echo "✅ $service_name connection initiated!"
    echo "$response" | jq '.data'
    return 0
}

# Function to trigger deployment using redeploy
trigger_deployment() {
    local service_id="$1"
    local service_name="$2"

    echo "🚀 Triggering deployment for $service_name..."

    local mutation='
    mutation ServiceRedeploy($serviceId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId) {
        id
        status
        createdAt
      }
    }'

    local variables="{\"serviceId\": \"$service_id\"}"

    local response=$(graphql_request "$mutation" "$variables")

    if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
        echo "❌ Error triggering deployment for $service_name:"
        echo "$response" | jq '.errors'
        return 1
    else
        echo "✅ Deployment triggered for $service_name!"
        echo "$response" | jq '.data'
        return 0
    fi
}

# Function to get deployment status
get_deployment_status() {
    local service_id="$1"
    local service_name="$2"

    echo "📊 Checking deployment status for $service_name..."

    local query='
    query ServiceInstances($serviceId: String!) {
      service(id: $serviceId) {
        id
        name
        serviceInstances {
          id
          status
          createdAt
          source {
            repo
            branch
          }
        }
      }
    }'

    local variables="{\"serviceId\": \"$service_id\"}"

    local response=$(graphql_request "$query" "$variables")

    if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
        echo "❌ Error getting deployment status for $service_name:"
        echo "$response" | jq '.errors'
        return 1
    else
        echo "✅ Service instances for $service_name:"
        echo "$response" | jq '.data.service'
        return 0
    fi
}

# Main execution
echo "============================================================"
echo "Step 1: Get service info for hammer-orchestrator"
echo "============================================================"
get_service_info "$HAMMER_SERVICE_ID" "hammer-orchestrator"
echo ""

echo "============================================================"
echo "Step 2: Get service info for local-auth"
echo "============================================================"
get_service_info "$AUTH_SERVICE_ID" "local-auth"
echo ""

echo "============================================================"
echo "Step 3: Connect hammer-orchestrator to GitHub"
echo "============================================================"
connect_service_to_github "$HAMMER_SERVICE_ID" "hammer-orchestrator"
echo ""

echo "============================================================"
echo "Step 4: Connect local-auth to GitHub"
echo "============================================================"
connect_service_to_github "$AUTH_SERVICE_ID" "local-auth"
echo ""

echo "============================================================"
echo "Step 5: Trigger deployment for hammer-orchestrator"
echo "============================================================"
trigger_deployment "$HAMMER_SERVICE_ID" "hammer-orchestrator"
echo ""

echo "============================================================"
echo "Step 6: Trigger deployment for local-auth"
echo "============================================================"
trigger_deployment "$AUTH_SERVICE_ID" "local-auth"
echo ""

echo "============================================================"
echo "Waiting 15 seconds for deployments to start..."
echo "============================================================"
sleep 15
echo ""

echo "============================================================"
echo "Step 7: Check deployment status for hammer-orchestrator"
echo "============================================================"
get_deployment_status "$HAMMER_SERVICE_ID" "hammer-orchestrator"
echo ""

echo "============================================================"
echo "Step 8: Check deployment status for local-auth"
echo "============================================================"
get_deployment_status "$AUTH_SERVICE_ID" "local-auth"
echo ""

echo "============================================================"
echo "✨ Railway GitHub Connection Process Complete!"
echo "============================================================"
echo ""
echo "📝 Next steps:"
echo "   - Monitor deployments in Railway dashboard"
echo "   - Check deployment logs: railway logs -s hammer-orchestrator"
echo "   - Check deployment logs: railway logs -s local-auth"
echo "   - Verify health checks pass at /health endpoint"
echo "   - Test service endpoints"
echo ""
echo "============================================================"
