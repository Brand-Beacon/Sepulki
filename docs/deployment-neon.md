# Neon PostgreSQL Deployment Guide

Complete guide for deploying Sepulki RaaS platform with Neon serverless PostgreSQL database.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Migrations](#migrations)
7. [Connection Pooling](#connection-pooling)
8. [Performance Optimization](#performance-optimization)
9. [Backup & Recovery](#backup--recovery)
10. [Monitoring](#monitoring)
11. [Security](#security)
12. [Troubleshooting](#troubleshooting)

## Overview

Neon is a serverless PostgreSQL database platform that provides:

- **Serverless Architecture**: Auto-scaling compute with instant provisioning
- **Branching**: Git-like database branches for development workflows
- **Auto-suspend**: Automatic scale-to-zero during inactivity
- **Point-in-Time Recovery**: 30-day backup retention
- **Connection Pooling**: Built-in pooling for serverless applications

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Forge UI    │  │  Hammer      │  │  Local Auth  │     │
│  │  (Next.js)   │  │ Orchestrator │  │   Service    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Neon Connection Pool (PgBouncer)               │
│                     Transaction Mode                         │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Neon PostgreSQL Database                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database: sepulki                                    │  │
│  │  Version: PostgreSQL 15+                             │  │
│  │  Extensions: uuid-ossp, pgcrypto                     │  │
│  │                                                       │  │
│  │  Tables:                                             │  │
│  │    • smiths (users)                                  │  │
│  │    • robots, fleets, tasks                           │  │
│  │    • sepulkas (designs), alloys (components)         │  │
│  │    • factory_floors, edicts (policies)               │  │
│  │    • audit_stamps, policy_violations                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

1. **PostgreSQL Client** (`psql`)
   ```bash
   # macOS
   brew install postgresql@15

   # Ubuntu/Debian
   sudo apt-get install postgresql-client-15

   # Windows
   # Download from: https://www.postgresql.org/download/windows/
   ```

2. **Neon CLI** (optional but recommended)
   ```bash
   npm install -g neonctl
   ```

3. **jq** (JSON processor)
   ```bash
   # macOS
   brew install jq

   # Ubuntu/Debian
   sudo apt-get install jq
   ```

### Neon Account Setup

1. Sign up at [https://console.neon.tech](https://console.neon.tech)
2. Create a new project named "sepulki-production" (or your preferred name)
3. Copy the connection string (format: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

## Quick Start

### 1. Clone Repository and Install Dependencies

```bash
git clone <repository-url>
cd Sepulki
npm install
```

### 2. Configure Environment

Create `.env` file in project root:

```bash
# Copy example environment file
cp .env.example .env

# Edit with your Neon credentials
nano .env
```

Required environment variables:

```bash
# Neon Database Connection
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.neon.tech/sepulki?sslmode=require

# Application Configuration
NODE_ENV=production
PORT=4000
ENABLE_TELEMETRY=false

# Optional: For local auth service
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

### 3. Validate Environment

```bash
./infrastructure/scripts/validate-neon-env.sh
```

Expected output:
```
╔═══════════════════════════════════════════════════════════════╗
║        Neon Database Environment Validation                  ║
╚═══════════════════════════════════════════════════════════════╝

[INFO] Checking DATABASE_URL...
[✓] DATABASE_URL format is valid
[INFO] Database User: username
[INFO] Database Host: ep-xxx-xxx.neon.tech
[INFO] Database Name: sepulki
[INFO] Testing database connection...
[✓] Database connection successful
[INFO] PostgreSQL: PostgreSQL 15.x on x86_64-pc-linux-gnu
```

### 4. Run Database Setup

```bash
# Development environment
./infrastructure/scripts/neon-setup.sh development

# Staging environment
./infrastructure/scripts/neon-setup.sh staging

# Production environment
./infrastructure/scripts/neon-setup.sh production
```

### 5. Verify Setup

```bash
# Check migration status
./infrastructure/scripts/migrate-neon.sh status

# Test connection with psql
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
```

## Configuration

### Neon Configuration File

Location: `infrastructure/neon-config.json`

Key configuration sections:

#### Connection Pooling

```json
{
  "connection": {
    "pooling": {
      "enabled": true,
      "poolMode": "transaction",
      "maxConnections": 100,
      "minConnections": 5,
      "idleTimeoutMillis": 30000,
      "connectionTimeoutMillis": 5000
    }
  }
}
```

**Pool Modes:**
- `transaction`: Best for serverless (default)
- `session`: For long-running connections
- `statement`: For extreme concurrency

#### Performance Settings

```json
{
  "performance": {
    "autoscaling": {
      "minComputeUnits": 0.25,
      "maxComputeUnits": 2,
      "autoSuspendDelaySeconds": 300
    }
  }
}
```

**Compute Units:**
- 0.25 CU = 0.25 vCPU, 1 GB RAM (~$0.10/hour)
- 1 CU = 1 vCPU, 4 GB RAM (~$0.40/hour)
- 2 CU = 2 vCPU, 8 GB RAM (~$0.80/hour)

#### Environment-Specific Settings

```json
{
  "environments": {
    "production": {
      "branch": "main",
      "autoSuspend": false,
      "computeUnits": { "min": 0.5, "max": 4 },
      "backupRetention": 30
    },
    "staging": {
      "branch": "preview",
      "autoSuspend": true,
      "computeUnits": { "min": 0.25, "max": 1 },
      "backupRetention": 7
    }
  }
}
```

## Database Setup

### Initial Schema Creation

The setup script automatically:

1. ✅ Validates connection to Neon
2. ✅ Installs required extensions (`uuid-ossp`, `pgcrypto`)
3. ✅ Runs initial schema from `infrastructure/sql/init.sql`
4. ✅ Creates 16 tables with proper relationships
5. ✅ Adds 50+ performance indexes
6. ✅ Sets up triggers for `updated_at` columns
7. ✅ Seeds initial data (admin user, sample patterns/alloys)

### Database Schema Overview

#### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `smiths` | User accounts | email, password_hash, role, permissions |
| `patterns` | Robot design templates | name, category, parameters |
| `alloys` | Robot components | name, type, specifications |
| `sepulkas` | Robot designs | name, version, status, pattern_id |
| `robots` | Individual robots | name, status, battery_level, fleet_id |
| `fleets` | Robot fleets | name, status, locus_id |
| `tasks` | Work assignments | name, type, status, priority |
| `factory_floors` | Physical layouts | name, blueprint_url, dimensions |
| `edicts` | Policies/rules | name, type, rules, severity |

#### Enum Types

```sql
-- Robot Status
'IDLE' | 'WORKING' | 'CHARGING' | 'MAINTENANCE' | 'ERROR' | 'OFFLINE'

-- Task Status
'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

-- Task Priority
'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

-- Task Type
'PICK_AND_PLACE' | 'ASSEMBLY' | 'INSPECTION' | 'TRANSPORT' | 'MAINTENANCE' | 'PATROL' | 'CUSTOM'
```

### Manual Schema Execution

```bash
# Run init.sql directly
psql $DATABASE_URL -f infrastructure/sql/init.sql

# Check tables created
psql $DATABASE_URL -c "\dt"

# Check enum types
psql $DATABASE_URL -c "\dT"
```

## Migrations

### Migration System

Migrations are tracked in `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64)
);
```

### Available Migrations

1. **001_initial_schema** - Created by init.sql
2. **002_add_performance_indexes.sql** - 50+ indexes for query optimization

### Running Migrations

#### Check Status

```bash
./infrastructure/scripts/migrate-neon.sh status
```

Output:
```
Migration                                Status      Applied At
---------------------------------------- ----------  -------------------------
002_add_performance_indexes.sql          Applied     2025-01-15 10:30:45+00
```

#### Apply Migrations

```bash
# Apply all pending migrations
./infrastructure/scripts/migrate-neon.sh up

# Apply specific migration
./infrastructure/scripts/migrate-neon.sh up 002_add_performance_indexes.sql
```

#### Create New Migration

```bash
# Create new migration file
cat > infrastructure/sql/migrations/003_add_telemetry_tables.sql << 'EOF'
-- Migration: 003_add_telemetry_tables.sql
-- Description: Add telemetry data tables

BEGIN;

CREATE TABLE telemetry_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    robot_id UUID NOT NULL REFERENCES robots(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_robot_timestamp
    ON telemetry_data(robot_id, timestamp DESC);

COMMIT;
EOF

# Apply it
./infrastructure/scripts/migrate-neon.sh up
```

### Migration Best Practices

1. **Always use transactions** - Wrap changes in `BEGIN;` / `COMMIT;`
2. **Use IF NOT EXISTS** - Make migrations idempotent
3. **Test on staging first** - Never run untested migrations on production
4. **Create indexes concurrently** - For large tables, use `CREATE INDEX CONCURRENTLY`
5. **Include rollback plan** - Document how to reverse the migration

## Connection Pooling

### Neon Connection Pooling Architecture

Neon provides built-in connection pooling via PgBouncer:

```
Application (100 connections)
      ↓
PgBouncer Pool (Transaction Mode)
      ↓
PostgreSQL (10-20 actual connections)
```

### Connection String Formats

#### Pooled Connection (Recommended)

```bash
# Use pooled endpoint for application connections
DATABASE_URL=postgresql://user:pass@ep-xxx-xxx.neon.tech/sepulki?sslmode=require&pgbouncer=true
```

#### Direct Connection

```bash
# Use direct connection for migrations and admin tasks
DATABASE_URL_DIRECT=postgresql://user:pass@ep-xxx-xxx.neon.tech/sepulki?sslmode=require&connect_timeout=10
```

### Node.js pg Pool Configuration

```javascript
// services/hammer-orchestrator/src/index.ts
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Max connections in application pool
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout for new connections
  statement_timeout: 30000,      // Query timeout: 30s
  query_timeout: 30000
});
```

### Testing Connection Pool

```bash
# Test connection limit
for i in {1..50}; do
  psql "$DATABASE_URL" -c "SELECT pg_sleep(1);" &
done
wait

# Monitor active connections
psql "$DATABASE_URL" -c "SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE datname = current_database();"
```

## Performance Optimization

### Indexes

The migration `002_add_performance_indexes.sql` adds 50+ indexes:

#### Performance Impact

| Query Type | Without Index | With Index | Improvement |
|------------|---------------|------------|-------------|
| WHERE status = 'IDLE' | 1000ms | 10ms | 100x faster |
| JOIN tasks <> robots | 5000ms | 25ms | 200x faster |
| ORDER BY created_at DESC | 800ms | 15ms | 53x faster |

#### Index Monitoring

```sql
-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index sizes
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

### Query Optimization

#### Enable Query Statistics

```sql
-- Check if pg_stat_statements is enabled
SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';

-- View slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries averaging > 100ms
ORDER BY total_time DESC
LIMIT 20;
```

#### EXPLAIN ANALYZE

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT r.*, t.name as task_name
FROM robots r
LEFT JOIN task_robots tr ON r.id = tr.robot_id
LEFT JOIN tasks t ON tr.task_id = t.id
WHERE r.fleet_id = 'uuid-here'
AND r.status = 'WORKING';
```

### Maintenance

```bash
# Update table statistics
psql "$DATABASE_URL" -c "ANALYZE;"

# Vacuum and analyze (Neon handles this automatically)
psql "$DATABASE_URL" -c "VACUUM ANALYZE;"

# Check table bloat
psql "$DATABASE_URL" << 'EOF'
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF
```

## Backup & Recovery

### Automated Backups

Neon automatically backs up your database:

- **Point-in-Time Recovery (PITR)**: Restore to any point in the last 30 days
- **Continuous Backups**: Automatic WAL archiving
- **Branch-Based Recovery**: Create branches for testing recovery

### Creating Database Branches

```bash
# Using neonctl CLI
neonctl branches create --name staging-test --parent main

# Get connection string for branch
neonctl connection-string staging-test
```

### Manual Backup

```bash
# Full database dump
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only
pg_dump "$DATABASE_URL" --schema-only > schema_backup.sql

# Data only
pg_dump "$DATABASE_URL" --data-only > data_backup.sql

# Specific tables
pg_dump "$DATABASE_URL" -t robots -t tasks > critical_tables.sql
```

### Restore Procedures

#### Restore from Backup File

```bash
# Full restore (WARNING: drops existing data)
psql "$DATABASE_URL" < backup_20250115_103045.sql

# Restore specific table
psql "$DATABASE_URL" << EOF
BEGIN;
TRUNCATE TABLE robots CASCADE;
\i robots_backup.sql
COMMIT;
EOF
```

#### Point-in-Time Recovery

Via Neon Console:

1. Go to https://console.neon.tech
2. Select your project
3. Navigate to "Branches"
4. Click "Restore" and select timestamp
5. Create recovery branch
6. Test recovery branch
7. Promote to main if valid

## Monitoring

### Key Metrics

#### Database Performance

```sql
-- Connection count
SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database();

-- Active queries
SELECT
    pid,
    age(clock_timestamp(), query_start) as runtime,
    usename,
    query
FROM pg_stat_activity
WHERE state != 'idle'
AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY runtime DESC;

-- Database size
SELECT
    pg_size_pretty(pg_database_size(current_database())) as db_size;

-- Table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Application Health Checks

```bash
# Health check endpoint
curl http://localhost:4000/health

# Expected response:
{
  "status": "ok",
  "service": "hammer-orchestrator",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "telemetry": { "enabled": false }
}
```

### Neon Console Monitoring

Access metrics at: https://console.neon.tech

Available metrics:
- Compute time
- Data transfer
- Storage size
- Connection count
- Query performance

### Alert Configuration

Set up alerts for:

- **CPU Usage > 80%** - Consider scaling up
- **Connection Count > 90** - Check for connection leaks
- **Query Latency > 1s** - Review slow queries
- **Storage > 80%** - Plan capacity increase

## Security

### Connection Security

#### SSL/TLS Configuration

```javascript
// Always use SSL for Neon connections
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,  // Require valid SSL certificate
    ca: fs.readFileSync('/path/to/ca-cert.pem'),  // Optional: custom CA
  }
});
```

#### IP Allowlist (Optional)

Configure in Neon Console:
1. Go to Project Settings
2. Navigate to "IP Allow"
3. Add your application's IP addresses

### Authentication Best Practices

1. **Use Strong Passwords**
   - Minimum 16 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Rotate every 90 days

2. **Separate User Roles**
   ```sql
   -- Admin user (full access)
   CREATE USER sepulki_admin WITH PASSWORD 'strong-password';
   GRANT ALL PRIVILEGES ON DATABASE sepulki TO sepulki_admin;

   -- Application user (limited access)
   CREATE USER sepulki_app WITH PASSWORD 'strong-password';
   GRANT CONNECT ON DATABASE sepulki TO sepulki_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sepulki_app;
   ```

3. **Store Credentials Securely**
   - Use environment variables
   - Never commit to version control
   - Use secret management services (AWS Secrets Manager, HashiCorp Vault)

### Data Security

#### Encryption at Rest

Neon automatically encrypts all data at rest using AES-256.

#### Row-Level Security (RLS)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE smiths ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY user_isolation ON smiths
    FOR ALL
    USING (id = current_setting('app.current_user_id')::uuid);
```

### Audit Logging

All changes are logged in `audit_stamps` table:

```sql
-- View recent audit logs
SELECT
    entity_type,
    action,
    actor_id,
    timestamp,
    changes
FROM audit_stamps
ORDER BY timestamp DESC
LIMIT 50;

-- Audit specific entity
SELECT * FROM audit_stamps
WHERE entity_type = 'robots'
AND entity_id = 'uuid-here'
ORDER BY timestamp DESC;
```

## Troubleshooting

### Common Issues

#### Issue: Connection Timeout

**Symptoms:**
```
Error: Connection timeout
FATAL: remaining connection slots are reserved for non-replication superuser connections
```

**Solutions:**
1. Use connection pooling
2. Reduce `max` connections in application pool
3. Enable Neon's built-in pooling with `?pgbouncer=true`
4. Check for connection leaks

```javascript
// Add connection error handling
db.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Proper connection cleanup
process.on('SIGTERM', async () => {
  await db.end();
  process.exit(0);
});
```

#### Issue: Slow Queries

**Symptoms:**
- API response times > 1 second
- High CPU usage in Neon Console

**Solutions:**
1. Check missing indexes
   ```sql
   -- Find queries with sequential scans
   SELECT
       schemaname,
       tablename,
       seq_scan,
       seq_tup_read,
       idx_scan,
       seq_tup_read / seq_scan as avg_seq_read
   FROM pg_stat_user_tables
   WHERE seq_scan > 0
   ORDER BY seq_scan DESC;
   ```

2. Analyze query plans
   ```sql
   EXPLAIN ANALYZE SELECT * FROM robots WHERE status = 'IDLE';
   ```

3. Add missing indexes
   ```sql
   CREATE INDEX CONCURRENTLY idx_robots_status ON robots(status);
   ```

#### Issue: SSL Certificate Errors

**Symptoms:**
```
Error: self signed certificate in certificate chain
```

**Solution:**
```javascript
// In Node.js application
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true  // Set to false only for development
  }
});
```

#### Issue: Migration Failures

**Symptoms:**
```
ERROR: relation "robots" already exists
```

**Solutions:**
1. Check migration status
   ```bash
   ./infrastructure/scripts/migrate-neon.sh status
   ```

2. Manually mark migration as applied
   ```sql
   INSERT INTO schema_migrations (version)
   VALUES ('002_add_performance_indexes.sql');
   ```

3. Reset and reapply (DESTRUCTIVE)
   ```bash
   ./infrastructure/scripts/migrate-neon.sh reset
   ./infrastructure/scripts/migrate-neon.sh up
   ```

### Getting Help

1. **Check Logs**
   ```bash
   # Application logs
   npm run dev 2>&1 | tee application.log

   # Database logs (via Neon Console)
   # Visit: https://console.neon.tech > Project > Logs
   ```

2. **Neon Support**
   - Documentation: https://neon.tech/docs
   - Discord: https://discord.gg/neon
   - Support: support@neon.tech

3. **Community Resources**
   - GitHub Issues: [Your Repository]
   - Stack Overflow: Tag `neon-database`

## Next Steps

After successful deployment:

1. ✅ **Configure monitoring alerts**
2. ✅ **Set up CI/CD pipeline** (see `docs/deployment-strategy.md`)
3. ✅ **Review security settings**
4. ✅ **Test backup/recovery procedures**
5. ✅ **Optimize query performance**
6. ✅ **Document runbooks for common operations**

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL 15 Release Notes](https://www.postgresql.org/docs/15/release-15.html)
- [Node.js pg Driver](https://node-postgres.com/)
- [Sepulki API Documentation](./technical-architecture.md)
- [Deployment Strategy](./deployment-strategy.md)

---

**Last Updated:** 2025-01-15
**Maintainer:** Sepulki Platform Team
**Version:** 1.0.0
