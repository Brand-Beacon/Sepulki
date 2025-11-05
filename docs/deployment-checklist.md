# Deployment Checklist

## Pre-Deployment

- [ ] Create Vercel account and install CLI
- [ ] Create Railway account and install CLI
- [ ] Create Neon account and database
- [ ] Create Upstash Redis database
- [ ] Generate all required secrets (JWT, session, NextAuth)
- [ ] Review and update environment variables

## Vercel Setup

- [ ] Link project: `vercel link`
- [ ] Configure production environment variables
- [ ] Configure preview environment variables
- [ ] Test local build: `npm run build`
- [ ] Deploy preview: `vercel`
- [ ] Deploy production: `vercel --prod`
- [ ] Configure custom domain (optional)
- [ ] Test frontend health check

## Railway Setup

### Hammer Orchestrator
- [ ] Create Railway project
- [ ] Set environment variables
- [ ] Deploy with Docker: `railway up`
- [ ] Verify deployment logs
- [ ] Test health endpoint: `/health`
- [ ] Test GraphQL endpoint: `/graphql`

### Local Auth
- [ ] Create Railway project
- [ ] Set environment variables
- [ ] Deploy with Docker: `railway up`
- [ ] Verify deployment logs
- [ ] Test health endpoint: `/health`
- [ ] Test authentication endpoints

## Database Setup

- [ ] Create Neon project
- [ ] Get connection string (pooled)
- [ ] Test connection: `psql $DATABASE_URL -c "SELECT 1"`
- [ ] Run migrations: `./infrastructure/scripts/neon-setup.sh`
- [ ] Verify schema: Check tables exist
- [ ] Configure automatic backups
- [ ] Set up connection pooling

## Redis Setup

- [ ] Create Upstash Redis database
- [ ] Get REST URL and token
- [ ] Get Redis connection URL
- [ ] Test connection
- [ ] Update backend services with Redis URL
- [ ] Verify caching works

## GitHub Actions

- [ ] Add VERCEL_TOKEN to GitHub secrets
- [ ] Add VERCEL_ORG_ID to GitHub secrets
- [ ] Add VERCEL_PROJECT_ID to GitHub secrets
- [ ] Add RAILWAY_TOKEN to GitHub secrets
- [ ] Add NEON_DATABASE_URL_DEV to GitHub secrets
- [ ] Add NEON_DATABASE_URL_PROD to GitHub secrets
- [ ] Test frontend workflow: Push to dev branch
- [ ] Test backend workflow: Push to dev branch
- [ ] Test migration workflow: Modify SQL file

## Integration Testing

- [ ] Frontend can reach backend GraphQL API
- [ ] Authentication flow works end-to-end
- [ ] Database queries execute successfully
- [ ] Redis caching is operational
- [ ] WebSocket connections work (if applicable)
- [ ] File uploads work (if applicable)
- [ ] All health checks return 200 OK

## Security Checklist

- [ ] All secrets are environment variables (not hardcoded)
- [ ] HTTPS enabled on all services
- [ ] CORS configured correctly
- [ ] CSP headers configured in next.config.js
- [ ] Rate limiting enabled on backend
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled
- [ ] Session secrets are strong and unique
- [ ] Database uses SSL connections

## Performance Checklist

- [ ] Images optimized and using Next.js Image component
- [ ] Database indexes created (002_add_performance_indexes.sql)
- [ ] Redis caching configured for frequent queries
- [ ] CDN caching configured for static assets
- [ ] GraphQL queries optimized (no N+1 problems)
- [ ] Connection pooling enabled for database
- [ ] Compression enabled on all services

## Monitoring Setup

- [ ] Configure Vercel Analytics
- [ ] Configure Railway metrics dashboard
- [ ] Set up error tracking (Sentry optional)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Configure alerts for critical errors
- [ ] Test alert notifications

## Documentation

- [ ] Update README with deployment URLs
- [ ] Document environment variables
- [ ] Create runbook for common issues
- [ ] Document rollback procedures
- [ ] Create architecture diagram
- [ ] Document API endpoints
- [ ] Update changelog

## Post-Deployment

- [ ] Smoke test all major features
- [ ] Verify all pages load correctly
- [ ] Test user registration and login
- [ ] Test robot fleet visualization
- [ ] Test task creation and management
- [ ] Verify telemetry data flow
- [ ] Check performance metrics
- [ ] Review error logs
- [ ] Monitor resource usage
- [ ] Plan for scaling if needed

## YC Demo Specific

- [ ] Prepare demo script
- [ ] Test demo flow end-to-end
- [ ] Prepare backup demo environment
- [ ] Document key metrics to highlight
- [ ] Prepare answers for common questions
- [ ] Create demo video/screenshots
- [ ] Test on multiple devices/browsers
- [ ] Have rollback plan ready

---

## Quick Deployment Commands

```bash
# Full deployment from scratch
./scripts/deploy-all.sh

# Individual deployments
vercel --prod  # Frontend
railway up     # Backend services
./infrastructure/scripts/neon-setup.sh  # Database
```

## Emergency Rollback

```bash
# Rollback Vercel deployment
vercel rollback <deployment-url>

# Rollback Railway deployment
railway rollback

# Restore database from backup
# (via Neon console or CLI)
```

---

**Status**: Ready for deployment ✅
