# Complete Deployment Guide - Sepulki Platform

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Service Deployment](#service-deployment)
5. [Environment Configuration](#environment-configuration)
6. [CI/CD Setup](#cicd-setup)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Cost Analysis](#cost-analysis)
9. [Troubleshooting](#troubleshooting)

## Overview

The Sepulki platform is deployed across multiple services using modern cloud platforms optimized for cost and performance:

- **Frontend**: Vercel (Free tier, auto-scaling)
- **Backend Services**: Railway ($10-15/month)
- **Database**: Neon PostgreSQL (Free tier)
- **Cache/Sessions**: Upstash Redis (Free tier)

**Total Monthly Cost**: ~$10-15/month (minimal for YC demo)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────┐
│             Vercel CDN (Frontend)                           │
│  - Next.js App (forge-ui)                                   │
│  - Static Assets                                             │
│  - Edge Functions                                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ GraphQL/REST
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           Railway (Backend Services)                        │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ hammer-orchestrator  │  │    local-auth        │        │
│  │ (GraphQL API)        │  │  (Auth Service)      │        │
│  │ Port: 4000           │  │  Port: 3001          │        │
│  └──────────┬───────────┘  └──────────┬───────────┘        │
└─────────────┼──────────────────────────┼────────────────────┘
              │                          │
              │                          │
       ┌──────▼──────┐           ┌──────▼──────┐
       │  Neon       │           │  Upstash    │
       │  PostgreSQL │           │  Redis      │
       │  (Database) │           │  (Cache)    │
       └─────────────┘           └─────────────┘
```

## Prerequisites

### Required Accounts

1. **Vercel Account**
   - Sign up: https://vercel.com/signup
   - Install CLI: `npm install -g vercel`

2. **Railway Account**
   - Sign up: https://railway.app/
   - Install CLI: `npm install -g @railway/cli`

3. **Neon Account**
   - Sign up: https://neon.tech/
   - Free tier: 0.5 GB storage

4. **Upstash Account**
   - Sign up: https://upstash.com/
   - Free tier: 10,000 commands/day

5. **GitHub Account**
   - For CI/CD workflows

### Local Tools

```bash
# Install required CLIs
npm install -g vercel@latest
npm install -g @railway/cli
npm install -g neon-cli

# Install PostgreSQL client (for migrations)
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

## Service Deployment

### 1. Frontend Deployment (Vercel)

#### Step 1: Configure Vercel Project

```bash
cd apps/forge-ui

# Login to Vercel
vercel login

# Link to project (creates new project if doesn't exist)
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_GRAPHQL_URL production
# Enter: https://your-railway-app.railway.app/graphql

vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://your-railway-app.railway.app

vercel env add NEXTAUTH_SECRET production
# Generate with: openssl rand -base64 32

vercel env add NEXTAUTH_URL production
# Enter: https://your-domain.vercel.app
```

#### Step 2: Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or use GitHub integration (recommended)
# Push to master branch - auto-deploys via GitHub Actions
```

#### Configuration Files Created:
- `apps/forge-ui/vercel.json` - Vercel configuration
- `.github/workflows/deploy-frontend.yml` - CI/CD workflow

### 2. Backend Deployment (Railway)

#### Step 1: Create Railway Projects

```bash
# Login to Railway
railway login

# Create projects for each service
railway init --name sepulki-hammer
railway init --name sepulki-auth
```

#### Step 2: Configure Environment Variables

**Hammer Orchestrator** (`services/hammer-orchestrator`):

```bash
railway variables set NODE_ENV=production
railway variables set PORT=4000
railway variables set DATABASE_URL=$NEON_DATABASE_URL
railway variables set REDIS_URL=$UPSTASH_REDIS_URL
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set CORS_ORIGIN=https://your-domain.vercel.app
```

**Local Auth** (`services/local-auth`):

```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set DATABASE_URL=$NEON_DATABASE_URL
railway variables set REDIS_URL=$UPSTASH_REDIS_URL
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set SESSION_SECRET=$(openssl rand -base64 32)
```

#### Step 3: Deploy Services

```bash
# Deploy hammer-orchestrator
cd services/hammer-orchestrator
railway up

# Deploy local-auth
cd services/local-auth
railway up
```

#### Configuration Files Created:
- `services/hammer-orchestrator/railway.json` - Railway config
- `services/hammer-orchestrator/Dockerfile` - Container definition
- `services/local-auth/railway.json` - Railway config
- `services/local-auth/Dockerfile` - Container definition
- `.github/workflows/deploy-backend.yml` - CI/CD workflow

### 3. Database Setup (Neon)

#### Step 1: Create Neon Project

```bash
# Via Neon Console (https://console.neon.tech/)
1. Click "New Project"
2. Name: "sepulki-production"
3. Region: "US East (Ohio)"
4. PostgreSQL version: 15

# Or via CLI
neon projects create --name sepulki-production --region aws-us-east-1
```

#### Step 2: Get Connection String

```bash
# From Neon Console
# Navigate to: Project → Connection Details → Connection String

# Format:
postgresql://[user]:[password]@[host]/[database]?sslmode=require

# For connection pooling (recommended):
postgresql://[user]:[password]@[host]/[database]?sslmode=require&pgbouncer=true
```

#### Step 3: Run Migrations

```bash
# Set environment variable
export DATABASE_URL="your-neon-connection-string"

# Run setup script
chmod +x infrastructure/scripts/neon-setup.sh
./infrastructure/scripts/neon-setup.sh

# Or manually with psql
psql $DATABASE_URL -f infrastructure/sql/migrations/002_add_performance_indexes.sql
```

#### Configuration Files Created:
- `infrastructure/neon-config.json` - Neon configuration
- `infrastructure/scripts/neon-setup.sh` - Setup script
- `.github/workflows/run-migrations.yml` - Migration workflow

### 4. Redis Setup (Upstash)

#### Step 1: Create Redis Database

```bash
# Via Upstash Console (https://console.upstash.com/)
1. Click "Create Database"
2. Name: "sepulki-redis"
3. Region: "US East"
4. Type: "Regional"
```

#### Step 2: Get Connection Details

```bash
# From Upstash Console → Database → Details

# REST API (for serverless):
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Redis URL (for backend services):
REDIS_URL=rediss://:your-password@your-db.upstash.io:6379
```

#### Configuration Files Created:
- `config/redis-config.json` - Redis configuration and usage patterns

## Environment Configuration

### Vercel Environment Variables

Create `.env.production` in `apps/forge-ui/`:

```bash
# API Endpoints
NEXT_PUBLIC_GRAPHQL_URL=https://sepulki-hammer.up.railway.app/graphql
NEXT_PUBLIC_API_URL=https://sepulki-hammer.up.railway.app

# Authentication
NEXTAUTH_URL=https://sepulki.vercel.app
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Isaac Sim (if using)
NEXT_PUBLIC_ISAAC_SIM_IP=18.234.83.45
NEXT_PUBLIC_ISAAC_SIM_PORT=8211

# Optional
NEXT_PUBLIC_SENTRY_DSN=<sentry-dsn>
```

### Railway Environment Variables

**Hammer Orchestrator** (`.env.example` in `services/hammer-orchestrator/`):

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=<neon-connection-string>
REDIS_URL=<upstash-redis-url>
JWT_SECRET=<generate-secret>
CORS_ORIGIN=https://sepulki.vercel.app
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
```

**Local Auth** (`.env.example` in `services/local-auth/`):

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=<neon-connection-string>
REDIS_URL=<upstash-redis-url>
JWT_SECRET=<generate-secret>
SESSION_SECRET=<generate-secret>
CORS_ORIGIN=https://sepulki.vercel.app
```

## CI/CD Setup

### GitHub Secrets Configuration

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```bash
# Vercel
VERCEL_TOKEN=<vercel-token>
VERCEL_ORG_ID=<vercel-org-id>
VERCEL_PROJECT_ID=<vercel-project-id>

# Railway
RAILWAY_TOKEN=<railway-token>

# Database
NEON_DATABASE_URL_DEV=<neon-dev-url>
NEON_DATABASE_URL_PROD=<neon-prod-url>

# Optional monitoring
SENTRY_DSN=<sentry-dsn>
```

### Workflows Created

1. **`.github/workflows/deploy-frontend.yml`**
   - Triggers: Push to `master` or `dev`
   - Runs: Tests → Build → Deploy to Vercel

2. **`.github/workflows/deploy-backend.yml`**
   - Triggers: Push to `master` or `dev`
   - Runs: Tests → Docker Build → Deploy to Railway

3. **`.github/workflows/run-migrations.yml`**
   - Triggers: Push to `master` or `dev` (SQL changes)
   - Runs: Validate → Run migrations on Neon

## Monitoring & Health Checks

### Health Check Endpoints

All services expose `/health` endpoints:

```bash
# Frontend (Vercel)
curl https://sepulki.vercel.app/api/health

# Hammer Orchestrator (Railway)
curl https://sepulki-hammer.up.railway.app/health

# Local Auth (Railway)
curl https://sepulki-auth.up.railway.app/health
```

### Monitoring Dashboard

**Railway Built-in**:
- CPU/Memory usage
- Request logs
- Error rates
- Deployment history

**Vercel Analytics**:
- Page views
- Core Web Vitals
- Geographic distribution
- Deployment status

**Neon Metrics**:
- Connection pool usage
- Query performance
- Storage usage
- Backup status

## Cost Analysis

### Monthly Cost Breakdown

| Service | Tier | Cost | Notes |
|---------|------|------|-------|
| Vercel | Free | $0 | 100 GB bandwidth, unlimited deployments |
| Railway | Hobby | $10-15 | 2 services, 500 hours execution |
| Neon | Free | $0 | 0.5 GB storage, 100 hours compute |
| Upstash | Free | $0 | 10,000 commands/day |
| **Total** | | **$10-15** | Perfect for YC demo/MVP |

### Scaling Costs (Future)

| Tier | Monthly Users | Estimated Cost |
|------|---------------|----------------|
| MVP | <1,000 | $10-15 |
| Growth | 1,000-10,000 | $50-100 |
| Scale | 10,000-100,000 | $200-500 |

## Troubleshooting

### Common Issues

#### 1. Vercel Build Failures

```bash
# Check build logs
vercel logs <deployment-url>

# Common fixes:
- Update Node.js version in package.json engines
- Clear Vercel cache: vercel --force
- Check environment variables are set
```

#### 2. Railway Connection Errors

```bash
# Check service logs
railway logs

# Common fixes:
- Verify DATABASE_URL is set correctly
- Check Redis connection string format
- Ensure health check endpoint returns 200
```

#### 3. Database Migration Errors

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Re-run migrations
./infrastructure/scripts/neon-setup.sh

# Check migration status
psql $DATABASE_URL -c "SELECT * FROM information_schema.tables WHERE table_schema='public';"
```

#### 4. CORS Issues

```bash
# Update CORS_ORIGIN in Railway
railway variables set CORS_ORIGIN=https://your-domain.vercel.app

# Verify in next.config.js
# Update connect-src in CSP to include Railway URLs
```

### Health Check Script

```bash
#!/bin/bash
# Run this script to verify all services are healthy

echo "Checking Frontend..."
curl -f https://sepulki.vercel.app/api/health || echo "Frontend: FAIL"

echo "Checking Hammer Orchestrator..."
curl -f https://sepulki-hammer.up.railway.app/health || echo "Hammer: FAIL"

echo "Checking Local Auth..."
curl -f https://sepulki-auth.up.railway.app/health || echo "Auth: FAIL"

echo "Checking Database..."
psql $DATABASE_URL -c "SELECT 1" > /dev/null && echo "Database: OK" || echo "Database: FAIL"

echo "All checks complete!"
```

## Next Steps

1. **Domain Setup**: Configure custom domain in Vercel
2. **SSL Certificates**: Auto-managed by Vercel/Railway
3. **Monitoring**: Set up error tracking with Sentry
4. **Backups**: Configure Neon automatic backups
5. **Scaling**: Monitor usage and upgrade tiers as needed

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Neon Documentation](https://neon.tech/docs)
- [Upstash Documentation](https://docs.upstash.com/)

---

**Deployment Status**: ✅ Ready for YC Demo

**Last Updated**: 2025-11-04
