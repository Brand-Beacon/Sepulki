# Sepulki Deployment Strategy - YC Demo Production Readiness

## Executive Summary

This document outlines the comprehensive deployment strategy for the Sepulki robot fleet management platform, focusing on getting the application production-ready for the YC demo. The strategy balances rapid deployment needs with production-grade reliability and scalability.

**Target Timeline**: 2-3 weeks to production
**Demo Requirements**: High availability, low latency, professional polish
**Budget Constraint**: $200-500/month initial, scalable to $1000+/month

---

## 1. Infrastructure Requirements

### 1.1 Hosting Platform Selection

#### **Frontend (Next.js - forge-ui)**
**Recommendation: Vercel (Optimal)**
- **Pros**:
  - Native Next.js optimization and automatic deployments
  - Edge network (CDN included) for global low latency
  - Zero-config SSL/HTTPS
  - Preview deployments for every PR
  - Excellent developer experience
  - Free tier → Pro tier scalability ($20/month)
- **Pricing**:
  - Free tier: Sufficient for demo
  - Pro tier: $20/month (upgrade if needed)

**Alternative: AWS Amplify**
- Cost: ~$15-30/month
- Better if already using AWS ecosystem

#### **Backend (GraphQL API - hammer-orchestrator)**
**Recommendation: Railway or Render**

**Railway (Recommended)**
- **Pros**:
  - Easy PostgreSQL integration
  - Built-in Redis support
  - Simple environment management
  - Docker-native deployment
  - Excellent for Node.js/TypeScript
- **Pricing**: $5/month + usage (~$20-40/month total)

**Render (Alternative)**
- Similar features, slightly different pricing model
- $7/month per service + database costs
- Total: ~$30-50/month

**AWS ECS/Fargate (Enterprise Option)**
- For post-demo scaling
- Cost: ~$50-150/month
- More complexity, better for large-scale production

### 1.2 Database Hosting

#### **PostgreSQL (Primary Database)**
**Recommendation: Railway PostgreSQL or Neon**

**Railway PostgreSQL**
- Integrated with app hosting
- Cost: Included in Railway plan + storage (~$10-15/month)
- Automatic backups
- Connection pooling built-in

**Neon (Serverless PostgreSQL) - Preferred for Demo**
- **Pros**:
  - Serverless, pay-per-use
  - Instant branching (great for staging)
  - Automatic scaling
  - Free tier: 3GB storage
  - Branch-per-PR workflows
- **Pricing**:
  - Free tier for demo
  - Pro: $19/month (upgrade if needed)

**Supabase (Alternative)**
- PostgreSQL + real-time subscriptions
- Cost: Free tier → $25/month Pro
- Includes authentication, storage

#### **Redis (Caching/Real-time)**
**Recommendation: Upstash Redis**
- Serverless Redis
- Free tier: 10,000 commands/day
- Pay-per-use pricing
- Global replication
- Cost: Free → $10/month

**Alternative: Railway Redis**
- Bundled with app hosting
- ~$5-10/month

#### **InfluxDB (Time-series Telemetry)**
**Recommendation: InfluxDB Cloud**
- Free tier: 30-day retention, rate limits
- Cost: Free → $50/month
- **Alternative**: Start without telemetry for demo, add later

#### **MinIO (Object Storage)**
**Recommendation: AWS S3 or Cloudflare R2**

**Cloudflare R2 (Recommended)**
- S3-compatible API (easy migration from MinIO)
- No egress fees
- $0.015/GB/month storage
- Cost: ~$5-15/month for demo

**AWS S3**
- Industry standard
- $0.023/GB/month + transfer
- Cost: ~$10-20/month

### 1.3 CDN and Static Asset Hosting

**Recommendation: Cloudflare (Free/Pro)**
- Free tier includes:
  - Unlimited bandwidth
  - Global CDN
  - DDoS protection
  - SSL certificates
  - DNS management
- Pro tier: $20/month (optional, adds:
  - Enhanced performance
  - Advanced security features
  - Better analytics)

**Vercel CDN** (if using Vercel for frontend)
- Automatically included
- No additional configuration needed

### 1.4 Domain and SSL Setup

**Domain Registration**
- **Namecheap or Google Domains**: ~$12-15/year
- Suggested domain: `sepulki.io` or `sepulki.dev`

**SSL Certificates**
- **Automatic with hosting providers**:
  - Vercel: Auto SSL
  - Railway: Auto SSL
  - Cloudflare: Universal SSL
- **Let's Encrypt**: Free, auto-renewal
- **Cost**: $0 (all included in hosting)

**DNS Configuration**
- Use Cloudflare DNS (free, fast)
- Configure:
  - `sepulki.io` → Vercel frontend
  - `api.sepulki.io` → Railway backend
  - `www.sepulki.io` → Redirect to apex

---

## 2. CI/CD Pipeline

### 2.1 GitHub Actions Workflows

Create `.github/workflows/` directory with the following workflows:

#### **Frontend CI/CD** (`.github/workflows/frontend-ci-cd.yml`)

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [master, develop]
    paths:
      - 'apps/forge-ui/**'
      - 'packages/**'
  pull_request:
    branches: [master]
    paths:
      - 'apps/forge-ui/**'
      - 'packages/**'

env:
  NODE_VERSION: '18.18.0'

jobs:
  lint-and-test:
    name: Lint and Test Frontend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/forge-ui

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run type checking
        run: npx tsc --noEmit

      - name: Run unit tests
        run: npm test -- --ci --coverage --maxWorkers=2

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/forge-ui/coverage/coverage-final.json
          flags: frontend

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: lint-and-test
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: apps/forge-ui

      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        working-directory: apps/forge-ui

      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: apps/forge-ui
        env:
          NEXT_PUBLIC_GRAPHQL_ENDPOINT: http://localhost:4000/graphql

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: apps/forge-ui/playwright-report/
          retention-days: 30

  build:
    name: Build Frontend
    runs-on: ubuntu-latest
    needs: lint-and-test
    defaults:
      run:
        working-directory: apps/forge-ui

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_GRAPHQL_ENDPOINT: ${{ secrets.NEXT_PUBLIC_GRAPHQL_ENDPOINT }}

      - name: Check build size
        run: |
          echo "Build completed successfully"
          du -sh .next

  deploy-preview:
    name: Deploy Preview (Vercel)
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'
    environment:
      name: preview
      url: ${{ steps.deploy.outputs.preview-url }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Vercel
        id: deploy
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/forge-ui

  deploy-production:
    name: Deploy Production (Vercel)
    runs-on: ubuntu-latest
    needs: [build, lint-and-test]
    if: github.ref == 'refs/heads/master' && github.event_name == 'push'
    environment:
      name: production
      url: https://sepulki.io

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: apps/forge-ui
```

#### **Backend CI/CD** (`.github/workflows/backend-ci-cd.yml`)

```yaml
name: Backend CI/CD

on:
  push:
    branches: [master, develop]
    paths:
      - 'services/hammer-orchestrator/**'
      - 'packages/**'
  pull_request:
    branches: [master]
    paths:
      - 'services/hammer-orchestrator/**'
      - 'packages/**'

env:
  NODE_VERSION: '18.18.0'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/hammer-orchestrator

jobs:
  lint-and-test:
    name: Lint and Test Backend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: services/hammer-orchestrator

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: sepulki_test
          POSTGRES_USER: smith
          POSTGRES_PASSWORD: forge_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run type checking
        run: npx tsc --noEmit

      - name: Run unit tests
        run: npm test -- --ci --coverage
        env:
          DATABASE_URL: postgresql://smith:forge_test@localhost:5432/sepulki_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./services/hammer-orchestrator/coverage/coverage-final.json
          flags: backend

  build-and-push:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    needs: lint-and-test
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: services/hammer-orchestrator/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://api-staging.sepulki.io

    steps:
      - name: Deploy to Railway (Staging)
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: hammer-orchestrator-staging
          environment: staging

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/master'
    environment:
      name: production
      url: https://api.sepulki.io

    steps:
      - name: Deploy to Railway (Production)
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: hammer-orchestrator-production
          environment: production

      - name: Health check
        run: |
          sleep 30
          curl -f https://api.sepulki.io/health || exit 1
```

#### **Database Migration Workflow** (`.github/workflows/db-migrate.yml`)

```yaml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to migrate'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  migrate:
    name: Run Database Migration
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18.18.0'

      - name: Install dependencies
        run: npm ci
        working-directory: services/hammer-orchestrator

      - name: Run migrations
        run: npm run migrate
        working-directory: services/hammer-orchestrator
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Verify migration
        run: npm run db:verify
        working-directory: services/hammer-orchestrator
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### 2.2 Build Optimization

**Package Caching Strategy**
```yaml
# Add to all workflows
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
      */*/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**Docker Layer Caching**
```dockerfile
# Optimize Dockerfile for caching
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
EXPOSE 4000
CMD ["npm", "start"]
```

### 2.3 Deployment Automation

**Railway Deployment (Recommended)**
1. Connect GitHub repository
2. Auto-deploy on push to `master`
3. Environment-specific branches:
   - `master` → production
   - `develop` → staging

**Vercel Deployment**
1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Configure in Vercel dashboard:
   - Production branch: `master`
   - Preview branches: All other branches
   - Auto-deployments enabled

---

## 3. Environment Configuration

### 3.1 Development Environment

**Local Setup** (`/.env.local` - NOT committed)
```bash
# Database
DATABASE_URL=postgresql://smith:forge_dev@localhost:5432/sepulki
REDIS_URL=redis://localhost:6379

# Object Storage
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=sepulki
MINIO_SECRET_KEY=vault_dev_key

# Telemetry
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=dev_token
INFLUXDB_ORG=sepulki
INFLUXDB_BUCKET=bellows

# Frontend
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT=ws://localhost:4000/graphql

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-change-in-production
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

**Docker Compose Environment**
```bash
# Use docker-compose.yml for local infrastructure
docker-compose up -d postgres redis minio influxdb
```

### 3.2 Staging Environment

**Railway Configuration** (`railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "services/hammer-orchestrator/Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Environment Variables (Railway Dashboard)**
```bash
# Database (Railway PostgreSQL)
DATABASE_URL=${RAILWAY_PROVIDED_DATABASE_URL}

# Redis (Railway Redis)
REDIS_URL=${RAILWAY_PROVIDED_REDIS_URL}

# Object Storage (Cloudflare R2)
S3_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=${CLOUDFLARE_R2_ACCESS_KEY}
S3_SECRET_ACCESS_KEY=${CLOUDFLARE_R2_SECRET_KEY}
S3_BUCKET=sepulki-staging

# Frontend (Vercel)
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://api-staging.sepulki.io/graphql
NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT=wss://api-staging.sepulki.io/graphql

# Auth
NEXTAUTH_URL=https://staging.sepulki.io
NEXTAUTH_SECRET=${STAGING_NEXTAUTH_SECRET}
AUTH_GITHUB_ID=${STAGING_GITHUB_ID}
AUTH_GITHUB_SECRET=${STAGING_GITHUB_SECRET}

# Monitoring
NODE_ENV=staging
LOG_LEVEL=debug
```

### 3.3 Production Environment

**Critical Environment Variables**
```bash
# Database (Neon PostgreSQL)
DATABASE_URL=${NEON_DATABASE_URL}
DATABASE_CONNECTION_POOL_MAX=20

# Redis (Upstash)
REDIS_URL=${UPSTASH_REDIS_URL}

# Object Storage (Cloudflare R2)
S3_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=${CLOUDFLARE_R2_ACCESS_KEY}
S3_SECRET_ACCESS_KEY=${CLOUDFLARE_R2_SECRET_KEY}
S3_BUCKET=sepulki-production

# Frontend (Vercel)
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://api.sepulki.io/graphql
NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT=wss://api.sepulki.io/graphql

# Auth (Production)
NEXTAUTH_URL=https://sepulki.io
NEXTAUTH_SECRET=${PRODUCTION_NEXTAUTH_SECRET}  # Strong 32+ char secret
AUTH_GITHUB_ID=${PRODUCTION_GITHUB_ID}
AUTH_GITHUB_SECRET=${PRODUCTION_GITHUB_SECRET}

# Monitoring & Observability
NODE_ENV=production
LOG_LEVEL=info
SENTRY_DSN=${SENTRY_DSN}
SENTRY_ENVIRONMENT=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://sepulki.io,https://www.sepulki.io

# Security
HELMET_ENABLED=true
HTTPS_ONLY=true
```

### 3.4 Environment Variable Management

**GitHub Secrets Setup**
```bash
# Frontend (Vercel)
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_GRAPHQL_ENDPOINT

# Backend (Railway)
RAILWAY_TOKEN
DATABASE_URL
REDIS_URL
NEXTAUTH_SECRET

# Third-party Services
CLOUDFLARE_R2_ACCESS_KEY
CLOUDFLARE_R2_SECRET_KEY
SENTRY_DSN
SENTRY_AUTH_TOKEN

# Auth Providers
AUTH_GITHUB_ID
AUTH_GITHUB_SECRET
```

**Secret Rotation Policy**
- Rotate production secrets every 90 days
- Use separate credentials for each environment
- Never commit secrets to git
- Use `.env.example` for documentation

---

## 4. Monitoring & Observability

### 4.1 Error Tracking

**Sentry Integration (Recommended)**

**Setup**
```bash
npm install @sentry/node @sentry/nextjs
```

**Backend Configuration** (`services/hammer-orchestrator/src/sentry.ts`)
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Postgres(),
  ],
});
```

**Frontend Configuration** (`apps/forge-ui/sentry.client.config.js`)
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Pricing**
- Free tier: 5,000 errors/month
- Developer plan: $26/month (50,000 errors)
- **Recommended for demo**: Free tier

### 4.2 Performance Monitoring

**Railway Metrics (Built-in)**
- CPU usage
- Memory usage
- Network I/O
- Request latency

**Vercel Analytics**
- Web Vitals (Core Web Vitals)
- Real User Monitoring (RUM)
- Cost: Free with Vercel deployment

**New Relic (Optional - Post-Demo)**
- Full APM suite
- Free tier: 100 GB/month data ingest
- Upgrade: $99/month

### 4.3 Analytics Integration

**PostHog (Recommended for YC Demo)**
```bash
npm install posthog-js posthog-node
```

**Frontend Setup**
```typescript
// apps/forge-ui/lib/posthog.ts
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug();
    },
  });
}

export default posthog;
```

**Pricing**
- Free tier: 1M events/month
- Perfect for demo phase
- Growth: $0.00045/event after free tier

**Alternative: Google Analytics 4**
- Free forever
- Less feature-rich than PostHog
- Better brand recognition

### 4.4 Uptime Monitoring

**BetterUptime (Recommended)**
- Free tier: 10 monitors, 3-minute intervals
- Status page included
- Incident management
- Upgrade: $18/month

**Setup**
```yaml
# Monitor endpoints:
- https://sepulki.io (frontend)
- https://api.sepulki.io/health (backend health)
- https://api.sepulki.io/graphql (GraphQL endpoint)
```

**Alternative: UptimeRobot**
- Free tier: 50 monitors, 5-minute intervals
- More generous free tier, fewer features

### 4.5 Logging Strategy

**Production Logging**
```typescript
// services/hammer-orchestrator/src/lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Production: Ship logs to external service
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.Http({
      host: 'logs.betterstack.com',
      path: '/api/logs',
      headers: {
        'Authorization': `Bearer ${process.env.LOGTAIL_TOKEN}`,
      },
    })
  );
}

export default logger;
```

**Log Aggregation: Logtail (BetterStack)**
- Free tier: 1GB/month, 3-day retention
- Pro: $5/month (5GB, 30-day retention)
- Excellent search and filtering

---

## 5. Deployment Checklist

### 5.1 Pre-Deployment Tasks

#### **Infrastructure Setup** (Week 1)
- [ ] Purchase domain name (`sepulki.io`)
- [ ] Create Vercel account and link GitHub
- [ ] Create Railway account and provision services:
  - [ ] PostgreSQL database
  - [ ] Redis instance
  - [ ] Backend service (hammer-orchestrator)
- [ ] Setup Cloudflare account:
  - [ ] Configure DNS
  - [ ] Create R2 bucket
  - [ ] Enable CDN
- [ ] Setup Neon PostgreSQL (alternative to Railway)
- [ ] Create Upstash Redis instance

#### **Service Configuration** (Week 1-2)
- [ ] Configure GitHub repository secrets:
  - [ ] `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
  - [ ] `RAILWAY_TOKEN`
  - [ ] `DATABASE_URL`, `REDIS_URL`
  - [ ] `CLOUDFLARE_R2_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_KEY`
  - [ ] `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
  - [ ] `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
  - [ ] `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- [ ] Create `.env.example` files for each service
- [ ] Setup GitHub Actions workflows (copy from section 2.1)
- [ ] Configure branch protection rules on `master`

#### **Monitoring & Observability** (Week 2)
- [ ] Create Sentry project (frontend + backend)
- [ ] Setup PostHog or Google Analytics
- [ ] Configure BetterUptime monitors
- [ ] Create Logtail project for log aggregation
- [ ] Setup status page (status.sepulki.io)

#### **Code Preparation** (Week 2)
- [ ] Add health check endpoint (`/health`, `/graphql`)
- [ ] Implement graceful shutdown in backend
- [ ] Add error boundaries in React components
- [ ] Configure CORS properly
- [ ] Add rate limiting middleware
- [ ] Implement request logging
- [ ] Add Sentry error tracking
- [ ] Optimize bundle size (run `npm run build` and analyze)
- [ ] Add loading states and error handling
- [ ] Test all environment variables

#### **Database & Data** (Week 2)
- [ ] Create database migration strategy
- [ ] Backup current development data
- [ ] Create seed data for demo
- [ ] Test database migrations locally
- [ ] Setup automated database backups (Railway/Neon automatic)

#### **Security Hardening** (Week 2-3)
- [ ] Enable Helmet.js for security headers
- [ ] Configure CSP (Content Security Policy)
- [ ] Implement rate limiting (express-rate-limit)
- [ ] Enable HTTPS-only cookies
- [ ] Add CSRF protection
- [ ] Review and rotate all secrets
- [ ] Setup WAF rules (Cloudflare)
- [ ] Enable DDoS protection (Cloudflare)

### 5.2 Deployment Steps

#### **Stage 1: Staging Deployment** (End of Week 2)

**Backend Deployment (Railway)**
1. Push code to `develop` branch
   ```bash
   git checkout develop
   git push origin develop
   ```

2. GitHub Actions automatically:
   - Runs tests
   - Builds Docker image
   - Deploys to Railway staging environment

3. Verify deployment:
   ```bash
   curl https://api-staging.sepulki.io/health
   curl https://api-staging.sepulki.io/graphql -d '{"query": "{ __typename }"}'
   ```

**Frontend Deployment (Vercel)**
1. Vercel automatically deploys on push to `develop`

2. Verify preview deployment:
   - Check preview URL in GitHub PR comment
   - Test all major flows
   - Verify GraphQL connectivity

3. Manual verification:
   ```bash
   # Test frontend loads
   curl -I https://staging.sepulki.io

   # Check GraphQL endpoint in browser console
   ```

**Database Migration (Staging)**
1. Run migration workflow:
   ```bash
   gh workflow run db-migrate.yml -f environment=staging
   ```

2. Verify schema:
   ```bash
   # Connect to Railway PostgreSQL
   railway run psql $DATABASE_URL
   \dt  # List tables
   ```

#### **Stage 2: Production Deployment** (Week 3)

**Pre-flight Checks**
- [ ] All staging tests passing
- [ ] Manual QA complete on staging
- [ ] Performance testing complete (Lighthouse score > 90)
- [ ] Security scan complete (no critical vulnerabilities)
- [ ] Backup staging database
- [ ] Notify team of deployment window

**Production Deployment**
1. Create release branch:
   ```bash
   git checkout -b release/v1.0.0
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Merge to master:
   ```bash
   git checkout master
   git merge release/v1.0.0
   git push origin master
   ```

3. GitHub Actions automatically:
   - Runs full test suite
   - Builds production Docker image
   - Deploys to Railway production
   - Deploys frontend to Vercel production

4. Run database migrations:
   ```bash
   gh workflow run db-migrate.yml -f environment=production
   ```

5. Verify production deployment (see section 5.3)

#### **Stage 3: DNS Cutover** (Week 3)

1. Configure Cloudflare DNS:
   ```
   A     @               [Vercel IP]
   CNAME www             sepulki.io
   CNAME api             [Railway domain]
   CNAME api-staging     [Railway staging domain]
   CNAME status          [BetterUptime status page]
   ```

2. Enable Cloudflare proxy (orange cloud)

3. Wait for DNS propagation (5-30 minutes)

4. Test DNS resolution:
   ```bash
   dig sepulki.io
   dig api.sepulki.io
   ```

### 5.3 Post-Deployment Verification

**Automated Checks**
```bash
#!/bin/bash
# scripts/verify-production.sh

echo "🔍 Verifying production deployment..."

# Frontend health
echo "Checking frontend..."
curl -f https://sepulki.io || exit 1

# Backend health
echo "Checking backend health..."
curl -f https://api.sepulki.io/health || exit 1

# GraphQL endpoint
echo "Checking GraphQL..."
curl -f https://api.sepulki.io/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}' || exit 1

# SSL certificate
echo "Checking SSL..."
echo | openssl s_client -connect sepulki.io:443 2>/dev/null | grep -q "Verify return code: 0" || exit 1

echo "✅ All checks passed!"
```

**Manual Verification Checklist**
- [ ] Homepage loads correctly
- [ ] User can sign in/sign up
- [ ] Robot list displays correctly
- [ ] Map renders with robot locations
- [ ] 3D visualization works
- [ ] WebSocket connections stable (check DevTools Network tab)
- [ ] GraphQL queries work (check Network tab)
- [ ] Mobile responsive design working
- [ ] All assets load (images, fonts, etc.)
- [ ] No console errors in browser
- [ ] Performance metrics acceptable (Lighthouse)

**Performance Benchmarks**
```bash
# Run Lighthouse audit
npx lighthouse https://sepulki.io --output html --output-path ./lighthouse-report.html

# Target scores:
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 95
# SEO: > 90
```

**Load Testing (Optional)**
```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io

# Run load test
k6 run scripts/load-test.js

# Target: 100 concurrent users, < 500ms response time
```

### 5.4 Rollback Procedures

**Backend Rollback (Railway)**
1. Identify last working deployment in Railway dashboard
2. Click "Rollback" button on working deployment
3. Or revert Git commit:
   ```bash
   git revert HEAD
   git push origin master
   ```
4. Verify rollback:
   ```bash
   curl https://api.sepulki.io/health
   ```

**Frontend Rollback (Vercel)**
1. Go to Vercel dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Or revert Git commit:
   ```bash
   git revert HEAD
   git push origin master
   ```

**Database Rollback**
1. Stop application:
   ```bash
   railway service stop
   ```
2. Restore from backup:
   ```bash
   # Railway automatic backups
   railway db restore --backup-id [backup-id]
   ```
3. Restart application:
   ```bash
   railway service start
   ```

**Emergency Rollback (Critical Issues)**
1. Immediately roll back both frontend and backend
2. Put up maintenance page (optional):
   ```bash
   # Cloudflare page rule to redirect to maintenance.html
   ```
3. Investigate issue in staging environment
4. Fix and redeploy

---

## 6. Cost Estimation

### 6.1 Infrastructure Costs

#### **Hosting & Compute**
| Service | Provider | Tier | Monthly Cost |
|---------|----------|------|--------------|
| Frontend Hosting | Vercel | Pro | $20 |
| Backend API | Railway | Starter | $30 |
| PostgreSQL | Railway / Neon | Free / Pro | $0-15 |
| Redis | Upstash | Free / Pro | $0-10 |
| Object Storage (R2) | Cloudflare | Usage-based | $5-15 |
| CDN & DNS | Cloudflare | Free | $0 |

**Subtotal: $55-90/month**

#### **Monitoring & Observability**
| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Sentry | Free / Developer | $0-26 |
| PostHog | Free | $0 |
| BetterUptime | Free / Pro | $0-18 |
| Logtail | Free / Pro | $0-5 |

**Subtotal: $0-49/month**

#### **Third-Party Services**
| Service | Monthly Cost |
|---------|--------------|
| Domain Registration | $1.25 (annual $15) |
| SSL Certificates | $0 (included) |

**Subtotal: ~$1/month**

### 6.2 Total Monthly Estimate

#### **Demo Phase (Months 1-3)**
- **Minimum (Free Tiers)**: ~$55/month
- **Recommended (Basic Paid)**: ~$120/month
- **Maximum (All Paid Features)**: ~$200/month

#### **Post-YC Growth (Months 4-12)**
- **Moderate Traffic**: $200-500/month
- **High Traffic**: $500-1,000/month
- **Scaling Required**: $1,000+/month

### 6.3 Cost Optimization Strategies

**Short-term (Demo Phase)**
1. Use free tiers wherever possible:
   - Neon PostgreSQL (free tier)
   - Upstash Redis (free tier)
   - Vercel Pro only if needed (start with Hobby)
   - Sentry free tier (5K errors)
   - PostHog free tier (1M events)

2. Optimize resource usage:
   - Enable caching (Redis, Cloudflare CDN)
   - Optimize bundle sizes
   - Use serverless where possible
   - Lazy-load components

**Long-term (Post-Demo)**
1. Reserved capacity:
   - Switch to AWS/GCP reserved instances
   - Commit to annual plans (20-40% savings)

2. Infrastructure optimization:
   - Implement aggressive caching
   - Use CDN for static assets
   - Optimize database queries
   - Enable compression (gzip/brotli)

3. Monitoring optimization:
   - Reduce error sampling rates
   - Optimize log retention
   - Use log levels strategically

---

## 7. YC Demo-Specific Recommendations

### 7.1 Pre-Demo Checklist (Week 3)

**Performance**
- [ ] Lighthouse performance score > 90
- [ ] API response times < 200ms (p95)
- [ ] WebSocket connection stable under load
- [ ] 3D visualization smooth (60 FPS)
- [ ] Map rendering optimized

**Reliability**
- [ ] 99.9% uptime in staging (monitored)
- [ ] Error rate < 0.1%
- [ ] Graceful degradation tested
- [ ] Fallback UI for loading states
- [ ] Error boundaries implemented

**Polish**
- [ ] Professional branding (logos, colors)
- [ ] Smooth animations and transitions
- [ ] Mobile-responsive design
- [ ] Accessibility (a11y) tested
- [ ] Dark mode (if applicable)
- [ ] Loading skeletons instead of spinners

**Demo Data**
- [ ] Seed database with impressive demo data
- [ ] 10-20 robots with varying statuses
- [ ] Realistic telemetry data
- [ ] Multiple geographies represented
- [ ] Demo user accounts ready

### 7.2 Demo Day Preparation

**Contingency Planning**
1. **Backup Demo Environment**
   - Deploy to second hosting provider
   - Keep local Docker setup ready
   - Record demo video as fallback

2. **Demo Script**
   - Practice 2-minute pitch
   - Highlight key features
   - Have answers ready for common questions

3. **Monitoring During Demo**
   - Set up real-time monitoring dashboard
   - Have team member monitoring Sentry/logs
   - Quick rollback plan ready

### 7.3 Post-Demo Scaling Strategy

**Immediate (Week 4-6)**
- Analyze demo day metrics
- Implement user feedback
- Optimize based on real usage patterns
- Scale resources as needed

**Short-term (Months 2-3)**
- Migrate to more scalable infrastructure if needed
- Implement advanced caching
- Add load balancing
- Optimize database indexes

**Long-term (Months 4-12)**
- Consider multi-region deployment
- Implement advanced observability
- Build auto-scaling policies
- Consider Kubernetes for container orchestration

---

## 8. Security Best Practices

### 8.1 Application Security

**API Security**
```typescript
// Implement rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

app.use('/api/', limiter);
app.use('/graphql', limiter);
```

**CORS Configuration**
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'https://sepulki.io',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
}));
```

**Security Headers (Helmet.js)**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.sepulki.io"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### 8.2 Authentication Security

**NextAuth Configuration**
```typescript
// apps/forge-ui/auth.config.ts
export const authConfig = {
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true, // HTTPS only in production
      },
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};
```

### 8.3 Data Protection

**Environment Variable Security**
- Never commit `.env` files
- Rotate secrets every 90 days
- Use different credentials per environment
- Encrypt sensitive data at rest
- Use HTTPS everywhere

**Database Security**
- Use connection pooling
- Enable SSL/TLS connections
- Implement row-level security (RLS)
- Regular backups
- Audit logging

---

## 9. Success Metrics

### 9.1 Pre-Launch Metrics

**Technical Performance**
- Lighthouse score: > 90 (all categories)
- API response time (p95): < 200ms
- Error rate: < 0.1%
- Uptime: 99.9%

**User Experience**
- Page load time: < 2 seconds
- Time to Interactive (TTI): < 3 seconds
- First Contentful Paint (FCP): < 1 second
- Cumulative Layout Shift (CLS): < 0.1

### 9.2 Demo Day Metrics

**Availability**
- 100% uptime during demo hours
- Zero critical errors
- < 500ms API response times

**Engagement (if public demo)**
- Demo completion rate: > 80%
- User sign-ups: Track conversions
- Feature usage: Monitor most-used features

### 9.3 Post-Launch Metrics

**Growth**
- Week 1: Stable performance under real traffic
- Week 2-4: User feedback integration
- Month 2-3: Scaling for growth

**Technical Health**
- Error rate trending down
- Performance scores maintained
- Infrastructure costs predictable

---

## 10. Conclusion

This deployment strategy provides a comprehensive roadmap for getting Sepulki production-ready for the YC demo within 2-3 weeks. Key priorities:

1. **Speed to Production**: Leverage managed services (Vercel, Railway) for rapid deployment
2. **Cost Efficiency**: Start with free tiers, scale as needed (~$120/month recommended)
3. **Reliability**: Implement monitoring and error tracking from day one
4. **Professional Polish**: Focus on performance, UX, and demo readiness

**Critical Success Factors**:
- ✅ Complete infrastructure setup in Week 1
- ✅ Deploy to staging and test thoroughly in Week 2
- ✅ Production deployment and polish in Week 3
- ✅ Monitoring and observability from the start
- ✅ Clear rollback procedures for safety

**Next Steps**:
1. Review this strategy with the team
2. Begin infrastructure setup (Week 1 tasks)
3. Create GitHub Actions workflows
4. Setup monitoring services
5. Deploy to staging and iterate

Good luck with the YC demo! 🚀

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-04
**Author**: DevOps Planning Agent
**Status**: Ready for Implementation
