# Telemetry Generator Service

Production-quality telemetry data generator for realistic robot fleet simulation during YC demos and development.

## Features

- **Realistic GPS Movement**: Robots follow believable paths (grid patterns, waypoints, circular patrols)
- **Multiple Scenarios**: Pre-configured scenarios for lawn mowing, warehouse logistics, and agriculture
- **Dynamic State Management**: Battery drain, charging, task completion, status transitions
- **Sensor Simulation**: Battery, temperature, CPU, GPS, signal strength, vibration
- **Time Acceleration**: Speed up time 1x to 300x for testing
- **Failure Injection**: Test error handling with configurable failures
- **GraphQL Integration**: Seamless integration with existing subscriptions
- **Zero Configuration**: Works out-of-the-box with intelligent defaults

## Quick Start

### Automatic Initialization

The telemetry service starts automatically when the server launches:

```bash
cd services/hammer-orchestrator
npm run dev
```

By default, it will:
1. Find all active fleets in the database
2. Determine appropriate scenarios based on fleet names/sizes
3. Initialize realistic robot paths and behaviors
4. Start publishing telemetry data via GraphQL subscriptions

### Disable Telemetry

To disable automatic telemetry generation:

```bash
ENABLE_TELEMETRY=false npm run dev
```

## API Endpoints

### Get Telemetry Statistics

```bash
GET /api/telemetry/stats
```

Returns:
```json
{
  "generator": {
    "running": true,
    "robotCount": 12,
    "uptime": 123456,
    "config": { ... }
  },
  "scenarios": [
    {
      "type": "LAWN_MOWING",
      "name": "Autonomous Lawn Care Fleet",
      "fleetId": "fleet-123",
      "robotCount": 12,
      "baseLocation": { ... }
    }
  ],
  "initialized": true
}
```

### Update Configuration

```bash
POST /api/telemetry/config
Content-Type: application/json

{
  "timeAcceleration": 10,
  "failureInjection": {
    "enabled": true,
    "failureRate": 0.05
  }
}
```

### Create Custom Scenario

```bash
POST /api/telemetry/scenario
Content-Type: application/json

{
  "fleetId": "fleet-123",
  "scenarioType": "WAREHOUSE_LOGISTICS"
}
```

Scenario types:
- `LAWN_MOWING` - 12 robots, grid pattern, 200m area
- `WAREHOUSE_LOGISTICS` - 20 robots, waypoint navigation, 150m area
- `AGRICULTURE` - 8 robots, row-based pattern, 300m area
- `CUSTOM` - Circular patrol patterns

## Scenarios

### Lawn Mowing (12 robots)

Perfect for demonstrating:
- Grid-based coverage
- Zone assignment
- Parallel operations
- Battery management

Robots cover a 200m × 200m property using back-and-forth mowing patterns at 0.8 m/s.

### Warehouse Logistics (20 robots)

Perfect for demonstrating:
- Multi-zone operations (receiving, storage, picking, shipping)
- Waypoint navigation
- Task coordination
- High-speed operations

Robots move between warehouse zones at 1.2-2.0 m/s with 5-second pause at waypoints.

### Agriculture (8 robots)

Perfect for demonstrating:
- Precision operations
- Row-based patterns
- Large-scale coverage
- Slow, methodical work

Robots cover 300m field rows at 0.5 m/s with 3m row spacing.

## Configuration Options

### Time Acceleration

Control simulation speed (1x to 300x):

```typescript
telemetryService.updateConfig({
  timeAcceleration: 10  // 10x faster than real-time
});
```

Useful for:
- **1x**: Real-time demos
- **10x**: Quick testing
- **60x**: Hour-long operations in 1 minute
- **300x**: Day-long operations in ~5 minutes

### Update Intervals

Control telemetry publishing frequency:

```typescript
telemetryService.updateConfig({
  updateIntervals: {
    position: 100,   // GPS updates every 100ms
    status: 1000,    // Status updates every 1s
    metrics: 5000    // Detailed metrics every 5s
  }
});
```

### Failure Injection

Test error handling and recovery:

```typescript
telemetryService.updateConfig({
  failureInjection: {
    enabled: true,
    failureRate: 0.05,  // 5% chance per hour
    types: [
      'BATTERY_DRAIN',
      'CONNECTION_LOSS',
      'MOTOR_OVERHEATING',
      'GPS_DRIFT'
    ],
    meanTimeToRecovery: 30  // 30 seconds
  }
});
```

### Realism Level

Control simulation fidelity:

```typescript
telemetryService.updateConfig({
  realismLevel: 'high',  // 'low' | 'medium' | 'high'
  noiseLevel: 0.1        // 0-1, GPS noise level
});
```

## GraphQL Subscriptions

### Robot Status Updates

```graphql
subscription RobotStatus($robotId: ID) {
  robotStatus(robotId: $robotId) {
    id
    status
    batteryLevel
    healthScore
    pose {
      position {
        latitude
        longitude
        altitude
      }
      timestamp
    }
  }
}
```

Updates published:
- Position: Every 100ms
- Status: Every 1s
- Full state: When changed

### Bellows Stream (Fleet Telemetry)

```graphql
subscription BellowsStream($fleetId: ID!) {
  bellowsStream(fleetId: $fleetId) {
    fleetId
    metrics {
      robotId
      timestamp
      metric
      value
      unit
    }
    events {
      robotId
      type
      severity
      message
    }
    realTime
  }
}
```

Published every 5 seconds with comprehensive metrics.

## Programmatic Usage

### Initialize Custom Scenario

```typescript
import { TelemetryIntegrationService } from './services/telemetry-integration';
import { ScenarioType } from './services/telemetry-types';

const telemetryService = new TelemetryIntegrationService(db);

// Start with custom scenario
await telemetryService.createScenario(
  'fleet-123',
  ScenarioType.WAREHOUSE_LOGISTICS
);

telemetryService.getGenerator().start();
```

### Create Custom Paths

```typescript
const generator = telemetryService.getGenerator();
const scenarioManager = telemetryService.getScenarioManager();

// Generate circular patrol
const waypoints = generator.generateCircularPath(
  { latitude: 37.4419, longitude: -122.1430, altitude: 10 },
  50,  // 50 meter radius
  16   // 16 waypoints
);

// Generate grid pattern
const gridWaypoints = generator.generateGridPath(
  { latitude: 37.4419, longitude: -122.1430, altitude: 10 },
  100,  // 100m width
  100,  // 100m height
  2     // 2m row spacing
);

// Assign to robot
generator.setRobotPath('robot-123', {
  waypoints,
  speed: 1.5,
  loopPath: true,
  pauseAtWaypoints: false
});
```

### Monitor Robot State

```typescript
const robotState = generator.getRobotState('robot-123');
console.log(robotState);
// {
//   robotId: 'robot-123',
//   status: 'WORKING',
//   activity: 'WORKING',
//   batteryLevel: 87.5,
//   position: { latitude: 37.4420, longitude: -122.1431 },
//   speed: 1.5,
//   heading: 45.2,
//   temperature: 42.3,
//   healthScore: 98.5,
//   ...
// }
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Server (index.ts)                     │
│  - Initializes telemetry service on startup             │
│  - Provides REST API for control                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│         TelemetryIntegrationService                      │
│  - Bridges generator ↔ GraphQL                          │
│  - Manages database updates                             │
│  - Publishes to GraphQL subscriptions                   │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
┌──────────────▼────────────┐  ┌─────▼──────────────────┐
│   TelemetryGenerator       │  │   ScenarioManager      │
│  - GPS path following      │  │  - Pre-configured      │
│  - Sensor simulation       │  │    scenarios           │
│  - State management        │  │  - Fleet initialization│
│  - Battery modeling        │  │  - Path generation     │
│  - Event generation        │  └────────────────────────┘
└────────────────────────────┘
```

## Performance

- **Memory**: ~5MB per 100 robots
- **CPU**: <1% per 100 robots at 1x speed
- **Network**: ~10KB/s per robot (depends on update frequency)

Scales to 1000+ robots on modest hardware.

## Troubleshooting

### Telemetry not starting

Check logs for:
```
⚠️  Failed to start telemetry generation: ...
```

Common issues:
- Database connection failed
- No active fleets in database
- Fleets missing locus coordinates

### No position updates

Verify robots have paths assigned:
```typescript
const path = generator.getRobotPath('robot-123');
console.log(path);
```

### Robots stuck

Check robot state:
```typescript
const state = generator.getRobotState('robot-123');
console.log('Status:', state.status);
console.log('Activity:', state.activity);
console.log('Speed:', state.speed);
```

### GraphQL subscriptions not receiving data

1. Verify generator is running: `GET /api/telemetry/stats`
2. Check PubSub is working: Look for subscription logs
3. Verify fleet/robot IDs match

## Examples

### YC Demo Setup

```typescript
// Speed up time 60x (1 hour = 1 minute)
telemetryService.updateConfig({ timeAcceleration: 60 });

// Start warehouse scenario
await telemetryService.createScenario(
  'demo-fleet',
  ScenarioType.WAREHOUSE_LOGISTICS
);

// After 2 minutes (2 hours simulated), slow down to real-time
setTimeout(() => {
  telemetryService.updateConfig({ timeAcceleration: 1 });
}, 120000);
```

### Testing Error Recovery

```typescript
// Enable failures
telemetryService.updateConfig({
  failureInjection: {
    enabled: true,
    failureRate: 0.2,  // 20% chance per hour (aggressive)
    types: ['CONNECTION_LOSS', 'BATTERY_DRAIN'],
    meanTimeToRecovery: 15  // Fast recovery for demo
  }
});

// Monitor for 5 minutes
setTimeout(() => {
  // Disable failures
  telemetryService.updateConfig({
    failureInjection: { enabled: false }
  });
}, 300000);
```

## Files

- `telemetry-types.ts` - TypeScript type definitions
- `telemetry-generator.ts` - Core telemetry generation engine
- `scenario-manager.ts` - Pre-configured scenario templates
- `telemetry-integration.ts` - GraphQL and database integration
- `README.md` - This file

## Contributing

When adding new scenarios:

1. Add scenario type to `ScenarioType` enum
2. Implement initialization method in `ScenarioManager`
3. Add to `quickStartDemo()` switch statement
4. Update this README with scenario details

## License

Proprietary - Sepulki Platform
