# GraphQL Telemetry Integration Guide

## Overview
This document describes the GraphQL integration for robot telemetry data in the Sepulki platform.

## Frontend Implementation

### Queries

#### ROBOT_QUERY
Fetches basic robot information including current status.

**Location**: `/apps/forge-ui/src/lib/graphql/queries.ts`

```graphql
query Robot($id: ID!) {
  robot(id: $id) {
    id
    name
    sepulkaId
    fleetId
    status
    batteryLevel
    healthScore
    lastSeen
    pose {
      position {
        latitude
        longitude
        altitude
      }
      orientation
      jointPositions
      timestamp
    }
    streamUrl
    currentIngot {
      id
      version
      status
    }
  }
}
```

**Usage in Frontend**:
```tsx
const { data, loading, error } = useQuery(ROBOT_QUERY, {
  variables: { id: robotId },
  pollInterval: 5000, // Poll every 5 seconds
})
```

---

#### ROBOT_TELEMETRY_QUERY
Fetches historical telemetry data for charts and analytics.

**Location**: `/apps/forge-ui/src/lib/graphql/queries.ts`

```graphql
query RobotTelemetry($robotId: ID!, $timeRange: String, $limit: Int) {
  robotTelemetry(robotId: $robotId, timeRange: $timeRange, limit: $limit) {
    timestamp
    batteryLevel
    healthScore
    status
    performance {
      speed
      efficiency
      uptime
    }
    metrics {
      cpu
      memory
      temperature
    }
  }
}
```

**Usage in Frontend**:
```tsx
const { data, loading } = useQuery(ROBOT_TELEMETRY_QUERY, {
  variables: {
    robotId: '123',
    timeRange: '1h',
    limit: 100
  },
  pollInterval: 5000,
})
```

**Parameters**:
- `robotId` (required): Robot identifier
- `timeRange`: Time window for data (`'1h'`, `'6h'`, `'24h'`, `'7d'`)
- `limit`: Maximum number of data points to return (default: 100)

---

### Subscriptions

#### ROBOT_STATUS_SUBSCRIPTION
WebSocket subscription for real-time robot status updates.

**Location**: `/apps/forge-ui/src/lib/graphql/subscriptions.ts`

```graphql
subscription RobotStatus($robotId: ID!) {
  robotStatus(robotId: $robotId) {
    id
    name
    status
    batteryLevel
    healthScore
    lastSeen
    pose
  }
}
```

**Usage in Frontend**:
```tsx
const { data: subscriptionData } = useSubscription(ROBOT_STATUS_SUBSCRIPTION, {
  variables: { robotId },
})

// Merge with query data
const robot = subscriptionData?.robotStatus || robotData?.robot
```

**Update Frequency**: Real-time (pushed from server when status changes)

---

## Backend Schema Requirements

### Types

```graphql
type Robot {
  id: ID!
  name: String!
  sepulkaId: ID
  fleetId: ID!
  status: RobotStatus!
  batteryLevel: Float!
  healthScore: Float!
  lastSeen: DateTime!
  pose: RobotPose
  streamUrl: String
  currentIngot: Ingot
}

type RobotPose {
  position: Position
  orientation: Float
  jointPositions: [Float!]
  timestamp: DateTime
}

type Position {
  latitude: Float!
  longitude: Float!
  altitude: Float
}

type Ingot {
  id: ID!
  version: String!
  status: IngotStatus!
}

enum RobotStatus {
  WORKING
  IDLE
  CHARGING
  MAINTENANCE
  OFFLINE
}

enum IngotStatus {
  PENDING
  BUILDING
  TESTING
  READY
  DEPLOYED
  FAILED
}
```

### Telemetry Types

```graphql
type RobotTelemetry {
  timestamp: DateTime!
  batteryLevel: Float!
  healthScore: Float!
  status: RobotStatus!
  performance: PerformanceMetrics
  metrics: SystemMetrics
}

type PerformanceMetrics {
  speed: Float!
  efficiency: Float!
  uptime: Float!
}

type SystemMetrics {
  cpu: Float
  memory: Float
  temperature: Float
}
```

### Query Resolvers

```graphql
type Query {
  robot(id: ID!): Robot
  robotTelemetry(
    robotId: ID!
    timeRange: String
    limit: Int
  ): [RobotTelemetry!]!
}
```

### Subscription Resolvers

```graphql
type Subscription {
  robotStatus(robotId: ID!): Robot!
}
```

---

## Backend Implementation Guide

### 1. Telemetry Data Storage

**Recommended**: Use TimescaleDB (PostgreSQL extension) for time-series data.

**Table Schema**:
```sql
CREATE TABLE robot_telemetry (
  id BIGSERIAL,
  robot_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  battery_level FLOAT NOT NULL,
  health_score FLOAT NOT NULL,
  status VARCHAR(50) NOT NULL,
  speed FLOAT,
  efficiency FLOAT,
  uptime FLOAT,
  cpu FLOAT,
  memory FLOAT,
  temperature FLOAT,
  PRIMARY KEY (id, timestamp)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('robot_telemetry', 'timestamp');

-- Create indexes
CREATE INDEX idx_robot_telemetry_robot_id ON robot_telemetry(robot_id, timestamp DESC);
```

---

### 2. GraphQL Resolver Implementation

**Example (Node.js/TypeScript)**:

```typescript
// resolvers/robotTelemetry.ts
export const robotTelemetryResolver = {
  Query: {
    robotTelemetry: async (
      _parent: any,
      args: { robotId: string; timeRange?: string; limit?: number },
      context: GraphQLContext
    ) => {
      const { robotId, timeRange = '1h', limit = 100 } = args

      // Calculate time window
      const now = new Date()
      const timeWindowMap: Record<string, number> = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      }
      const windowMs = timeWindowMap[timeRange] || timeWindowMap['1h']
      const startTime = new Date(now.getTime() - windowMs)

      // Query telemetry data
      const telemetryData = await context.db.query(`
        SELECT
          timestamp,
          battery_level as "batteryLevel",
          health_score as "healthScore",
          status,
          speed,
          efficiency,
          uptime,
          cpu,
          memory,
          temperature
        FROM robot_telemetry
        WHERE robot_id = $1
          AND timestamp >= $2
          AND timestamp <= $3
        ORDER BY timestamp DESC
        LIMIT $4
      `, [robotId, startTime, now, limit])

      // Format response
      return telemetryData.rows.map((row: any) => ({
        timestamp: row.timestamp.toISOString(),
        batteryLevel: row.batteryLevel,
        healthScore: row.healthScore,
        status: row.status,
        performance: {
          speed: row.speed,
          efficiency: row.efficiency,
          uptime: row.uptime,
        },
        metrics: {
          cpu: row.cpu,
          memory: row.memory,
          temperature: row.temperature,
        },
      }))
    },
  },
}
```

---

### 3. WebSocket Subscription Implementation

**Example (GraphQL Yoga + PubSub)**:

```typescript
// subscriptions/robotStatus.ts
import { PubSub } from 'graphql-subscriptions'

const pubsub = new PubSub()

export const robotStatusSubscription = {
  Subscription: {
    robotStatus: {
      subscribe: (_parent: any, args: { robotId: string }) => {
        return pubsub.asyncIterator([`ROBOT_STATUS_${args.robotId}`])
      },
      resolve: (payload: any) => payload,
    },
  },
}

// Publish updates when robot status changes
export const publishRobotStatus = (robotId: string, data: RobotStatus) => {
  pubsub.publish(`ROBOT_STATUS_${robotId}`, data)
}
```

**Integration with Telemetry Generator**:
```typescript
// In telemetry generator or robot controller
import { publishRobotStatus } from './subscriptions/robotStatus'

async function updateRobotStatus(robotId: string) {
  const robot = await getRobotStatus(robotId)

  // Publish to WebSocket subscribers
  publishRobotStatus(robotId, {
    id: robot.id,
    name: robot.name,
    status: robot.status,
    batteryLevel: robot.batteryLevel,
    healthScore: robot.healthScore,
    lastSeen: new Date().toISOString(),
    pose: robot.pose,
  })
}
```

---

## Data Flow

### Query Flow
```
1. Frontend → Apollo Client → useQuery(ROBOT_TELEMETRY_QUERY)
2. GraphQL Request → Backend Server
3. Backend → Query TimescaleDB
4. TimescaleDB → Return time-series data
5. Backend → Format & return to frontend
6. Frontend → Update chart components
```

### Subscription Flow
```
1. Frontend → Apollo Client → useSubscription(ROBOT_STATUS_SUBSCRIPTION)
2. WebSocket connection established
3. Robot status changes → Telemetry generator
4. Generator → publishRobotStatus() → PubSub
5. PubSub → Push to WebSocket subscribers
6. Frontend → Merge subscription data with query data
7. UI updates automatically
```

---

## Testing

### GraphQL Playground Queries

**Test Basic Robot Query**:
```graphql
query TestRobot {
  robot(id: "robot-001") {
    id
    name
    status
    batteryLevel
    healthScore
  }
}
```

**Test Telemetry Query**:
```graphql
query TestTelemetry {
  robotTelemetry(
    robotId: "robot-001"
    timeRange: "1h"
    limit: 10
  ) {
    timestamp
    batteryLevel
    healthScore
    performance {
      speed
      efficiency
      uptime
    }
  }
}
```

**Test Subscription**:
```graphql
subscription TestRobotStatus {
  robotStatus(robotId: "robot-001") {
    id
    status
    batteryLevel
    healthScore
    lastSeen
  }
}
```

---

## Performance Optimization

### Backend Optimizations

1. **Database Indexes**
   ```sql
   CREATE INDEX idx_robot_telemetry_robot_time
   ON robot_telemetry(robot_id, timestamp DESC);
   ```

2. **Data Retention Policy**
   ```sql
   -- Keep detailed data for 30 days
   SELECT add_retention_policy('robot_telemetry', INTERVAL '30 days');

   -- Create continuous aggregates for older data
   CREATE MATERIALIZED VIEW robot_telemetry_hourly
   WITH (timescaledb.continuous) AS
   SELECT
     robot_id,
     time_bucket('1 hour', timestamp) AS hour,
     AVG(battery_level) as avg_battery,
     AVG(health_score) as avg_health,
     AVG(speed) as avg_speed
   FROM robot_telemetry
   GROUP BY robot_id, hour;
   ```

3. **Query Result Caching**
   - Cache telemetry queries for 5 seconds
   - Use Redis or in-memory cache
   - Invalidate cache on new data

### Frontend Optimizations

1. **Polling Interval**: 5 seconds minimum
2. **Data Points**: Limit to 100-200 per chart
3. **Subscription Batching**: Group updates every 1 second
4. **Lazy Loading**: Load charts on scroll/tab switch

---

## Monitoring & Debugging

### Backend Metrics to Track
- Query execution time
- Subscription connection count
- PubSub message rate
- Database query performance

### Frontend Metrics to Track
- WebSocket connection stability
- Query response time
- Subscription message latency
- Chart render performance

### Debug Tools
- Apollo Client DevTools (Chrome extension)
- GraphQL Playground
- WebSocket debugging (Chrome DevTools)
- React DevTools Profiler

---

## Migration Guide

If migrating from REST to GraphQL:

1. **Keep REST endpoints active** during transition
2. **Add GraphQL alongside REST** (dual support)
3. **Migrate frontend components** one by one
4. **Monitor both systems** during transition
5. **Deprecate REST** after 2-4 weeks of stability

---

## Security Considerations

1. **Authentication**: JWT tokens in WebSocket headers
2. **Rate Limiting**: Limit query frequency per user
3. **Data Filtering**: Only return data user has access to
4. **Subscription Auth**: Verify robot ownership before subscribing
5. **Input Validation**: Sanitize all query parameters

---

## Related Documentation

- [Robot Detail Enhancement](/docs/robot-detail-enhancement.md)
- [Chart Components README](/apps/forge-ui/src/components/charts/README.md)
- [Telemetry Types](/apps/forge-ui/src/types/telemetry.ts)
- [Apollo Client Setup](/apps/forge-ui/src/lib/apolloClient.ts)

---

## Support

For issues or questions:
1. Check GraphQL schema documentation
2. Review Apollo Client logs
3. Test queries in GraphQL Playground
4. Check WebSocket connection in Network tab
5. File issue with reproduction steps
