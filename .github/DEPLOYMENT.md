# Deployment Guide

This document provides instructions for setting up CI/CD pipelines and deploying the Sepulki application.

## Table of Contents

1. [Required Secrets](#required-secrets)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Backend Deployment (Railway/Docker)](#backend-deployment-railwaydocker)
4. [Database Migrations](#database-migrations)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## Required Secrets

Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Frontend Deployment

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `VERCEL_TOKEN` | Vercel API token for deployments | Yes |
| `VERCEL_ORG_ID` | Your Vercel organization ID | Yes |
| `VERCEL_PROJECT_ID` | Vercel project ID for this app | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |

### Backend Deployment

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `RAILWAY_TOKEN` | Railway.app API token | Optional* |
| `DEPLOY_HOST` | SSH deployment host | Optional* |
| `DEPLOY_USER` | SSH deployment user | Optional* |
| `DEPLOY_SSH_KEY` | SSH private key for deployment | Optional* |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions | Auto |

*Choose one deployment method (Railway, SSH, or Kubernetes)

### Database Secrets

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `DEV_DATABASE_URL` | Development database connection string | Yes |
| `STAGING_DATABASE_URL` | Staging database connection string | Yes |
| `PROD_DATABASE_URL` | Production database connection string | Yes |
| `AWS_ACCESS_KEY_ID` | AWS credentials for backup storage | Optional |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for backups | Optional |
| `AWS_S3_BUCKET` | S3 bucket name for database backups | Optional |

### Notifications (Optional)

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `SLACK_WEBHOOK` | Slack webhook URL for notifications | No |
| `DISCORD_WEBHOOK` | Discord webhook URL for notifications | No |
| `CODECOV_TOKEN` | Codecov token for test coverage | No |

---

## Frontend Deployment (Vercel)

### Setup Instructions

1. **Create Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Note your Organization ID and Project ID

2. **Generate Vercel Token**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and generate token
   vercel login
   vercel tokens create
   ```

3. **Get Project IDs**
   ```bash
   # Navigate to your frontend directory
   cd app

   # Link to Vercel project
   vercel link

   # Get project details
   vercel project ls
   ```

4. **Add Secrets to GitHub**
   - Go to `Settings > Secrets and variables > Actions > New repository secret`
   - Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

5. **Configure Environment Variables**
   - In Vercel dashboard: `Settings > Environment Variables`
   - Add all `NEXT_PUBLIC_*` variables for production, preview, and development

### Deployment Workflow

- **Automatic**: Pushes to `main`/`master` trigger production deployments
- **Preview**: Pull requests automatically get preview deployments
- **Manual**: Trigger via GitHub Actions UI

### Vercel Configuration

Create `app/vercel.json` if needed:
```json
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

---

## Backend Deployment (Railway/Docker)

### Option 1: Railway Deployment

1. **Create Railway Account**
   - Sign up at [railway.app](https://railway.app)
   - Create a new project

2. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

3. **Initialize Services**
   ```bash
   # For each service
   cd services/hammer-orchestrator
   railway init
   railway up
   ```

4. **Get Railway Token**
   ```bash
   railway tokens create
   ```

5. **Add to GitHub Secrets**
   - Add `RAILWAY_TOKEN` secret
   - Deployments will happen automatically on push to main

### Option 2: Docker + SSH Deployment

1. **Setup Docker Registry**
   - GitHub Container Registry is configured by default
   - Images are automatically pushed on successful builds

2. **Configure SSH Access**
   ```bash
   # Generate SSH key pair
   ssh-keygen -t ed25519 -C "github-actions"

   # Add public key to server's authorized_keys
   cat ~/.ssh/id_ed25519.pub | ssh user@server "cat >> ~/.ssh/authorized_keys"

   # Add private key to GitHub secrets as DEPLOY_SSH_KEY
   ```

3. **Add Secrets**
   - `DEPLOY_HOST`: Your server IP/hostname
   - `DEPLOY_USER`: SSH username
   - `DEPLOY_SSH_KEY`: Private SSH key

4. **Setup Docker Compose on Server**
   ```yaml
   # docker-compose.yml on your server
   version: '3.8'
   services:
     hammer-orchestrator:
       image: ghcr.io/your-username/sepulki/hammer-orchestrator:latest
       ports:
         - "3001:3000"
       environment:
         - DATABASE_URL=${DATABASE_URL}

     local-auth:
       image: ghcr.io/your-username/sepulki/local-auth:latest
       ports:
         - "3002:3000"

     anvil-sim:
       image: ghcr.io/your-username/sepulki/anvil-sim:latest
       ports:
         - "3003:3000"
   ```

### Option 3: Kubernetes Deployment

1. **Setup kubectl access**
   ```bash
   # Export kubeconfig as base64
   cat ~/.kube/config | base64 > kubeconfig.b64
   ```

2. **Add KUBECONFIG secret**
   - Add the base64 encoded kubeconfig to GitHub secrets

3. **Create deployment manifests** (example):
   ```yaml
   # k8s/deployment.yml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: hammer-orchestrator
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: hammer-orchestrator
     template:
       metadata:
         labels:
           app: hammer-orchestrator
       spec:
         containers:
         - name: hammer-orchestrator
           image: ghcr.io/your-username/sepulki/hammer-orchestrator:latest
           ports:
           - containerPort: 3000
   ```

---

## Database Migrations

### Prerequisites

1. **Setup Database Instances**
   - Development: Local PostgreSQL or Neon DB
   - Staging: Neon DB or Railway Postgres
   - Production: Neon DB, Supabase, or AWS RDS

2. **Configure Connection Strings**
   ```bash
   # Format: postgresql://user:password@host:port/database
   DEV_DATABASE_URL=postgresql://localhost:5432/sepulki_dev
   STAGING_DATABASE_URL=postgresql://staging-host:5432/sepulki_staging
   PROD_DATABASE_URL=postgresql://prod-host:5432/sepulki_prod
   ```

### Running Migrations

#### Via GitHub Actions (Recommended)

1. Go to `Actions > Database Migrations > Run workflow`
2. Select:
   - **Environment**: development/staging/production
   - **Action**: migrate/rollback/status
   - **Backup**: true (always recommended for production)
3. For production migrations, approval is required

#### Locally

```bash
# Using Prisma
npx prisma migrate dev --name your_migration_name
npx prisma migrate deploy  # For production

# Using Knex
npx knex migrate:make your_migration_name
npx knex migrate:latest
npx knex migrate:rollback

# Check status
npx prisma migrate status
npx knex migrate:status
```

### Backup and Restore

**Automatic Backups**: Enabled in GitHub Actions workflow before migrations

**Manual Backup**:
```bash
pg_dump $DATABASE_URL > backup.sql
gzip backup.sql
```

**Restore**:
```bash
gunzip backup.sql.gz
psql $DATABASE_URL < backup.sql
```

### Migration Safety Checklist

- [ ] Test migration on development database first
- [ ] Review migration SQL for destructive operations
- [ ] Create backup before running (automatic in workflow)
- [ ] Run during low-traffic period for production
- [ ] Have rollback plan ready
- [ ] Monitor application after migration
- [ ] Verify data integrity post-migration

---

## Environment Variables

### Frontend (Next.js)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Configuration
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Optional: Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Backend Services

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis (if used)
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Third-party APIs
THIRD_PARTY_API_KEY=your-api-key

# Environment
NODE_ENV=production
PORT=3000
```

### Setting Environment Variables

**Vercel**:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Railway**:
```bash
railway variables set DATABASE_URL=postgresql://...
railway variables set REDIS_URL=redis://...
```

**Docker**:
```bash
# In .env file or docker-compose.yml
DATABASE_URL=postgresql://...
```

---

## Troubleshooting

### Frontend Deployment Issues

**Build Fails**:
```bash
# Check build logs in GitHub Actions
# Common issues:
# - Missing environment variables
# - Type errors (run `pnpm exec tsc --noEmit` locally)
# - Lint errors (run `pnpm exec next lint` locally)
```

**Vercel Deployment Fails**:
- Verify `VERCEL_TOKEN` is valid (tokens expire)
- Check `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- Ensure Vercel project is linked to correct GitHub repo

### Backend Deployment Issues

**Docker Build Fails**:
```bash
# Test Docker build locally
cd services/hammer-orchestrator
docker build -t hammer-orchestrator .
docker run -p 3000:3000 hammer-orchestrator
```

**Railway Deployment Fails**:
- Check Railway token is valid
- Verify service names match in CLI and dashboard
- Check Railway logs for detailed error messages

### Database Migration Issues

**Connection Refused**:
- Verify `DATABASE_URL` format is correct
- Check database firewall allows GitHub Actions IPs
- Test connection locally:
  ```bash
  psql $DATABASE_URL -c "SELECT 1"
  ```

**Migration Fails Mid-way**:
- Workflow automatically creates backup before migration
- Restore from backup artifact in GitHub Actions
- Check migration SQL for syntax errors

**Rollback Not Working**:
- Not all migration tools support automatic rollback
- Use backup restoration as fallback
- Create explicit down migrations for each up migration

### Test Failures

**Unit Tests Fail**:
```bash
# Run locally to debug
pnpm test

# Check for:
# - Missing dependencies
# - Environment variables not set
# - Outdated snapshots
```

**E2E Tests Fail**:
```bash
# Run Playwright tests locally
cd app
pnpm exec playwright test --ui

# Common issues:
# - Timing issues (add waits)
# - Selector changes
# - Environment differences
```

### Performance Issues

**Slow Builds**:
- Caching is configured for npm/pnpm, Docker layers
- If cache not working, clear GitHub Actions cache
- Consider using matrix strategy for parallel tests

**Deployment Timeout**:
- Default timeout is 30 minutes for E2E tests
- Increase `timeout-minutes` in workflow if needed
- Optimize test suite (run critical tests first)

---

## Monitoring and Observability

### Recommended Tools

1. **Error Tracking**: Sentry, Rollbar, or Bugsnag
2. **APM**: New Relic, Datadog, or Vercel Analytics
3. **Logs**: Logtail, Papertrail, or CloudWatch
4. **Uptime**: UptimeRobot, Pingdom, or Better Uptime

### Health Checks

Add health check endpoints to all services:

```typescript
// services/*/src/health.ts
export async function healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await checkDatabaseConnection(),
  };
}
```

### Alerts

Configure alerts for:
- Deployment failures (Slack/Discord)
- Health check failures
- Error rate spikes
- Performance degradation

---

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to repository
   - Rotate secrets regularly (every 90 days)
   - Use separate secrets for each environment
   - Limit secret access to necessary workflows

2. **Access Control**
   - Enable branch protection on `main`/`master`
   - Require pull request reviews
   - Require status checks to pass
   - Enable required reviewers for production changes

3. **Dependency Security**
   - Enable Dependabot alerts
   - Configure automated security updates
   - Run `npm audit` regularly
   - Keep Node.js version updated

4. **Database Security**
   - Use SSL connections for databases
   - Restrict database access by IP
   - Use read-only credentials where possible
   - Regular backup testing

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Prisma Migrations Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review this documentation
3. Check service-specific logs (Vercel, Railway)
4. Create an issue in the repository

---

**Last Updated**: 2025-11-04
**Maintained By**: DevOps Team
