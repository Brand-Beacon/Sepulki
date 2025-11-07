# GitHub Secrets Inventory

Complete inventory of GitHub repository secrets required for Sepulki deployments.

**Location:** Settings → Secrets and variables → Actions

**Total Secrets:** 43 (28 currently set, 15 DEV_* to add)

---

## Currently Set (28 secrets)

### Platform Authentication (2)
- ✅ `VERCEL_TOKEN` - Vercel API authentication token
- ✅ `RAILWAY_TOKEN` - Railway API authentication token

### Platform Identifiers (7)
- ✅ `VERCEL_ORG_ID` - `team_kInU2r2UcEzXkzNsM64AemCb`
- ✅ `VERCEL_PROJECT_ID` - `prj_BGEfxDbNnVpfhlebVDxk5CSgALTT`
- ✅ `RAILWAY_PROJECT_ID` - `cb1982ed-db09-409e-8af5-5bbd40e248f4`
- ✅ `RAILWAY_ENVIRONMENT_PROD_ID` - `abf76fbf-45aa-4948-932d-3642876c99f5`
- ✅ `RAILWAY_SERVICE_HAMMER_ID` - `b0f943c3-a4f7-4568-96f4-10ba2f29e1f8`
- ✅ `RAILWAY_SERVICE_AUTH_ID` - `5384e79a-8bcc-4b12-b607-7fc296508abe`
- ⏳ `RAILWAY_ENVIRONMENT_DEV_ID` - *To be created*

### Production Secrets (PROD_* - 17)

**Frontend (Vercel) - 8 secrets:**
- `PROD_NEXT_PUBLIC_API_URL` - `https://hammer-orchestrator-production.up.railway.app`
- `PROD_NEXT_PUBLIC_GRAPHQL_URL` - `https://hammer-orchestrator-production.up.railway.app/graphql`
- `PROD_NEXT_PUBLIC_GRAPHQL_ENDPOINT` - `https://hammer-orchestrator-production.up.railway.app/graphql`
- `PROD_NEXT_PUBLIC_GRAPHQL_WS_URL` - `wss://hammer-orchestrator-production.up.railway.app/graphql`
- `PROD_NEXT_PUBLIC_ISAAC_SIM_IP` - `18.234.83.45`
- `PROD_NEXT_PUBLIC_ISAAC_SIM_PORT` - `8211`
- `PROD_NEXTAUTH_SECRET` - Base64 secret (64 chars)
- `PROD_NEXTAUTH_URL` - `https://sepulki-forge-2ex4yvbuu-monermakers.vercel.app`

**Shared (Upstash Redis) - 5 secrets:**
- `PROD_KV_URL` - Upstash Redis connection string
- `PROD_KV_REST_API_URL` - `https://pro-skunk-34069.upstash.io`
- `PROD_KV_REST_API_TOKEN` - Upstash API token
- `PROD_KV_REST_API_READ_ONLY_TOKEN` - Upstash read-only token
- `PROD_REDIS_URL` - Same as PROD_KV_URL

**Backend (Railway) - 4 secrets:**
- ✅ `PROD_RAILWAY_DATABASE_URL` - Neon PostgreSQL connection
- ✅ `PROD_RAILWAY_JWT_SECRET` - JWT signing key (Base64, 64 chars)
- ✅ `PROD_RAILWAY_SESSION_SECRET` - Session encryption key (Base64, 64 chars)
- ✅ `PROD_RAILWAY_CORS_ORIGIN` - Frontend URL for CORS

---

## To Add: Development Secrets (DEV_* - 17)

### Development Environment Notes

**Before adding DEV_* secrets, you must:**
1. Create Railway development environment:
   ```bash
   railway environment create development
   ```
2. Note the environment ID for `RAILWAY_ENVIRONMENT_DEV_ID`
3. Optionally create separate Neon database for dev
4. Use same Upstash Redis or create dev instance

### Development Secrets to Add

**Frontend (Vercel) - 8 secrets:**
- `DEV_NEXT_PUBLIC_API_URL` - Dev Railway URL
- `DEV_NEXT_PUBLIC_GRAPHQL_URL` - Dev GraphQL HTTP endpoint
- `DEV_NEXT_PUBLIC_GRAPHQL_ENDPOINT` - Same as above
- `DEV_NEXT_PUBLIC_GRAPHQL_WS_URL` - Dev GraphQL WebSocket
- `DEV_NEXT_PUBLIC_ISAAC_SIM_IP` - `18.234.83.45` (same)
- `DEV_NEXT_PUBLIC_ISAAC_SIM_PORT` - `8211` (same)
- `DEV_NEXTAUTH_SECRET` - Generate new 64-char secret
- `DEV_NEXTAUTH_URL` - Dev Vercel preview URL

**Shared (Redis) - 5 secrets:**
- `DEV_KV_URL` - Dev Upstash Redis URL
- `DEV_KV_REST_API_URL` - Dev Upstash REST endpoint
- `DEV_KV_REST_API_TOKEN` - Dev Upstash token
- `DEV_KV_REST_API_READ_ONLY_TOKEN` - Dev read-only token
- `DEV_REDIS_URL` - Same as DEV_KV_URL

**Backend (Railway) - 4 secrets:**
- `DEV_RAILWAY_DATABASE_URL` - Dev database (separate or same as prod)
- `DEV_RAILWAY_JWT_SECRET` - Dev JWT key (can differ from prod)
- `DEV_RAILWAY_SESSION_SECRET` - Dev session key
- `DEV_RAILWAY_CORS_ORIGIN` - Dev frontend URL

---

## Secret Generation Commands

### Generate Random Secrets

```bash
# Generate 64-character hex secret for JWT/Session
openssl rand -hex 32

# Generate 32-character alphanumeric
openssl rand -base64 32
```

### Add Secrets via GitHub CLI

```bash
# Platform IDs
gh secret set RAILWAY_ENVIRONMENT_DEV_ID -b"<environment-id>"

# Development secrets (repeat for each)
gh secret set DEV_NEXT_PUBLIC_API_URL -b"https://hammer-dev.railway.app"
gh secret set DEV_RAILWAY_DATABASE_URL -b"postgresql://..."
# ... etc
```

---

## Secret Usage in Workflows

### Production Workflow

File: `.github/workflows/deploy-production.yml`

**Triggers:** Push to `master` branch

**Uses:**
- All `PROD_*` prefixed secrets
- Platform identifiers (no prefix)
- `VERCEL_TOKEN`, `RAILWAY_TOKEN`

### Development Workflow

File: `.github/workflows/deploy-dev.yml` (to be created)

**Triggers:** Push to `dev` branch

**Uses:**
- All `DEV_*` prefixed secrets
- Platform identifiers (no prefix)
- `VERCEL_TOKEN`, `RAILWAY_TOKEN`
- `RAILWAY_ENVIRONMENT_DEV_ID`

---

## Security Best Practices

### Secret Rotation Schedule

**Quarterly Rotation (Every 3 months):**
- `PROD_RAILWAY_JWT_SECRET`
- `PROD_RAILWAY_SESSION_SECRET`
- `PROD_NEXTAUTH_SECRET`
- All DEV_* equivalents

**Annual Rotation (Every 12 months):**
- `VERCEL_TOKEN`
- `RAILWAY_TOKEN`

**On Compromise (Immediate):**
- Rotate all affected secrets immediately
- Deploy new secrets via GitHub Actions
- Invalidate old secrets in platform dashboards

### Access Control

**Who can view/edit secrets:**
- Repository admins
- Users with "maintain" or "admin" role

**Audit:**
- Secret changes are logged in GitHub audit log
- View at: Settings → Security → Audit log

### Never Commit

**NEVER commit these to repository:**
- `.env.production`
- `.env.development`
- `*.secrets.json`
- `.secrets.env`
- Any file with credentials

**Added to .gitignore:**
```gitignore
*.secrets.json
deploy/env/*.secrets.json
.env.production
.env.development
.env.local
.secrets.env
```

---

## Verification Checklist

Before deploying to production, verify:

- [ ] All 28+ secrets visible in GitHub Settings
- [ ] Secret names match workflow YAML exactly (case-sensitive)
- [ ] Railway environment IDs are correct
- [ ] Vercel project ID matches dashboard
- [ ] Database URLs are valid and reachable
- [ ] Redis URLs are valid and reachable
- [ ] JWT/Session secrets are 64+ characters
- [ ] CORS origins match frontend URLs
- [ ] NextAuth secret is cryptographically random
- [ ] No secrets in code or config files
- [ ] `.gitignore` blocks all secret file patterns

---

## Troubleshooting

### Secret Not Found in Workflow

**Error:** `Secret PROD_RAILWAY_DATABASE_URL not found`

**Fix:**
1. Check exact spelling in workflow file
2. Verify secret exists: `gh secret list`
3. Add if missing: `gh secret set PROD_RAILWAY_DATABASE_URL`

### Invalid Secret Value

**Error:** Service fails with authentication error

**Fix:**
1. Verify secret format (e.g., connection strings)
2. Test secret locally if possible
3. Regenerate if corrupted
4. Update in GitHub and redeploy

### Secret Visible in Logs

**Error:** Secret appears in GitHub Actions logs

**Fix:**
- GitHub automatically masks registered secrets
- If visible, it's not registered as a secret
- Add it properly via Settings → Secrets
- Rotate the compromised secret immediately

---

## Quick Reference

### List All Secrets
```bash
gh secret list -R CatsMeow492/Sepulki
```

### Add/Update Secret
```bash
gh secret set SECRET_NAME -b"secret-value" -R CatsMeow492/Sepulki
```

### Delete Secret
```bash
gh secret delete SECRET_NAME -R CatsMeow492/Sepulki
```

### Bulk Import (from file)
```bash
# Create temporary file (delete after!)
cat > .secrets.tmp << 'EOF'
SECRET_ONE=value1
SECRET_TWO=value2
EOF

gh secret set -f .secrets.tmp -R CatsMeow492/Sepulki
rm .secrets.tmp
```

---

## Migration Status

**Date:** November 7, 2025

**Completed:**
- ✅ Platform identifiers (7/7)
- ✅ Platform auth tokens (2/2)
- ✅ Production secrets (17/17)
- ⏳ Development secrets (0/17)

**Next Steps:**
1. Create Railway development environment
2. Add `RAILWAY_ENVIRONMENT_DEV_ID` to GitHub
3. Add all 17 DEV_* secrets to GitHub
4. Create `.github/workflows/deploy-dev.yml`
5. Test deployment on `dev` branch

---

**Last Updated:** November 7, 2025
**Maintained By:** Development Team
**Review Schedule:** Monthly
