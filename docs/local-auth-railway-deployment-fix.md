# Local-Auth Railway Deployment Fix

## Problem
Docker build context issue - building from `services/local-auth/` but needs access to workspace root for NPM workspace dependencies.

## Solution Applied

### 1. Updated `railway.json`
**File**: `/Users/dorianhryniewicki/GitHub/Sepulki/services/local-auth/railway.json`

**Changes**:
- Added `"buildContext": "."` to specify root directory as build context
- This allows Docker to access the root `package.json` and `package-lock.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "services/local-auth/Dockerfile.railway",
    "buildContext": ".",  // <-- ADDED
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

### 2. Updated `Dockerfile.railway`
**File**: `/Users/dorianhryniewicki/GitHub/Sepulki/services/local-auth/Dockerfile.railway`

**Key Differences from hammer-orchestrator**:
- local-auth has **NO dependencies** on `packages/` (unlike hammer-orchestrator which uses `@sepulki/shared-types`)
- Both services use NPM workspaces, so root `package.json` and `package-lock.json` are required

**Changes Made**:

#### Stage 1 - Dependencies (Production)
```dockerfile
# Copy workspace package files
COPY package.json package-lock.json* ./
COPY services/local-auth/package.json ./services/local-auth/

# Install production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force
```

#### Stage 2 - Builder (All Dependencies)
```dockerfile
# Copy workspace package files
COPY package.json package-lock.json* ./
COPY services/local-auth/package.json ./services/local-auth/

# Install ALL dependencies (including dev) for build
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY services/local-auth ./services/local-auth

# Build TypeScript
WORKDIR /app/services/local-auth
RUN npm run build
```

#### Stage 3 - Runner (Production)
```dockerfile
# Copy production dependencies from deps stage
COPY --from=deps --chown=auth:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=auth:nodejs /app/services/local-auth/node_modules ./services/local-auth/node_modules

# Copy built application
COPY --from=builder --chown=auth:nodejs /app/services/local-auth/dist ./services/local-auth/dist
COPY --from=builder --chown=auth:nodejs /app/services/local-auth/package.json ./services/local-auth/

# Set working directory
WORKDIR /app/services/local-auth
```

## Verification

### Build Test Command
```bash
cd /Users/dorianhryniewicki/GitHub/Sepulki
docker build -f services/local-auth/Dockerfile.railway -t local-auth-test .
```

### Current Status
✅ **Build Context**: Fixed - Docker can access root workspace files
✅ **Dependencies**: Fixed - NPM workspace installation working
✅ **Multi-stage Build**: Fixed - All stages properly configured
⚠️ **TypeScript Compilation**: Source code has compilation errors that need fixing

### TypeScript Errors Found
```
src/middleware/security.ts(194,38): error TS2339: Property 'generateToken' does not exist on type 'DoubleCsrfUtilities'.
src/middleware/security.ts(205,3): error TS2561: Object literal may only specify known properties, but 'getTokenFromRequest' does not exist in type 'DoubleCsrfConfigOptions'. Did you mean to write 'getCsrfTokenFromRequest'?
src/middleware/security.ts(205,25): error TS7006: Parameter 'req' implicitly has an 'any' type.
```

## Key Differences: local-auth vs hammer-orchestrator

| Aspect | hammer-orchestrator | local-auth |
|--------|-------------------|------------|
| **Package Dependencies** | Uses `@sepulki/shared-types`, `@sepulki/graphql-schema` | No package dependencies |
| **Dockerfile Packages** | Copies `packages/shared-types` and `packages/graphql-schema` | Does NOT copy any packages |
| **Watch Patterns** | `services/hammer-orchestrator/**`, `packages/**` | `services/local-auth/**` only |
| **Build Complexity** | More complex due to package dependencies | Simpler, service-only build |

## Next Steps

1. **Fix TypeScript compilation errors** in `services/local-auth/src/middleware/security.ts`
2. **Test build** again after fixing errors
3. **Deploy to Railway** once build succeeds
4. **Verify health check** endpoint works

## Files Modified

1. `/Users/dorianhryniewicki/GitHub/Sepulki/services/local-auth/railway.json`
2. `/Users/dorianhryniewicki/GitHub/Sepulki/services/local-auth/Dockerfile.railway`

## Coordination Hooks Used

- `npx claude-flow@alpha hooks pre-task` - Task initialization
- `npx claude-flow@alpha hooks post-task` - Task completion (260.75s)
- `npx claude-flow@alpha hooks notify` - Status notification

---

**Date**: 2025-11-07
**Agent**: Code Implementation Agent
**Task Duration**: 260.75 seconds
