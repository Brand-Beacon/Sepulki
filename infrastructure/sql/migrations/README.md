# Database Migrations

This directory contains SQL migration files for the Sepulki database schema.

## Migration Files

- **001_init.sql**: Initial database schema (located in parent directory as `init.sql`)
- **002_add_performance_indexes.sql**: Performance-critical database indexes

## Running Migrations

### Using psql

```bash
# Run migration 002
psql -U your_username -d sepulki -f infrastructure/sql/migrations/002_add_performance_indexes.sql

# Or with connection string
psql postgresql://user:password@localhost:5432/sepulki -f infrastructure/sql/migrations/002_add_performance_indexes.sql
```

### Using Node.js pg client

```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration(filename) {
  const sql = fs.readFileSync(filename, 'utf8');
  await pool.query(sql);
  console.log(`Migration ${filename} completed`);
}

runMigration('infrastructure/sql/migrations/002_add_performance_indexes.sql')
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
```

### Using Docker

```bash
# If running PostgreSQL in Docker
docker exec -i postgres_container psql -U username -d sepulki < infrastructure/sql/migrations/002_add_performance_indexes.sql
```

## Migration Best Practices

### 1. Timing

- Run migrations during low-traffic periods
- Index creation can lock tables temporarily
- Consider using `CREATE INDEX CONCURRENTLY` for production (requires separate transactions)

### 2. Verification

After running migrations, verify index creation:

```sql
-- List all indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check index sizes
SELECT schemaname, tablename, indexname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 3. Monitoring Index Usage

Monitor which indexes are actually being used:

```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find most used indexes
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;
```

### 4. Performance Testing

Before deploying to production:

```sql
-- Reset statistics
SELECT pg_stat_reset();

-- Run typical queries
-- ... your queries here ...

-- Check query plans
EXPLAIN ANALYZE SELECT * FROM robots WHERE fleet_id = 'xxx' AND status = 'WORKING';
EXPLAIN ANALYZE SELECT * FROM tasks WHERE status = 'PENDING' ORDER BY priority DESC;

-- Verify indexes are being used
SELECT * FROM pg_stat_user_indexes WHERE idx_scan > 0;
```

## Index Maintenance

### Regular Maintenance

```sql
-- Reindex table (can lock table)
REINDEX TABLE robots;

-- Reindex table concurrently (PostgreSQL 12+, no locks)
REINDEX TABLE CONCURRENTLY robots;

-- Update statistics
ANALYZE robots;
ANALYZE tasks;
ANALYZE policy_violations;
```

### Monitoring Index Bloat

```sql
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                      pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Rolling Back

All indexes in migration 002 use `DROP INDEX IF EXISTS` for idempotency. To rollback:

```sql
-- Remove all indexes from migration 002
-- (Copy DROP statements from migration file)
BEGIN;
DROP INDEX IF EXISTS idx_edicts_active;
DROP INDEX IF EXISTS idx_edicts_type;
-- ... etc
COMMIT;
```

## Performance Impact

Expected performance improvements:

| Query Type | Expected Speedup | Example |
|------------|-----------------|---------|
| Single-column filters | 10-100x | `WHERE status = 'IDLE'` |
| Composite filters | 20-500x | `WHERE fleet_id = ? AND status = ?` |
| Sorting | 3-20x | `ORDER BY priority DESC` |
| JOIN operations | 5-50x | Robot-Task joins |
| Low battery alerts | 100x | `WHERE battery_level < 20` |
| Active violations | 200x | `WHERE edict_id = ? AND resolved = false` |

## Troubleshooting

### Index Not Being Used

```sql
-- Check if query planner is aware of index
EXPLAIN SELECT * FROM robots WHERE fleet_id = 'xxx' AND status = 'WORKING';

-- Update statistics
ANALYZE robots;

-- Check index definition
\d+ robots
```

### Slow Index Creation

```sql
-- Monitor progress (PostgreSQL 12+)
SELECT query, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state = 'active' AND query LIKE '%CREATE INDEX%';

-- Use CONCURRENTLY (requires autocommit mode)
CREATE INDEX CONCURRENTLY idx_name ON table_name(column);
```

### Duplicate Indexes

```sql
-- Find duplicate indexes
SELECT pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) AS size,
       (array_agg(idx))[1] AS idx1, (array_agg(idx))[2] AS idx2,
       (array_agg(idx))[3] AS idx3, (array_agg(idx))[4] AS idx4
FROM (
    SELECT indexrelid::regclass AS idx,
           (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
            COALESCE(indexprs::text,'')||E'\n' || COALESCE(indpred::text,'')) AS key
    FROM pg_index
) sub
GROUP BY key
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;
```

## Future Migrations

When creating new migrations:

1. Use sequential numbering: `003_description.sql`, `004_description.sql`, etc.
2. Always include `BEGIN;` and `COMMIT;`
3. Use `IF EXISTS` / `IF NOT EXISTS` for idempotency
4. Document expected performance impact
5. Include rollback instructions
6. Test on staging environment first

## References

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [PostgreSQL Index Usage](https://www.postgresql.org/docs/current/indexes-examine.html)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
