# Railway Deployment Checklist

Use this checklist to deploy both services to Railway.

## Pre-Deployment

### Configuration Files
- [x] Root `railway.json` configured with monorepo structure
- [x] `services/hammer-orchestrator/railway.json` configured
- [x] `services/local-auth/railway.json` configured
- [x] Both Dockerfiles use repository root as build context
- [x] Watch patterns configured correctly

### Verification
- [x] Run `./scripts/verify-railway-config.sh` - All checks passed

### Local Testing (Optional)
- [ ] Build hammer-orchestrator locally: `docker build -f services/hammer-orchestrator/Dockerfile.railway -t hammer-test .`
- [ ] Build local-auth locally: `docker build -f services/local-auth/Dockerfile.railway -t auth-test .`
- [ ] Test local builds work correctly

## Railway Setup

### Initial Setup
- [ ] Install Railway CLI: `npm install -g @railway/cli`
- [ ] Login to Railway: `railway login`
- [ ] Link repository: `railway link`

### Database Setup
- [ ] Create PostgreSQL database in Railway
- [ ] Note down `DATABASE_URL`
- [ ] Create Redis instance (if needed)
- [ ] Note down `REDIS_URL`

## Environment Variables

### Hammer Orchestrator (Port 4000)

Set these in Railway Dashboard for hammer-orchestrator service:

- [ ] `NODE_ENV=production`
- [ ] `PORT=4000`
- [ ] `HOST=0.0.0.0`
- [ ] `DATABASE_URL` (from Railway PostgreSQL)
- [ ] `REDIS_URL` (from Railway Redis)
- [ ] `GRAPHQL_PLAYGROUND=false`
- [ ] `GRAPHQL_INTROSPECTION=false`
- [ ] `CORS_ORIGIN` (your frontend URL)
- [ ] `JWT_SECRET` (generate secure random string)
- [ ] Any other service-specific variables

### Local Auth (Port 3001)

Set these in Railway Dashboard for local-auth service:

- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `HOST=0.0.0.0`
- [ ] `DATABASE_URL` (from Railway PostgreSQL)
- [ ] `REDIS_URL` (from Railway Redis)
- [ ] `SESSION_SECRET` (generate secure random string)
- [ ] `SESSION_COOKIE_DOMAIN` (your domain)
- [ ] `CORS_ORIGIN` (your frontend URL)
- [ ] Any other service-specific variables

### Generate Secure Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Deployment

### GitHub Auto-Deploy (Recommended)
- [ ] Connect Railway to GitHub repository
- [ ] Configure branch to deploy (main/master)
- [ ] Push code: `git push origin main`
- [ ] Railway auto-detects services and deploys

### Manual CLI Deploy
- [ ] Deploy hammer-orchestrator: `cd services/hammer-orchestrator && railway up`
- [ ] Deploy local-auth: `cd services/local-auth && railway up`

### Dashboard Deploy
- [ ] Create "hammer-orchestrator" service in Railway dashboard
- [ ] Set root directory: `services/hammer-orchestrator`
- [ ] Set Dockerfile path: `services/hammer-orchestrator/Dockerfile.railway`
- [ ] Configure watch patterns
- [ ] Create "local-auth" service in Railway dashboard
- [ ] Set root directory: `services/local-auth`
- [ ] Set Dockerfile path: `services/local-auth/Dockerfile.railway`
- [ ] Configure watch patterns

## Post-Deployment

### Verify Deployments
- [ ] Check hammer-orchestrator logs: `railway logs -s hammer-orchestrator`
- [ ] Check local-auth logs: `railway logs -s local-auth`
- [ ] Test hammer health: `curl https://your-hammer-service.railway.app/health`
- [ ] Test auth health: `curl https://your-auth-service.railway.app/health`
- [ ] Verify GraphQL playground (if enabled): `https://your-hammer-service.railway.app/graphql`

### Service URLs
- [ ] Note hammer-orchestrator URL: `https://__________.railway.app`
- [ ] Note local-auth URL: `https://__________.railway.app`
- [ ] Configure custom domains (optional)

### Inter-Service Communication
If services need to talk to each other:
- [ ] Add `AUTH_SERVICE_URL=http://local-auth.railway.internal:3001` to hammer env vars
- [ ] Add `ORCHESTRATOR_URL=http://hammer-orchestrator.railway.internal:4000` to auth env vars

### Database Migrations
- [ ] Run database migrations for hammer-orchestrator
- [ ] Run database migrations for local-auth
- [ ] Verify database schema is correct

### Monitoring
- [ ] Set up Railway alerts for service failures
- [ ] Configure log retention
- [ ] Set up uptime monitoring (optional)
- [ ] Configure error tracking (Sentry, etc.)

## Troubleshooting

### Build Failures

#### "Cannot find package.json"
- [ ] Verify `dockerfilePath` is relative to repository root
- [ ] Check no `buildContext` or `rootDirectory` in service railway.json
- [ ] Railway should use repository root automatically

#### "Cannot find packages/*" (hammer-orchestrator)
- [ ] Verify `packages/**` in watchPatterns
- [ ] Check Dockerfile copies packages from root

#### Build timeout
- [ ] Check Railway build logs for specific errors
- [ ] Verify all dependencies are in package.json
- [ ] Check for network issues during npm install

### Deployment Failures

#### Health check fails
- [ ] Verify `/health` endpoint exists in service
- [ ] Check service starts without errors in logs
- [ ] Increase `healthcheckTimeout` if needed (already 300s)

#### Service crashes immediately
- [ ] Check Railway logs for error messages
- [ ] Verify all environment variables are set
- [ ] Check database connection string is correct
- [ ] Verify ports match (4000 for hammer, 3001 for auth)

#### Service can't connect to database
- [ ] Verify `DATABASE_URL` is set correctly
- [ ] Check database is running in Railway
- [ ] Verify service has network access to database
- [ ] Check database credentials

### Runtime Issues

#### CORS errors
- [ ] Verify `CORS_ORIGIN` environment variable is set
- [ ] Check origin matches frontend URL exactly
- [ ] Review CORS configuration in service code

#### Session issues (local-auth)
- [ ] Verify `SESSION_SECRET` is set
- [ ] Check `SESSION_COOKIE_DOMAIN` matches your domain
- [ ] Verify Redis is running if using Redis sessions

#### GraphQL errors (hammer-orchestrator)
- [ ] Check GraphQL schema is valid
- [ ] Verify resolvers are working
- [ ] Check database connections
- [ ] Review GraphQL logs

## Rollback Plan

If deployment fails:
- [ ] Identify problematic commit
- [ ] Revert to previous working commit: `git revert [commit-hash]`
- [ ] Push revert: `git push origin main`
- [ ] Railway auto-deploys reverted version
- [ ] Or use Railway dashboard to redeploy previous version

## Optimization

### Cost Optimization
- [ ] Review resource usage in Railway dashboard
- [ ] Adjust `numReplicas` if needed
- [ ] Monitor and optimize build times
- [ ] Review watch patterns to avoid unnecessary rebuilds

### Performance
- [ ] Enable Redis caching
- [ ] Configure database connection pooling
- [ ] Review application logs for slow queries
- [ ] Set up CDN for static assets (if applicable)

## Security

### Secrets Management
- [ ] Verify no secrets in code or Git history
- [ ] All secrets in Railway environment variables
- [ ] Rotate secrets regularly
- [ ] Use different secrets for production vs staging

### Access Control
- [ ] Review Railway project access
- [ ] Configure team member permissions
- [ ] Set up audit logging
- [ ] Enable 2FA for Railway account

### Network Security
- [ ] Configure CORS properly
- [ ] Review API rate limiting
- [ ] Set up DDoS protection (Railway provides this)
- [ ] Configure security headers in services

## Documentation

- [ ] Update team wiki with Railway URLs
- [ ] Document environment variables and their purposes
- [ ] Create runbook for common issues
- [ ] Document deployment process for team

## Continuous Improvement

- [ ] Set up automated tests in CI/CD
- [ ] Configure deployment notifications (Slack, Discord, etc.)
- [ ] Monitor error rates and performance
- [ ] Review and optimize build times
- [ ] Keep dependencies updated

---

## Quick Reference Commands

```bash
# Verify configuration
./scripts/verify-railway-config.sh

# Railway login
railway login

# Link repository
railway link

# View logs
railway logs -s hammer-orchestrator
railway logs -s local-auth

# Check status
railway status

# Deploy manually
cd services/hammer-orchestrator && railway up
cd services/local-auth && railway up

# Generate secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Support Resources

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Docs: `/docs/RAILWAY_DEPLOYMENT.md`
- Quick Start: `/docs/RAILWAY_QUICKSTART.md`

---

**Status**: Ready for deployment
**Last Updated**: [Current Date]
**Configuration Verified**: ✅ All checks passed
