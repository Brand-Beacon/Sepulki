# Railway Monorepo Configuration Research

**Research Date:** 2025-11-07
**Status:** ✅ COMPLETE
**Critical Finding:** `railway.json` files are NOT being read because they're in the wrong location

---

## 🚨 ROOT CAUSE IDENTIFIED

Railway is **NOT reading the `railway.json` files** in the service subdirectories because:

1. **File Location Issue**: Railway config files placed in service subdirectories (`services/hammer-orchestrator/railway.json`) are NOT automatically detected
2. **Configuration Precedence**: Railway expects either:
   - Config file at **repository root** (`/railway.json` or `/railway.toml`)
   - **Absolute path** specified in service settings (e.g., `/services/hammer-orchestrator/railway.json`)
   - **Environment variables** set in Railway dashboard

---

## 📋 RAILWAY CONFIGURATION METHODS (Priority Order)

### Method 1: Environment Variables (HIGHEST PRIORITY) ⭐ RECOMMENDED
- **RAILWAY_DOCKERFILE_PATH**: Specifies path to Dockerfile
- **Root Directory Setting**: Set in Railway service settings
- **Pros**:
  - Works immediately without file changes
  - Overrides everything else
  - Most reliable for monorepos
- **Cons**: Must configure in dashboard for each service

### Method 2: Config File at Repository Root
- **Location**: `/railway.json` or `/railway.toml` at repo root
- **Scope**: Single service per file (not suitable for multi-service monorepos)
- **Priority**: Overrides dashboard settings
- **Issue**: Our monorepo has multiple services, can't use one root config

### Method 3: Custom Config File Path
- **Location**: Set in Railway service settings → "Config File Path"
- **Must use absolute path**: `/services/hammer-orchestrator/railway.json`
- **Note**: The Railway Config File does NOT follow the Root Directory path
- **Limitation**: Must be configured per service in dashboard

---

## 🔍 CURRENT CONFIGURATION ISSUES

### Issue #1: Hammer Orchestrator
**Current Setup:**
```json
// Location: services/hammer-orchestrator/railway.json
{
  "build": {
    "dockerfilePath": "services/hammer-orchestrator/Dockerfile.railway",
    "rootDirectory": "/"
  }
}
```

**Problems:**
- ❌ File not being read (Railway doesn't auto-detect in subdirectories)
- ❌ `rootDirectory` is "/" (builds from monorepo root but Railway can't find files)
- ❌ Dockerfile expects monorepo context (`COPY package.json` from root)

### Issue #2: Local-Auth Service
**Current Setup:**
```json
// Location: services/local-auth/railway.json
{
  "build": {
    "dockerfilePath": "services/local-auth/Dockerfile.railway",
    "buildContext": "."
  }
}
```

**Problems:**
- ❌ File not being read (same location issue)
- ❌ `buildContext: "."` is ambiguous (. relative to what?)
- ❌ Dockerfile expects monorepo root context

---

## ✅ CORRECT CONFIGURATION FOR MONOREPO

### Option A: Environment Variables (SIMPLEST) ⭐

**For Hammer Service:**
```bash
# Set in Railway Dashboard → hammer-orchestrator → Variables
RAILWAY_DOCKERFILE_PATH=services/hammer-orchestrator/Dockerfile.railway

# Set in Railway Dashboard → hammer-orchestrator → Settings
Root Directory: (leave empty or set to "/")
```

**For Local-Auth Service:**
```bash
# Set in Railway Dashboard → local-auth → Variables
RAILWAY_DOCKERFILE_PATH=services/local-auth/Dockerfile.railway

# Set in Railway Dashboard → local-auth → Settings
Root Directory: (leave empty or set to "/")
```

**Why this works:**
- Dockerfile builds from repository root (has access to all workspace files)
- `RAILWAY_DOCKERFILE_PATH` tells Railway exactly which Dockerfile to use
- No config file parsing issues

### Option B: Config File with Absolute Paths

**Step 1:** Keep config files where they are

**Step 2:** Configure in Railway Dashboard:
```
Service Settings → Config File Path:
- Hammer: /services/hammer-orchestrator/railway.json
- Local-Auth: /services/local-auth/railway.json
```

**Step 3:** Update railway.json files to remove `rootDirectory`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "services/hammer-orchestrator/Dockerfile.railway"
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

---

## 📁 DOCKERFILE CONTEXT REQUIREMENTS

Both Dockerfiles REQUIRE monorepo root as build context:

### Hammer Dockerfile.railway (lines 22-25):
```dockerfile
COPY package.json package-lock.json* ./
COPY services/hammer-orchestrator/package.json ./services/hammer-orchestrator/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/graphql-schema/package.json ./packages/graphql-schema/
```

### Local-Auth Dockerfile.railway (lines 22-23):
```dockerfile
COPY package.json package-lock.json* ./
COPY services/local-auth/package.json ./services/local-auth/
```

**Both copy from repository root**, so:
- ✅ Build context MUST be repository root "/"
- ✅ Railway should NOT set a Root Directory for these services
- ✅ Use `RAILWAY_DOCKERFILE_PATH` to specify which Dockerfile

---

## 🎯 RECOMMENDED SOLUTION

### Immediate Fix (No File Changes):

**1. Remove service-specific railway.json files** (they're not being used):
```bash
rm services/hammer-orchestrator/railway.json
rm services/local-auth/railway.json
```

**2. Configure in Railway Dashboard:**

**Hammer Service:**
- Go to: hammer-orchestrator → Settings
- Root Directory: (clear this field - leave empty)
- Variables → Add Variable:
  ```
  RAILWAY_DOCKERFILE_PATH=services/hammer-orchestrator/Dockerfile.railway
  ```

**Local-Auth Service:**
- Go to: local-auth → Settings
- Root Directory: (clear this field - leave empty)
- Variables → Add Variable:
  ```
  RAILWAY_DOCKERFILE_PATH=services/local-auth/Dockerfile.railway
  ```

**3. Redeploy both services**

---

## 📊 CONFIGURATION COMPARISON

| Method | Priority | Monorepo Support | Ease of Use | Recommended |
|--------|----------|------------------|-------------|-------------|
| Environment Variables | Highest | ✅ Excellent | ⭐⭐⭐⭐⭐ | **YES** |
| Config at Root | High | ❌ Single service only | ⭐⭐ | No |
| Custom Config Path | Medium | ✅ Good | ⭐⭐⭐ | Alternative |
| Dashboard Only | Lowest | ✅ Good | ⭐⭐⭐⭐ | Yes (simple cases) |

---

## 🔧 RAILWAY CLI COMMANDS

```bash
# Check current configuration
railway status

# List all services
railway service

# Switch to specific service
railway link
# (Select service from list)

# View service variables
railway variables

# Add variable
railway variables set RAILWAY_DOCKERFILE_PATH=services/hammer-orchestrator/Dockerfile.railway

# Trigger deployment
railway up
```

---

## 📚 KEY DOCUMENTATION REFERENCES

1. **Config as Code**: https://docs.railway.com/guides/config-as-code
   - Railway supports `railway.json` and `railway.toml`
   - Config in code ALWAYS overrides dashboard settings
   - Custom config path must be absolute (e.g., `/backend/railway.toml`)

2. **Monorepo Guide**: https://docs.railway.com/guides/monorepo
   - For shared monorepos, do NOT set root directory
   - Use watch paths to prevent cross-service rebuilds
   - Build runs at repository base

3. **Dockerfile Guide**: https://docs.railway.com/guides/dockerfiles
   - Set `RAILWAY_DOCKERFILE_PATH` for custom paths
   - Default: looks for `Dockerfile` (capital D) at root

---

## 🎯 WATCH PATHS CONFIGURATION

After fixing the build, configure watch paths to prevent unnecessary rebuilds:

**Hammer Service:**
```json
{
  "build": {
    "watchPaths": [
      "services/hammer-orchestrator/**",
      "packages/**"
    ]
  }
}
```

**Local-Auth Service:**
```json
{
  "build": {
    "watchPaths": [
      "services/local-auth/**"
    ]
  }
}
```

---

## ✅ VALIDATION CHECKLIST

- [ ] Remove unused `railway.json` files from service directories
- [ ] Set `RAILWAY_DOCKERFILE_PATH` in Railway dashboard for both services
- [ ] Clear "Root Directory" setting in both services
- [ ] Verify Dockerfiles expect monorepo root context
- [ ] Test deployment for hammer-orchestrator
- [ ] Test deployment for local-auth
- [ ] Configure watch paths to optimize rebuilds
- [ ] Document final configuration in repo

---

## 🚀 NEXT STEPS

1. **Immediate**: Set `RAILWAY_DOCKERFILE_PATH` environment variables in dashboard
2. **Short-term**: Remove unused config files, redeploy services
3. **Medium-term**: Add watch paths to prevent unnecessary rebuilds
4. **Long-term**: Consider Railway templates for repeatable deployments
