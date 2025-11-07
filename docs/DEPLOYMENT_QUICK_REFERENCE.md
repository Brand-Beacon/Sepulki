# Deployment Quick Reference Card

**🚨 START HERE:** Use this card for quick deployment commands and troubleshooting.

---

## 🔥 Emergency Fixes (Copy-Paste Ready)

### Remove Exposed Secrets (RIGHT NOW)

```bash
# Add to .gitignore
echo ".env.deploy" >> .gitignore
echo ".env.production" >> .gitignore

# Remove from git
git rm --cached .env.deploy
git add .gitignore
git commit -m "security: Remove exposed secrets"
git push origin dev
```

### Generate New Secrets

```bash
# Generate all secrets at once
echo "# SAVE THESE TO PASSWORD MANAGER" > .env.new-secrets
echo "JWT_SECRET=$(openssl rand -hex 64)" >> .env.new-secrets
echo "SESSION_SECRET=$(openssl rand -hex 64)" >> .env.new-secrets
echo "NEXTAUTH_SECRET=$(openssl rand -hex 64)" >> .env.new-secrets
cat .env.new-secrets
```

---

## 🚀 Deployment Commands

### Railway Deployment

```bash
# Link to project (first time only)
railway link

# Deploy hammer-orchestrator
railway up -s hammer-orchestrator

# Deploy local-auth
railway up -s local-auth

# Check status
railway status -s hammer-orchestrator
railway status -s local-auth

# View logs
railway logs -s hammer-orchestrator
railway logs -s local-auth
```

### Vercel Deployment

```bash
# Link to project (first time only)
cd apps/forge-ui
vercel link

# Deploy to production
vercel --prod

# Check status
vercel inspect

# View logs
vercel logs
```

---

## ⚙️ Environment Variables

### Railway - hammer-orchestrator

```bash
railway variables set NODE_ENV=production -s hammer-orchestrator
railway variables set DATABASE_URL="<NEON_URL>" -s hammer-orchestrator
railway variables set REDIS_URL="<UPSTASH_URL>" -s hammer-orchestrator
railway variables set JWT_SECRET="<SECRET>" -s hammer-orchestrator
railway variables set ALLOWED_ORIGINS="https://your-app.vercel.app" -s hammer-orchestrator
railway variables set PORT=4000 -s hammer-orchestrator
```

### Railway - local-auth

```bash
railway variables set NODE_ENV=production -s local-auth
railway variables set DATABASE_URL="<NEON_URL>" -s local-auth
railway variables set REDIS_URL="<UPSTASH_URL>" -s local-auth
railway variables set JWT_SECRET="<SECRET>" -s local-auth
railway variables set SESSION_SECRET="<SECRET>" -s local-auth
railway variables set CORS_ORIGIN="https://your-app.vercel.app" -s local-auth
railway variables set PORT=3001 -s local-auth
```

### Vercel - forge-ui

```bash
cd apps/forge-ui
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add NEXT_PUBLIC_GRAPHQL_ENDPOINT production
vercel env add DATABASE_URL production
```

---

## 🧪 Testing Commands

### Test Health Endpoints

```bash
# Hammer Orchestrator
curl https://hammer-orchestrator-production-XXXX.up.railway.app/health

# Local Auth
curl https://local-auth-production-XXXX.up.railway.app/health

# Expected: {"status":"ok","checks":{"database":"healthy","redis":"healthy"}}
```

### Test HTTPS Redirect

```bash
# Should return 301 redirect
curl -I http://hammer-orchestrator-production-XXXX.up.railway.app/health
```

### Test CORS

```bash
# From allowed origin (should succeed)
curl -H "Origin: https://your-app.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  https://hammer-orchestrator-production-XXXX.up.railway.app/graphql

# From disallowed origin (should fail)
curl -H "Origin: https://evil-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  https://hammer-orchestrator-production-XXXX.up.railway.app/graphql
```

### Test Authentication

```bash
# Get signin page
curl https://local-auth-production-XXXX.up.railway.app/auth/signin

# Test login (replace with actual URL)
curl -X POST https://local-auth-production-XXXX.up.railway.app/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@sepulki.com","password":"dev123"}' \
  -c cookies.txt

# Test session
curl https://local-auth-production-XXXX.up.railway.app/auth/session \
  -b cookies.txt
```

---

## 🔍 Monitoring Commands

### Railway

```bash
# View service status
railway status -s hammer-orchestrator

# View metrics
railway metrics -s hammer-orchestrator

# View logs (last 100 lines)
railway logs -s hammer-orchestrator --lines 100

# Follow logs (live)
railway logs -s hammer-orchestrator --follow
```

### Vercel

```bash
# View deployment status
vercel ls

# View logs for latest deployment
vercel logs

# View logs for specific deployment
vercel logs <deployment-url>
```

### Database (Neon)

```bash
# Connect to database
psql "postgresql://user:pass@host/db?sslmode=require"

# Check connection count
SELECT count(*) FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('neondb'));
```

### Redis (Upstash)

```bash
# Using redis-cli (install first: npm i -g redis-cli)
redis-cli -u "rediss://default:password@host:6379"

# Check connection
> PING

# Get info
> INFO

# Check key count
> DBSIZE
```

---

## 🐛 Common Issues & Fixes

### Issue: CORS Error

```bash
# Check current CORS setting
railway variables -s local-auth | grep CORS_ORIGIN

# Update with correct URL
railway variables set CORS_ORIGIN="https://exact-url.vercel.app" -s local-auth

# Verify it took effect
railway logs -s local-auth | grep CORS
```

### Issue: Health Check Failing

```bash
# Check what's failing
curl https://service-url/health

# If database unhealthy, check DATABASE_URL
railway variables -s SERVICE_NAME | grep DATABASE_URL

# If redis unhealthy, check REDIS_URL
railway variables -s SERVICE_NAME | grep REDIS_URL

# Check logs for errors
railway logs -s SERVICE_NAME | grep -i error
```

### Issue: Authentication Not Working

```bash
# 1. Verify JWT_SECRET matches
railway variables -s local-auth | grep JWT_SECRET
railway variables -s hammer-orchestrator | grep JWT_SECRET
# Should be IDENTICAL

# 2. Check cookie settings in logs
railway logs -s local-auth | grep cookie

# 3. Verify HTTPS is working
curl -I https://local-auth-url/health
# Should be 200 OK, not redirect
```

### Issue: Frontend Can't Connect to Backend

```bash
# 1. Check backend is running
curl https://hammer-orchestrator-url/health

# 2. Verify GRAPHQL_ENDPOINT is set correctly in Vercel
vercel env ls

# 3. Check CORS on backend
railway variables -s hammer-orchestrator | grep ALLOWED_ORIGINS

# 4. Test GraphQL endpoint directly
curl -X POST https://hammer-orchestrator-url/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

### Issue: Service Won't Start

```bash
# 1. Check build logs
railway logs -s SERVICE_NAME

# 2. Common issues:
# - Missing environment variable
railway variables -s SERVICE_NAME

# - Port already in use
railway variables set PORT=4000 -s SERVICE_NAME

# - Database connection failed
# Verify DATABASE_URL is correct

# 3. Restart service
railway up -s SERVICE_NAME
```

---

## 📊 Critical URLs

### Production Dashboards

| Service | Dashboard URL |
|---------|--------------|
| Railway | https://railway.app/dashboard |
| Vercel | https://vercel.com/dashboard |
| Neon | https://console.neon.tech |
| Upstash | https://console.upstash.com |

### Service URLs (Update after deployment)

| Service | URL | Health Check |
|---------|-----|--------------|
| Frontend | `https://______.vercel.app` | N/A |
| Hammer | `https://hammer-______.up.railway.app` | `/health` |
| Auth | `https://local-auth-______.up.railway.app` | `/health` |

### Rotate Credentials

| Service | URL to Regenerate |
|---------|-------------------|
| Vercel Token | https://vercel.com/account/tokens |
| Railway Token | https://railway.app/account/tokens |
| Neon Password | Neon Console → Settings → Reset |
| Upstash Password | Upstash Console → Database → Details |

---

## 🔒 Security Checklist

Quick verification after deployment:

```bash
# 1. Secrets removed from git
git log --all --oneline | grep -i secret
# Should show commit removing them

# 2. .gitignore updated
cat .gitignore | grep ".env.deploy"
# Should show .env.deploy

# 3. HTTPS working
curl -I https://your-service-url/health
# Should return 200, not 301 redirect

# 4. CORS configured
curl -H "Origin: https://your-app.vercel.app" \
  -X OPTIONS https://hammer-url/graphql
# Should include Access-Control-Allow-Origin

# 5. Health checks passing
curl https://hammer-url/health
curl https://auth-url/health
# Both should return status: "ok"

# 6. Environment variables set
railway variables -s hammer-orchestrator
railway variables -s local-auth
vercel env ls
# All required variables present

# 7. Secrets are strong
railway variables -s hammer-orchestrator | grep JWT_SECRET
# Should be 128 characters (64 bytes hex)
```

---

## 🚨 Emergency Rollback

If something goes wrong:

```bash
# Railway - Rollback to previous deployment
railway rollback -s hammer-orchestrator
railway rollback -s local-auth

# Vercel - Rollback to previous deployment
vercel rollback

# Or rollback to specific deployment
vercel rollback <deployment-url>

# Check status
railway status -s hammer-orchestrator
vercel ls
```

---

## 📞 Support

| Issue | Contact |
|-------|---------|
| Railway down | https://railway.app/help |
| Vercel down | https://vercel.com/support |
| Database issue | Neon Console Support |
| Redis issue | Upstash Console Support |
| Code issue | Check `docs/` folder |

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `DEPLOYMENT_SECURITY_AUDIT.md` | Full security audit |
| `DEPLOYMENT_QUICK_FIX_GUIDE.md` | Step-by-step fixes |
| `DEPLOYMENT_REVIEW_SUMMARY.md` | Executive summary |
| `DEPLOYMENT_QUICK_REFERENCE.md` | This file (quick commands) |

---

## ⏱️ Quick Timeline

| Task | Time | Status |
|------|------|--------|
| Remove secrets | 15 min | ⏸️ Pending |
| Generate secrets | 5 min | ⏸️ Pending |
| Rotate credentials | 10 min | ⏸️ Pending |
| Apply code fixes | 30 min | ⏸️ Pending |
| Deploy & test | 30 min | ⏸️ Pending |
| **TOTAL** | **1.5 hrs** | ⏸️ Pending |

---

**💡 Pro Tip:** Bookmark this file for quick access during deployments and troubleshooting!

**Last Updated:** 2025-11-05
