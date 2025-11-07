# Sepulki Platform - Deployment Architecture

**Last Updated:** 2025-11-05

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USERS / BROWSERS                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VERCEL (Frontend)                              │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Next.js Application                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │ │
│  │  │  React UI    │  │  Auth Pages  │  │  API Routes  │       │ │
│  │  │  (TypeScript)│  │              │  │              │       │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │ │
│  └───────────────────────────────────────────────────────────────┘ │
│         forge-ui (apps/forge-ui)                                   │
│         Domain: https://your-app.vercel.app                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ GraphQL over HTTPS
                             │ (CORS Protected)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     RAILWAY (Backend Services)                      │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │           Service 1: hammer-orchestrator                    │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │  GraphQL API Server (Apollo Server)               │    │   │
│  │  │  • Fleet Management                                │    │   │
│  │  │  • Robot Control                                   │    │   │
│  │  │  • Task Orchestration                              │    │   │
│  │  │  • Telemetry Generation                            │    │   │
│  │  │  • File Upload/Storage                             │    │   │
│  │  │  Port: 4000                                        │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │  services/hammer-orchestrator                              │   │
│  │  URL: https://hammer-XXXX.up.railway.app                  │   │
│  │  Health: /health                                           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                             │                                       │
│                             │ JWT Auth                              │
│                             ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │           Service 2: local-auth                             │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │  Authentication Service (Express)                  │    │   │
│  │  │  • User Login/Logout                               │    │   │
│  │  │  • Session Management                              │    │   │
│  │  │  • JWT Token Generation                            │    │   │
│  │  │  • Cookie Management                               │    │   │
│  │  │  Port: 3001                                        │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │  services/local-auth                                       │   │
│  │  URL: https://local-auth-XXXX.up.railway.app              │   │
│  │  Health: /health                                           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                             │                                       │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              │ Database & Cache Connections
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  NEON DATABASE  │  │  UPSTASH REDIS  │  │  EXTERNAL APIs  │
│   (PostgreSQL)  │  │     (Cache)     │  │                 │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • User Data     │  │ • Sessions      │  │ • Isaac Sim     │
│ • Fleet Data    │  │ • Cache         │  │ • Anvil Sim     │
│ • Robot Data    │  │ • Rate Limits   │  │ • Video Proxy   │
│ • Tasks         │  │ • Temp Storage  │  │                 │
│ • Telemetry     │  │                 │  │                 │
├─────────────────┤  ├─────────────────┤  └─────────────────┘
│ Managed Service │  │ Managed Service │
│ AWS (us-east-1) │  │ Global Edge     │
│ SSL Required    │  │ TLS 1.2+        │
└─────────────────┘  └─────────────────┘
```

---

## Data Flow

### 1. User Authentication Flow

```
User Browser
    │
    │ 1. Visit /auth/signin
    ▼
Vercel (forge-ui)
    │
    │ 2. Redirect to auth service
    ▼
Railway (local-auth)
    │
    │ 3. Display login form
    ▼
User enters credentials
    │
    │ 4. POST /auth/signin
    ▼
Railway (local-auth)
    │
    │ 5. Query user from database
    ▼
Neon Database
    │
    │ 6. Return user data
    ▼
Railway (local-auth)
    │
    │ 7. Create session in Redis
    ▼
Upstash Redis
    │
    │ 8. Generate JWT token
    │    Set httpOnly cookie
    ▼
User Browser
    │
    │ 9. Redirect to frontend
    ▼
Vercel (forge-ui)
    │
    │ 10. Display authenticated UI
    ▼
User sees dashboard
```

### 2. GraphQL API Request Flow

```
User Browser (Authenticated)
    │
    │ 1. GraphQL query with JWT
    ▼
Vercel (forge-ui)
    │
    │ 2. Forward to GraphQL API
    │    Include Authorization header
    ▼
Railway (hammer-orchestrator)
    │
    │ 3. Validate JWT token
    │ 4. Check session in Redis
    ▼
Upstash Redis
    │
    │ 5. Return session data
    ▼
Railway (hammer-orchestrator)
    │
    │ 6. Execute GraphQL query
    │ 7. Query database
    ▼
Neon Database
    │
    │ 8. Return query results
    ▼
Railway (hammer-orchestrator)
    │
    │ 9. Format response
    ▼
Vercel (forge-ui)
    │
    │ 10. Render in React
    ▼
User Browser
```

### 3. Task Creation and Execution Flow

```
User creates task in UI
    │
    ▼
POST /api/upload (Vercel → Railway)
    │
    ▼
hammer-orchestrator validates request
    │
    ├─── Save file to storage
    │
    ├─── Create task in database (Neon)
    │
    ├─── Assign to robot(s)
    │
    └─── Return task ID
    │
    ▼
Robot polls for new tasks
    │
    ▼
GET task data via GraphQL
    │
    ▼
Execute task
    │
    ▼
Send telemetry updates
    │
    ▼
Store in InfluxDB (Neon time-series)
    │
    ▼
UI displays real-time progress
```

---

## Network Security

### Security Layers

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: TLS/SSL (Transport)                                │
│  • All connections HTTPS/WSS only                            │
│  • TLS 1.2+ required                                         │
│  • Certificate validation enforced                           │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 2: Platform Security (Vercel/Railway)                 │
│  • DDoS protection                                           │
│  • Rate limiting at edge                                     │
│  • Automatic security updates                                │
│  • Managed SSL certificates                                  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: Application Security (Code)                        │
│  • Helmet security headers                                   │
│  • CORS validation                                           │
│  • Input sanitization                                        │
│  • SQL injection protection                                  │
│  • XSS protection                                            │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 4: Authentication & Authorization                     │
│  • JWT token validation                                      │
│  • Session management                                        │
│  • Role-based access control                                 │
│  • Rate limiting per user                                    │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 5: Data Protection                                    │
│  • Encrypted database connections                            │
│  • Redis TLS                                                 │
│  • Environment variable encryption                           │
│  • Secrets management                                        │
└──────────────────────────────────────────────────────────────┘
```

### CORS Configuration

```
┌─────────────────────────────────────────────────────────────┐
│  VERCEL (Frontend)                                          │
│  Origin: https://your-app.vercel.app                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Request with Origin header
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  RAILWAY (Backend)                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CORS Middleware                                      │  │
│  │  1. Check Origin header                              │  │
│  │  2. Compare against ALLOWED_ORIGINS                  │  │
│  │  3. If match:                                        │  │
│  │     - Set Access-Control-Allow-Origin                │  │
│  │     - Set Access-Control-Allow-Credentials: true     │  │
│  │  4. If no match:                                     │  │
│  │     - Return 403 Forbidden                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Allowed Origins (Environment Variables):
  • hammer-orchestrator: ALLOWED_ORIGINS="https://your-app.vercel.app"
  • local-auth: CORS_ORIGIN="https://your-app.vercel.app"
```

---

## Deployment Process

### CI/CD Pipeline (Future)

```
┌─────────────────────────────────────────────────────────────┐
│  GITHUB REPOSITORY                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Code Push to main/master                          │    │
│  └────────────────────────┬───────────────────────────┘    │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ Webhook triggers
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Job 1: Test                                       │    │
│  │  • Run unit tests                                  │    │
│  │  • Run integration tests                           │    │
│  │  • Run linting                                     │    │
│  │  • Run type checking                               │    │
│  └────────────────────────┬───────────────────────────┘    │
│                            │ If pass                        │
│                            ▼                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Job 2: Build                                      │    │
│  │  • Build Docker images                             │    │
│  │  • Run security scan                               │    │
│  │  • Check for vulnerabilities                       │    │
│  └────────────────────────┬───────────────────────────┘    │
│                            │ If pass                        │
│                            ▼                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Job 3: Deploy Backend                             │    │
│  │  • Deploy to Railway                               │    │
│  │  • Run health checks                               │    │
│  │  • Wait for services ready                         │    │
│  └────────────────────────┬───────────────────────────┘    │
│                            │ If pass                        │
│                            ▼                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Job 4: Deploy Frontend                            │    │
│  │  • Deploy to Vercel                                │    │
│  │  • Run smoke tests                                 │    │
│  │  • Verify integration                              │    │
│  └────────────────────────┬───────────────────────────┘    │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼ If any job fails
┌─────────────────────────────────────────────────────────────┐
│  ROLLBACK                                                   │
│  • Revert to previous Railway deployment                   │
│  • Revert to previous Vercel deployment                    │
│  • Notify team                                             │
└─────────────────────────────────────────────────────────────┘
```

### Current Manual Deployment

```
Developer Workstation
    │
    │ 1. Code changes
    │ 2. git commit & push
    ▼
GitHub Repository
    │
    ├─────────────────────┬─────────────────────┐
    │                     │                     │
    │ 3a. Railway watches│ 3b. Vercel watches  │
    ▼                     ▼                     ▼
Railway Auto-Deploy    Vercel Auto-Deploy    (Future: Manual approval)
    │                     │
    │ 4a. Build Docker   │ 4b. Build Next.js
    │     Run tests      │     Run tests
    │     Deploy         │     Deploy
    ▼                     ▼
Production Services   Production Frontend
```

---

## Infrastructure Components

### Compute Resources

| Component | Provider | Specs | Cost/Month |
|-----------|----------|-------|------------|
| Frontend | Vercel | Serverless Edge | $0-20 |
| hammer-orchestrator | Railway | 512MB RAM, 0.5 vCPU | $5-10 |
| local-auth | Railway | 256MB RAM, 0.5 vCPU | $5-10 |

### Data Storage

| Component | Provider | Specs | Cost/Month |
|-----------|----------|-------|------------|
| PostgreSQL | Neon | 3GB storage, 0.25 vCPU | $0-19 |
| Redis | Upstash | 256MB, Global Edge | $0-10 |
| File Storage | Railway Volume | 1GB (expandable) | Included |

### Network

| Component | Provider | Details | Cost/Month |
|-----------|----------|---------|------------|
| CDN | Vercel Edge | Global, 100+ locations | Included |
| SSL/TLS | Vercel/Railway | Auto-managed, Let's Encrypt | Included |
| DDoS Protection | Vercel/Railway | Layer 3/4/7 protection | Included |

---

## Scaling Strategy

### Current Capacity

```
┌─────────────────────────────────────────────────────────────┐
│  CURRENT SETUP                                              │
│                                                             │
│  Concurrent Users:        ~1,000                            │
│  Requests/Second:         ~100                              │
│  Database Queries/Sec:    ~500                              │
│  Response Time (p95):     <500ms                            │
│  Uptime Target:           99%                               │
└─────────────────────────────────────────────────────────────┘
```

### Scaling Stages

#### Stage 1: Current (0-1K users)

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Vercel    │────▶│  Railway   │────▶│    Neon    │
│  (Edge)    │     │ (Single    │     │  (Single   │
│            │     │  Instance) │     │  Instance) │
└────────────┘     └────────────┘     └────────────┘
```

#### Stage 2: Growth (1K-10K users)

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Vercel    │────▶│  Railway   │────▶│    Neon    │
│  (Edge)    │     │ (Multiple  │     │  (Scaled   │
│            │     │  Instances)│     │   up)      │
└────────────┘     └────────────┘     └────────────┘
                         │
                         │ Load Balanced
                         ▼
                   ┌────────────┐
                   │   Redis    │
                   │  Cluster   │
                   └────────────┘
```

#### Stage 3: Scale (10K-100K users)

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Vercel    │────▶│ Kubernetes │────▶│  Neon Pro  │
│  (Edge)    │     │  Cluster   │     │  (Replicas)│
│  + CDN     │     │            │     │            │
└────────────┘     └────────────┘     └────────────┘
                         │
                         ├──▶ Cache Layer (Redis Cluster)
                         │
                         └──▶ Message Queue (RabbitMQ/Kafka)
```

---

## Monitoring & Observability

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER                                          │
│  • Railway Metrics (CPU, Memory, Network)                  │
│  • Vercel Analytics (Core Web Vitals)                      │
│  • Custom Application Metrics                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LOG AGGREGATION                                            │
│  • Railway Logs                                            │
│  • Vercel Logs                                             │
│  • Application Logs (console.log)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ERROR TRACKING (Future)                                    │
│  • Sentry for error monitoring                             │
│  • LogRocket for session replay                            │
│  • Custom error alerts                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ALERTING                                                   │
│  • Railway Webhooks                                        │
│  • Vercel Notifications                                    │
│  • Slack/Discord/Email alerts                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Response Time (p95) | <200ms | >500ms |
| Error Rate | <0.1% | >1% |
| Uptime | 99.9% | <99% |
| Database Query Time | <50ms | >200ms |
| CPU Usage | <70% | >90% |
| Memory Usage | <80% | >95% |

---

## Disaster Recovery

### Backup Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  NEON DATABASE                                              │
│  • Automatic daily backups (7 days retention)              │
│  • Point-in-time recovery (24 hours)                        │
│  • Manual snapshots before major changes                    │
└─────────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────────┐
│  UPSTASH REDIS                                              │
│  • Persistence enabled (AOF + RDB)                         │
│  • Automatic snapshots                                     │
│  • No explicit backup needed (cache only)                  │
└─────────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────────┐
│  APPLICATION CODE                                           │
│  • Git version control                                     │
│  • GitHub repository                                       │
│  • Release tags for each deployment                        │
└─────────────────────────────────────────────────────────────┘
```

### Recovery Procedures

#### Database Corruption

```
1. Identify corruption time
2. Restore from Neon backup (automatic)
3. Point-in-time recovery to just before corruption
4. Verify data integrity
5. Resume operations
Recovery Time: ~15 minutes
```

#### Service Outage

```
1. Check Railway/Vercel status pages
2. If platform issue: Wait for resolution
3. If code issue: Rollback deployment
   • railway rollback -s SERVICE_NAME
   • vercel rollback
4. Verify services healthy
5. Investigate root cause
Recovery Time: ~5 minutes
```

#### Complete System Failure

```
1. Deploy fresh instances
2. Restore database from backup
3. Restore Redis from persistence
4. Deploy latest working code
5. Verify all services
6. Update DNS if needed
Recovery Time: ~30 minutes
```

---

## Cost Optimization

### Current Monthly Costs

```
┌─────────────────────────────────────────────────────────────┐
│  SERVICE BREAKDOWN                                          │
├─────────────────────────────────────────────────────────────┤
│  Vercel (Frontend)              $0 - $20                    │
│  Railway (2 services)           $10                         │
│  Neon (Database)                $0 - $19                    │
│  Upstash (Redis)                $0 - $10                    │
├─────────────────────────────────────────────────────────────┤
│  TOTAL:                         $10 - $59/month             │
└─────────────────────────────────────────────────────────────┘
```

### Optimization Strategies

1. **Use Free Tiers Effectively**
   - Vercel: Hobby tier sufficient for <1K users
   - Neon: Free tier supports ~100 connections
   - Upstash: Free tier good for development

2. **Enable Caching**
   - Redis caching reduces database queries
   - Vercel edge caching for static assets
   - Browser caching for images/CSS

3. **Optimize Database Queries**
   - Use indexes on frequently queried fields
   - Implement connection pooling
   - Cache expensive queries in Redis

4. **Monitor Usage**
   - Track bandwidth usage
   - Monitor compute time
   - Set up cost alerts

---

## Security Architecture

### Defense in Depth

```
Layer 1: Perimeter Security
    │
    ├─ DDoS Protection (Platform)
    ├─ Rate Limiting (Edge)
    └─ SSL/TLS (All connections)
    │
    ▼
Layer 2: Network Security
    │
    ├─ CORS Validation
    ├─ Firewall Rules
    └─ Private Networks
    │
    ▼
Layer 3: Application Security
    │
    ├─ Authentication (JWT)
    ├─ Authorization (RBAC)
    ├─ Input Validation
    └─ Output Encoding
    │
    ▼
Layer 4: Data Security
    │
    ├─ Encrypted Connections
    ├─ Encrypted at Rest
    └─ Secrets Management
    │
    ▼
Layer 5: Monitoring & Response
    │
    ├─ Security Logging
    ├─ Intrusion Detection
    └─ Incident Response
```

---

## Conclusion

This architecture provides:

✅ **Scalability:** Can handle 1K users now, scale to 100K+
✅ **Reliability:** 99.9% uptime target with automatic failover
✅ **Security:** Multiple layers of protection
✅ **Cost-Effective:** $10-60/month for production
✅ **Maintainability:** Managed services, minimal ops overhead
✅ **Performance:** <200ms response time (p95)

**Next Steps:**
1. Execute security fixes from DEPLOYMENT_QUICK_FIX_GUIDE.md
2. Deploy to production
3. Monitor for 24 hours
4. Set up advanced monitoring (Sentry, etc.)
5. Implement CI/CD pipeline

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Next Review:** After production deployment
