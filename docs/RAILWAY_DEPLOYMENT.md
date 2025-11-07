# Railway Deployment Guide - Sepulki Monorepo

## Overview

This monorepo contains two services that are deployed to Railway:
- **Hammer Orchestrator** - GraphQL API gateway and fleet orchestration (Port 4000)
- **Local Auth** - Authentication service with session management (Port 3001)

## Configuration Structure

### Monorepo Setup

Railway detects this as a monorepo through the root `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "version": "2.0",
  "monorepo": {
    "services": {
      "hammer-orchestrator": {
        "root": "services/hammer-orchestrator"
      },
      "local-auth": {
        "root": "services/local-auth"
      }
    }
  }
}
```

### Service Configurations

Each service has its own `railway.json` in its directory:

#### Hammer Orchestrator (`services/hammer-orchestrator/railway.json`)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "services/hammer-orchestrator/Dockerfile.railway",
    "watchPatterns": [
      "services/hammer-orchestrator/**",
      "packages/**"
    ]
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

**Key Points:**
- Dockerfile path is relative to **repository root**
- Watch patterns trigger rebuilds when files change in:
  - `services/hammer-orchestrator/**` - Service code
  - `packages/**` - Shared packages (shared-types, graphql-schema)
- Health check endpoint: `/health` (timeout: 300s for startup)
- Automatic restart on failure (max 10 retries)

#### Local Auth (`services/local-auth/railway.json`)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "services/local-auth/Dockerfile.railway",
    "watchPatterns": [
      "services/local-auth/**"
    ]
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

**Key Points:**
- Dockerfile path is relative to **repository root**
- Watch patterns trigger rebuilds only for service-specific changes
- Health check endpoint: `/health` (timeout: 300s)
- Automatic restart on failure (max 10 retries)

## Dockerfile Architecture

Both services use **multi-stage builds** for optimized production deployments:

### Stage 1: Dependencies
- Base image: `node:18-alpine`
- Installs native module dependencies (python3, make, g++)
- Copies workspace package files from **repository root**
- Runs `npm ci --only=production`

### Stage 2: Builder
- Copies dependencies from deps stage
- Copies source code from **repository root**
- Builds TypeScript to JavaScript (`npm run build`)

### Stage 3: Runner (Production)
- Minimal runtime image with `dumb-init` for signal handling
- Creates non-root user for security
- Copies production dependencies and built code
- Exposes service port
- Includes health check configuration
- Uses `dumb-init` as entrypoint for proper signal handling

## Build Context

⚠️ **CRITICAL**: Both Dockerfiles build from the **repository root** (`/`)

This is because they need access to:
- Root-level `package.json` and `package-lock.json`
- Shared packages in `/packages` (for hammer-orchestrator)
- Service-specific code in `/services/{service-name}`

Railway automatically uses the repository root as the build context when `dockerfilePath` is specified.

## Deployment Steps

### Option 1: GitHub Integration (Recommended)

1. **Connect Repository to Railway**
   ```bash
   railway login
   railway link
   ```

2. **Deploy from Dashboard**
   - Go to https://railway.app/dashboard
   - Select your project
   - Click "New" → "GitHub Repo"
   - Select the repository
   - Railway will detect the monorepo configuration

3. **Configure Each Service**
   - Railway auto-detects services from root `railway.json`
   - Each service deploys with its own `railway.json` configuration
   - Set environment variables in Railway dashboard

### Option 2: Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Project**
   ```bash
   # From repository root
   railway init
   ```

3. **Deploy Specific Service**
   ```bash
   # Deploy hammer-orchestrator
   cd services/hammer-orchestrator
   railway up

   # Deploy local-auth
   cd services/local-auth
   railway up
   ```

### Option 3: Manual Dashboard Configuration

If Railway doesn't auto-detect the monorepo:

1. **Create Services Manually**
   - Go to Railway dashboard
   - Create two separate services

2. **Configure Hammer Orchestrator**
   - Service Name: `hammer-orchestrator`
   - Root Directory: `services/hammer-orchestrator`
   - Dockerfile Path: `services/hammer-orchestrator/Dockerfile.railway`
   - Build Context: Repository root (leave empty/default)
   - Watch Paths:
     - `services/hammer-orchestrator/**`
     - `packages/**`

3. **Configure Local Auth**
   - Service Name: `local-auth`
   - Root Directory: `services/local-auth`
   - Dockerfile Path: `services/local-auth/Dockerfile.railway`
   - Build Context: Repository root (leave empty/default)
   - Watch Paths:
     - `services/local-auth/**`

## Environment Variables

### Hammer Orchestrator

Required environment variables (set in Railway dashboard):

```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# GraphQL
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false

# CORS
CORS_ORIGIN=https://your-frontend.app

# Auth (if needed)
JWT_SECRET=your-secret-key
```

### Local Auth

Required environment variables (set in Railway dashboard):

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Session
SESSION_SECRET=your-session-secret
SESSION_COOKIE_DOMAIN=.your-domain.com

# CORS
CORS_ORIGIN=https://your-frontend.app
```

## Health Checks

Both services expose a `/health` endpoint:

- **Hammer Orchestrator**: `http://localhost:4000/health`
- **Local Auth**: `http://localhost:3001/health`

Railway uses these for:
- Deployment readiness checks
- Service health monitoring
- Automatic restarts on failure

## Troubleshooting

### Build Fails: "Cannot find package.json"

**Issue**: Dockerfile can't find workspace files

**Solution**:
- Verify `dockerfilePath` is relative to repository root
- Check that Railway is using repository root as build context
- Ensure `railway.json` doesn't specify incorrect `rootDirectory` or `buildContext`

### Build Fails: "Cannot find packages/*"

**Issue**: Shared packages not accessible (hammer-orchestrator only)

**Solution**:
- Add `packages/**` to `watchPatterns` in `railway.json`
- Verify Dockerfile COPY commands use correct paths from root

### Service Crashes Immediately

**Issue**: Health check fails or startup error

**Solution**:
- Check Railway logs for error messages
- Verify all required environment variables are set
- Increase `healthcheckTimeout` if service needs more startup time
- Check that ports match (4000 for hammer, 3001 for auth)

### Rebuilds Not Triggering

**Issue**: Changes don't trigger new deployments

**Solution**:
- Check `watchPatterns` in `railway.json`
- Verify patterns match changed files
- Try manual redeploy from Railway dashboard

## Verification

After deployment, verify services are running:

```bash
# Check hammer-orchestrator
curl https://your-hammer-service.railway.app/health

# Check local-auth
curl https://your-auth-service.railway.app/health

# Check Railway status
railway status
```

## Networking

### Internal Service Communication

If services need to communicate:

1. Railway provides internal DNS: `servicename.railway.internal`
2. Use environment variables for service URLs:
   ```env
   # In hammer-orchestrator
   AUTH_SERVICE_URL=http://local-auth.railway.internal:3001

   # In local-auth
   ORCHESTRATOR_URL=http://hammer-orchestrator.railway.internal:4000
   ```

### External Access

Railway provides public URLs:
- Hammer Orchestrator: `https://hammer-orchestrator-production.up.railway.app`
- Local Auth: `https://local-auth-production.up.railway.app`

Configure custom domains in Railway dashboard if needed.

## CI/CD

### Automatic Deployments

Railway automatically deploys when:
- Changes are pushed to the main branch (if GitHub connected)
- Watch pattern files are modified
- Manual deployment triggered

### Deployment Guards

Consider adding GitHub Actions for:
- Running tests before deployment
- Type checking
- Linting
- Security scanning

Example `.github/workflows/railway-deploy.yml`:

```yaml
name: Railway Deploy Guards

on:
  push:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run typecheck
```

## Cost Optimization

### Resource Limits

Monitor and adjust:
- `numReplicas`: Start with 1, scale as needed
- Health check timeouts: Balance startup time vs quick failure detection
- Watch patterns: Only include necessary paths to avoid unnecessary rebuilds

### Monorepo Benefits

- **Shared dependencies**: Packages cached across services
- **Coordinated deployments**: Deploy related changes together
- **Resource sharing**: Common build cache reduces build times

## Support

For Railway-specific issues:
- Documentation: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

For service-specific issues:
- Check service logs in Railway dashboard
- Review health check endpoints
- Verify environment variables
- Consult service-specific documentation
