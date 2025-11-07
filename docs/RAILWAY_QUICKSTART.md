# Railway Deployment - Quick Start

## TL;DR

Both services are configured to build from the **repository root** using their respective Dockerfiles.

## File Structure

```
/Sepulki (repository root)
├── railway.json                                    # Monorepo config
├── packages/
│   ├── shared-types/
│   └── graphql-schema/
└── services/
    ├── hammer-orchestrator/
    │   ├── railway.json                           # Service config
    │   └── Dockerfile.railway                     # Multi-stage build
    └── local-auth/
        ├── railway.json                           # Service config
        └── Dockerfile.railway                     # Multi-stage build
```

## Configuration Files

### Root: `/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "version": "2.0",
  "monorepo": {
    "services": {
      "hammer-orchestrator": { "root": "services/hammer-orchestrator" },
      "local-auth": { "root": "services/local-auth" }
    }
  }
}
```

### Hammer Orchestrator: `/services/hammer-orchestrator/railway.json`

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "services/hammer-orchestrator/Dockerfile.railway",
    "watchPatterns": ["services/hammer-orchestrator/**", "packages/**"]
  }
}
```

**Key**: Watches both service code AND shared packages.

### Local Auth: `/services/local-auth/railway.json`

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "services/local-auth/Dockerfile.railway",
    "watchPatterns": ["services/local-auth/**"]
  }
}
```

**Key**: Watches only service-specific code.

## Critical Settings

### ✅ CORRECT Configuration

Both services:
- ✅ `dockerfilePath`: Relative to repository root
- ✅ NO `buildContext` or `rootDirectory` in build config
- ✅ Railway uses repository root as build context by default
- ✅ Dockerfiles copy from `/app` (repository root)

### ❌ INCORRECT Patterns to Avoid

```json
// DON'T DO THIS:
{
  "build": {
    "buildContext": ".",              // ❌ Unnecessary and confusing
    "rootDirectory": "/",             // ❌ Breaks the build
    "dockerfilePath": "Dockerfile"    // ❌ Wrong path
  }
}
```

## Deployment Commands

### Quick Deploy (GitHub)

```bash
# 1. Connect to Railway
railway login
railway link

# 2. Push to GitHub
git push origin main

# 3. Railway auto-deploys both services
```

### Manual Deploy (CLI)

```bash
# Deploy hammer-orchestrator
cd services/hammer-orchestrator
railway up

# Deploy local-auth
cd services/local-auth
railway up
```

## Environment Variables

Set these in Railway Dashboard:

### Both Services
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Hammer Orchestrator (Port 4000)
```env
PORT=4000
CORS_ORIGIN=https://your-app.com
```

### Local Auth (Port 3001)
```env
PORT=3001
SESSION_SECRET=your-secret
```

## Health Checks

Both services expose `/health`:
- Hammer: `https://your-service.railway.app/health`
- Auth: `https://your-auth.railway.app/health`

## Verification

```bash
# Check Railway status
railway status

# View logs
railway logs

# Check health
curl https://your-service.railway.app/health
```

## Troubleshooting

### Build fails: "Cannot find package.json"
➜ Railway is not using repository root as build context
➜ Remove any `buildContext` or `rootDirectory` from railway.json

### Build fails: "Cannot find packages/*"
➜ Missing `packages/**` in watchPatterns (hammer-orchestrator only)

### Service won't start
➜ Check environment variables in Railway dashboard
➜ Check logs: `railway logs`

## Next Steps

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for:
- Detailed configuration explanations
- Multi-stage Dockerfile architecture
- Advanced troubleshooting
- CI/CD setup
- Cost optimization

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
