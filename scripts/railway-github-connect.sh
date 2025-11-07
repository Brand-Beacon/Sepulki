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

echo "🚀 Railway GitHub Connection Script"
echo "===================================="
echo ""

# Function to make GraphQL requests
graphql_request() {
    local query="$1"
    local variables="$2"

    curl -s -X POST "$API_ENDPOINT" \
        -H "Authorization: Bearer $RAILWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$query" | jq -Rs .), \"variables\": $variables}"
}

# Function to connect service to GitHub
connect_service_to_github() {
    local service_id="$1"
    local service_name="$2"

    echo "📦 Connecting $service_name to GitHub..."

    # GraphQL mutation to connect service to GitHub
    read -r -d '' MUTATION <<'EOF' || true
mutation ServiceConnectGitHub($serviceId: String!, $repo: String!, $branch: String!) {
  serviceConnectGithub(
    serviceId: $serviceId
    repo: $repo
    branch: $branch
  ) {
    id
    name
    source {
      repo
      branch
    }
  }
}
EOF

    local variables="{\"serviceId\": \"$service_id\", \"repo\": \"$GITHUB_REPO\", \"branch\": \"$GITHUB_BRANCH\"}"

    local response=$(graphql_request "$MUTATION" "$variables")

    if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
        echo "❌ Error connecting $service_name:"
        echo "$response" | jq '.errors'
        return 1
    else
        echo "✅ $service_name connected successfully!"
        echo "$response" | jq '.data'
        return 0
    fi
}

# Function to trigger deployment
trigger_deployment() {
    local service_id="$1"
    local service_name="$2"

    echo "🚀 Triggering deployment for $service_name..."

    read -r -d '' MUTATION <<'EOF' || true
mutation ServiceDeploy($serviceId: String!) {
  serviceDeploy(serviceId: $serviceId) {
    id
    status
    createdAt
  }
}
EOF

    local variables="{\"serviceId\": \"$service_id\"}"

    local response=$(graphql_request "$MUTATION" "$variables")

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

    read -r -d '' QUERY <<'EOF' || true
query ServiceDeployments($serviceId: String!) {
  service(id: $serviceId) {
    id
    name
    deployments(first: 5) {
      edges {
        node {
          id
          status
          createdAt
          meta
        }
      }
    }
  }
}
EOF

    local variables="{\"serviceId\": \"$service_id\"}"

    local response=$(graphql_request "$QUERY" "$variables")

    if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
        echo "❌ Error getting deployment status for $service_name:"
        echo "$response" | jq '.errors'
        return 1
    else
        echo "✅ Deployment status for $service_name:"
        echo "$response" | jq '.data.service.deployments.edges[0].node'
        return 0
    fi
}

# Main execution
echo "Step 1: Connect hammer-orchestrator to GitHub"
echo "----------------------------------------------"
connect_service_to_github "$HAMMER_SERVICE_ID" "hammer-orchestrator"
echo ""

echo "Step 2: Connect local-auth to GitHub"
echo "-------------------------------------"
connect_service_to_github "$AUTH_SERVICE_ID" "local-auth"
echo ""

echo "Step 3: Trigger deployment for hammer-orchestrator"
echo "--------------------------------------------------"
trigger_deployment "$HAMMER_SERVICE_ID" "hammer-orchestrator"
echo ""

echo "Step 4: Trigger deployment for local-auth"
echo "-----------------------------------------"
trigger_deployment "$AUTH_SERVICE_ID" "local-auth"
echo ""

echo "Step 5: Wait for deployments to start (10 seconds)"
echo "--------------------------------------------------"
sleep 10
echo ""

echo "Step 6: Check deployment status for hammer-orchestrator"
echo "-------------------------------------------------------"
get_deployment_status "$HAMMER_SERVICE_ID" "hammer-orchestrator"
echo ""

echo "Step 7: Check deployment status for local-auth"
echo "----------------------------------------------"
get_deployment_status "$AUTH_SERVICE_ID" "local-auth"
echo ""

echo "✨ Railway GitHub connection process complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "- Monitor deployments in Railway dashboard"
echo "- Check deployment logs: railway logs -s <service-name>"
echo "- Verify health checks pass"
