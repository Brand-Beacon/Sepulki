#!/usr/bin/env python3
"""
Railway GitHub Connection Script
Connects Railway services to GitHub repository using GraphQL API
"""

import json
import sys
import time
import requests
from typing import Dict, Any, Optional

# Configuration
RAILWAY_TOKEN = "4b6ba995-c08a-46e3-8516-db298d5c8361"
API_ENDPOINT = "https://backboard.railway.app/graphql/v2"
GITHUB_REPO = "Brand-Beacon/Sepulki"
GITHUB_BRANCH = "master"

# Service IDs
HAMMER_SERVICE_ID = "b0f943c3-a4f7-4568-96f4-10ba2f29e1f8"
AUTH_SERVICE_ID = "5384e79a-8bcc-4b12-b607-7fc296508abe"

def graphql_request(query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Make a GraphQL request to Railway API"""
    headers = {
        "Authorization": f"Bearer {RAILWAY_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "query": query,
        "variables": variables or {}
    }

    try:
        response = requests.post(API_ENDPOINT, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return {"errors": [{"message": str(e)}]}

def connect_service_to_github(service_id: str, service_name: str) -> bool:
    """Connect a Railway service to GitHub repository"""
    print(f"\n📦 Connecting {service_name} to GitHub...")

    mutation = """
    mutation ServiceConnectGitHub($serviceId: String!, $repo: String!, $branch: String!) {
      serviceConnect(serviceId: $serviceId, repo: $repo, branch: $branch) {
        id
        name
        serviceInstances {
          id
          source {
            repo
            branch
          }
        }
      }
    }
    """

    variables = {
        "serviceId": service_id,
        "repo": GITHUB_REPO,
        "branch": GITHUB_BRANCH
    }

    response = graphql_request(mutation, variables)

    if "errors" in response:
        print(f"❌ Error connecting {service_name}:")
        for error in response["errors"]:
            print(f"   - {error.get('message', 'Unknown error')}")
        return False

    print(f"✅ {service_name} connected successfully!")
    if "data" in response:
        print(f"   Response: {json.dumps(response['data'], indent=2)}")
    return True

def trigger_deployment(service_id: str, service_name: str) -> bool:
    """Trigger a deployment for a Railway service"""
    print(f"\n🚀 Triggering deployment for {service_name}...")

    mutation = """
    mutation ServiceRedeploy($serviceId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId) {
        id
        status
        createdAt
      }
    }
    """

    variables = {
        "serviceId": service_id
    }

    response = graphql_request(mutation, variables)

    if "errors" in response:
        print(f"❌ Error triggering deployment for {service_name}:")
        for error in response["errors"]:
            print(f"   - {error.get('message', 'Unknown error')}")
        return False

    print(f"✅ Deployment triggered for {service_name}!")
    if "data" in response:
        print(f"   Response: {json.dumps(response['data'], indent=2)}")
    return True

def get_deployment_status(service_id: str, service_name: str) -> bool:
    """Get deployment status for a Railway service"""
    print(f"\n📊 Checking deployment status for {service_name}...")

    query = """
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
    }
    """

    variables = {
        "serviceId": service_id
    }

    response = graphql_request(query, variables)

    if "errors" in response:
        print(f"❌ Error getting deployment status for {service_name}:")
        for error in response["errors"]:
            print(f"   - {error.get('message', 'Unknown error')}")
        return False

    print(f"✅ Deployment status for {service_name}:")
    if "data" in response:
        service = response["data"].get("service", {})
        instances = service.get("serviceInstances", [])
        if instances:
            for idx, instance in enumerate(instances[:3]):  # Show first 3 instances
                print(f"   Instance {idx + 1}:")
                print(f"   - ID: {instance.get('id')}")
                print(f"   - Status: {instance.get('status')}")
                print(f"   - Created: {instance.get('createdAt')}")
                source = instance.get('source', {})
                if source:
                    print(f"   - Repo: {source.get('repo')}")
                    print(f"   - Branch: {source.get('branch')}")
        else:
            print("   No instances found")
    return True

def get_service_info(service_id: str, service_name: str) -> bool:
    """Get detailed service information"""
    print(f"\n📋 Getting service info for {service_name}...")

    query = """
    query ServiceInfo($serviceId: String!) {
      service(id: $serviceId) {
        id
        name
        icon
        createdAt
        updatedAt
      }
    }
    """

    variables = {
        "serviceId": service_id
    }

    response = graphql_request(query, variables)

    if "errors" in response:
        print(f"❌ Error getting service info for {service_name}:")
        for error in response["errors"]:
            print(f"   - {error.get('message', 'Unknown error')}")
        return False

    print(f"✅ Service info for {service_name}:")
    if "data" in response:
        service = response["data"].get("service", {})
        print(f"   - ID: {service.get('id')}")
        print(f"   - Name: {service.get('name')}")
        print(f"   - Created: {service.get('createdAt')}")
        print(f"   - Updated: {service.get('updatedAt')}")
    return True

def main():
    """Main execution"""
    print("=" * 60)
    print("🚀 Railway GitHub Connection Script")
    print("=" * 60)

    success_count = 0
    total_steps = 8

    # Step 1: Get service info for hammer-orchestrator
    print("\n" + "=" * 60)
    print("Step 1: Get service info for hammer-orchestrator")
    print("=" * 60)
    if get_service_info(HAMMER_SERVICE_ID, "hammer-orchestrator"):
        success_count += 1

    # Step 2: Get service info for local-auth
    print("\n" + "=" * 60)
    print("Step 2: Get service info for local-auth")
    print("=" * 60)
    if get_service_info(AUTH_SERVICE_ID, "local-auth"):
        success_count += 1

    # Step 3: Connect hammer-orchestrator to GitHub
    print("\n" + "=" * 60)
    print("Step 3: Connect hammer-orchestrator to GitHub")
    print("=" * 60)
    if connect_service_to_github(HAMMER_SERVICE_ID, "hammer-orchestrator"):
        success_count += 1

    # Step 4: Connect local-auth to GitHub
    print("\n" + "=" * 60)
    print("Step 4: Connect local-auth to GitHub")
    print("=" * 60)
    if connect_service_to_github(AUTH_SERVICE_ID, "local-auth"):
        success_count += 1

    # Step 5: Trigger deployment for hammer-orchestrator
    print("\n" + "=" * 60)
    print("Step 5: Trigger deployment for hammer-orchestrator")
    print("=" * 60)
    if trigger_deployment(HAMMER_SERVICE_ID, "hammer-orchestrator"):
        success_count += 1

    # Step 6: Trigger deployment for local-auth
    print("\n" + "=" * 60)
    print("Step 6: Trigger deployment for local-auth")
    print("=" * 60)
    if trigger_deployment(AUTH_SERVICE_ID, "local-auth"):
        success_count += 1

    # Wait for deployments to start
    print("\n" + "=" * 60)
    print("Waiting 15 seconds for deployments to start...")
    print("=" * 60)
    time.sleep(15)

    # Step 7: Check deployment status for hammer-orchestrator
    print("\n" + "=" * 60)
    print("Step 7: Check deployment status for hammer-orchestrator")
    print("=" * 60)
    if get_deployment_status(HAMMER_SERVICE_ID, "hammer-orchestrator"):
        success_count += 1

    # Step 8: Check deployment status for local-auth
    print("\n" + "=" * 60)
    print("Step 8: Check deployment status for local-auth")
    print("=" * 60)
    if get_deployment_status(AUTH_SERVICE_ID, "local-auth"):
        success_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("✨ Railway GitHub Connection Process Complete!")
    print("=" * 60)
    print(f"\n📊 Summary: {success_count}/{total_steps} steps completed successfully")
    print("\n📝 Next steps:")
    print("   - Monitor deployments in Railway dashboard")
    print("   - Check deployment logs: railway logs -s hammer-orchestrator")
    print("   - Check deployment logs: railway logs -s local-auth")
    print("   - Verify health checks pass at /health endpoint")
    print("   - Test service endpoints")
    print("\n" + "=" * 60)

    return 0 if success_count == total_steps else 1

if __name__ == "__main__":
    sys.exit(main())
