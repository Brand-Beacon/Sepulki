# Fleet Simulation Design - YC Demo

## Executive Summary

This document outlines a comprehensive simulation system for demonstrating robot fleet management capabilities. The system will generate realistic robot behaviors, task execution patterns, and environmental interactions to showcase the application's core features in a compelling, data-rich demo environment.

---

## 1. Simulation Architecture

### 1.1 Core Components

```typescript
// Simulation Engine Architecture
SimulationEngine
├── DataGenerator (Mock robot data)
├── BehaviorEngine (Movement & task logic)
├── PhysicsSimulator (Position & collision)
├── ResourceManager (Battery, fuel, etc.)
├── EventSystem (Status updates, alerts)
└── TimeController (Speed control, scheduling)
```

### 1.2 Mock Robot Data Generation

```typescript
interface RobotConfig {
  id: string;
  name: string;
  type: 'lawn_mower' | 'warehouse_bot' | 'agricultural_bot';
  capabilities: string[];
  maxSpeed: number; // meters per second
  batteryCapacity: number; // Wh
  taskCapacity: number; // concurrent tasks
}

// Robot Generator
class RobotGenerator {
  generateFleet(count: number, type: string): Robot[] {
    // Generate realistic robot configurations
    // Include variation in capabilities and specs
  }

  generateRobotState(robot: Robot): RobotState {
    // Generate initial state with realistic values
  }
}
```

**Sample Robot Profiles:**

```typescript
const robotProfiles = {
  lawn_mower: {
    speed: [0.5, 1.5], // m/s range
    batteryCapacity: [2000, 5000], // Wh
    cutWidth: [0.5, 1.2], // meters
    sensors: ['gps', 'obstacle', 'grass_height']
  },
  warehouse_bot: {
    speed: [1.0, 3.0],
    batteryCapacity: [5000, 10000],
    loadCapacity: [10, 500], // kg
    sensors: ['lidar', 'camera', 'weight', 'barcode']
  },
  agricultural_bot: {
    speed: [0.3, 1.0],
    batteryCapacity: [10000, 30000],
    implements: ['seeder', 'sprayer', 'harvester'],
    sensors: ['gps', 'soil_moisture', 'crop_camera']
  }
};
```

### 1.3 Realistic Movement Patterns

```typescript
// Movement Algorithms
class MovementSimulator {
  // A* pathfinding with realistic constraints
  calculatePath(start: Position, end: Position, obstacles: Obstacle[]): Path {
    // Consider: terrain, battery, robot capabilities
  }

  // Smooth movement with acceleration/deceleration
  updatePosition(robot: Robot, deltaTime: number): Position {
    // Physics-based movement
    // Account for momentum, turning radius
  }

  // Pattern-based movement for different tasks
  generateTaskPattern(task: Task): MovementPattern {
    switch(task.type) {
      case 'mowing':
        return this.generateLawnPattern(task.area);
      case 'picking':
        return this.generateWarehouseRoute(task.items);
      case 'planting':
        return this.generateRowPattern(task.field);
    }
  }
}

// Movement Patterns
interface MovementPattern {
  type: 'grid' | 'spiral' | 'zigzag' | 'point_to_point' | 'coverage';
  waypoints: Position[];
  speed: number;
  turningBehavior: 'sharp' | 'smooth' | 'wide';
}

// Lawn Mowing Pattern (Zigzag)
generateLawnPattern(area: Polygon): MovementPattern {
  // Generate parallel lines with optimal spacing
  // Add turning points at boundaries
  // Ensure complete coverage
}

// Warehouse Route (Optimal picking)
generateWarehouseRoute(items: Item[]): MovementPattern {
  // Traveling salesman optimization
  // Consider aisle constraints
  // Minimize travel time
}
```

### 1.4 Task Execution Simulation

```typescript
interface Task {
  id: string;
  type: 'mowing' | 'picking' | 'delivery' | 'planting' | 'inspection';
  priority: number;
  estimatedDuration: number; // seconds
  area?: Polygon;
  items?: string[];
  dependencies?: string[];
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
}

class TaskSimulator {
  // Task lifecycle management
  assignTask(robot: Robot, task: Task): void {
    // Check robot capabilities
    // Update robot state
    // Begin task execution
  }

  // Progress simulation
  simulateProgress(robot: Robot, task: Task, deltaTime: number): number {
    // Calculate progress based on:
    // - Robot position vs. target
    // - Task type complexity
    // - Environmental factors
    // - Random variation (realistic delays)
  }

  // Task completion logic
  completeTask(robot: Robot, task: Task): TaskResult {
    // Update statistics
    // Generate completion report
    // Release robot for next task
  }

  // Failure scenarios
  introduceFailure(robot: Robot, task: Task): FailureEvent {
    // Random failures: battery, obstacle, malfunction
    // Generate appropriate alerts
    // Trigger recovery procedures
  }
}
```

### 1.5 Battery & Resource Simulation

```typescript
interface ResourceState {
  battery: {
    current: number; // Wh
    capacity: number;
    drainRate: number; // W
    chargeRate: number; // W
  };
  fuel?: {
    current: number; // liters
    capacity: number;
    consumptionRate: number; // L/hour
  };
  maintenance: {
    hoursUntilService: number;
    condition: number; // 0-100%
  };
}

class ResourceSimulator {
  // Battery drain calculation
  calculateBatteryDrain(robot: Robot, deltaTime: number): number {
    const baseDrain = robot.specs.idlePower; // W
    const movementDrain = robot.currentSpeed * robot.specs.speedPowerFactor;
    const taskDrain = this.getTaskPowerConsumption(robot.currentTask);

    // Environmental factors
    const terrainMultiplier = this.getTerrainDifficulty(robot.position);
    const weatherMultiplier = this.getWeatherImpact();

    return (baseDrain + movementDrain + taskDrain) *
           terrainMultiplier * weatherMultiplier * deltaTime;
  }

  // Charging simulation
  simulateCharging(robot: Robot, deltaTime: number): number {
    // Realistic charging curve (fast initially, slower near full)
    const chargeLevel = robot.battery.current / robot.battery.capacity;
    const chargeEfficiency = 1.0 - (chargeLevel * 0.3); // 70-100% efficient

    return robot.battery.chargeRate * chargeEfficiency * deltaTime;
  }

  // Predict remaining runtime
  predictRemainingTime(robot: Robot): number {
    const currentDrainRate = this.calculateCurrentDrainRate(robot);
    return (robot.battery.current / currentDrainRate) * 3600; // seconds
  }
}
```

### 1.6 Environmental Factors

```typescript
interface Environment {
  weather: {
    condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
    temperature: number; // Celsius
    windSpeed: number; // m/s
    visibility: number; // meters
  };
  terrain: {
    type: 'grass' | 'concrete' | 'dirt' | 'gravel';
    slope: number; // degrees
    obstacles: Obstacle[];
  };
  timeOfDay: {
    hour: number;
    daylight: boolean;
  };
}

class EnvironmentSimulator {
  // Weather impacts robot performance
  applyWeatherEffects(robot: Robot, weather: Weather): void {
    // Rain: reduced speed, increased power consumption
    // Wind: affects stability, battery drain
    // Temperature: battery efficiency changes
  }

  // Terrain affects movement
  applyTerrainEffects(robot: Robot, terrain: Terrain): void {
    // Slope: speed reduction uphill, careful downhill
    // Surface: traction, power consumption
  }

  // Dynamic obstacle generation
  generateDynamicObstacles(): Obstacle[] {
    // People, animals, vehicles
    // Temporary obstacles (boxes, equipment)
  }
}
```

---

## 2. Demo Scenarios

### 2.1 Scenario 1: Lawn Mowing Fleet

**Context:** Residential and commercial property maintenance company with 12 autonomous mowers.

**Setup:**
```typescript
const lawnScenario = {
  name: "Lawn Care Operations",
  duration: 8 * 3600, // 8-hour work day
  robots: 12,
  properties: [
    { id: 'p1', size: 5000, type: 'residential', complexity: 'medium' },
    { id: 'p2', size: 12000, type: 'commercial', complexity: 'high' },
    { id: 'p3', size: 3000, type: 'residential', complexity: 'low' },
    // ... more properties
  ],
  goals: {
    areaCompleted: 80000, // sq meters
    efficiency: 0.85,
    customerSatisfaction: 0.9
  }
};
```

**Demo Flow:**
1. **Morning Deployment** (0:00-0:30)
   - Robots leave charging stations
   - Route optimization displayed
   - Battery levels: 95-100%

2. **Peak Operations** (0:30-6:00)
   - Multiple properties serviced simultaneously
   - Real-time progress updates
   - Dynamic rescheduling for weather delays
   - Battery swaps/charging as needed

3. **Incident Handling** (2:30)
   - Robot #7 encounters obstacle (sprinkler)
   - System alerts operator
   - Autonomous rerouting demonstrated
   - Task reassignment to available robot

4. **Optimization Display** (4:00)
   - Dashboard shows efficiency metrics
   - Fuel/battery usage analytics
   - Completed vs. scheduled work
   - Cost savings vs. manual labor

5. **End of Day** (7:30-8:00)
   - Return to base sequence
   - Maintenance alerts for Robot #3
   - Daily summary report generation

**Key Metrics to Display:**
- Total area mowed: 78,450 sq meters
- Average efficiency: 87%
- Battery swaps: 8
- Incidents resolved: 3
- Cost per sq meter: $0.02
- Time saved vs. manual: 45%

### 2.2 Scenario 2: Warehouse Logistics

**Context:** E-commerce fulfillment center with 20 autonomous picking robots.

**Setup:**
```typescript
const warehouseScenario = {
  name: "Warehouse Fulfillment Operations",
  duration: 12 * 3600, // 12-hour shift
  robots: 20,
  warehouse: {
    size: { width: 100, length: 200 }, // meters
    aisles: 40,
    pickingLocations: 5000,
    packingStations: 10
  },
  orderVolume: {
    morning: 150, // orders per hour
    peak: 300,
    evening: 100
  }
};
```

**Demo Flow:**
1. **Shift Start** (0:00-0:15)
   - Robot initialization and health checks
   - Load balancing across zones
   - First wave of orders assigned

2. **Morning Rush** (1:00-4:00)
   - 150+ orders/hour processing
   - Multi-robot coordination in aisles
   - Dynamic path planning to avoid collisions
   - Real-time inventory updates

3. **Peak Hour Challenge** (4:00-6:00)
   - Order volume spikes to 300/hour
   - System auto-scales robot allocation
   - Priority orders expedited
   - Load balancing adjustments

4. **Optimization Event** (5:00)
   - ML model suggests route improvements
   - 12% efficiency gain demonstrated
   - Before/after comparison displayed

5. **Battery Management** (Throughout)
   - Robots rotate to charging during lulls
   - Zero downtime charging strategy
   - Predictive battery swaps

6. **End of Shift** (11:45-12:00)
   - Handoff to next shift
   - Performance summary
   - Maintenance scheduling

**Key Metrics:**
- Orders picked: 2,340
- Pick rate: 195 orders/hour/robot
- Travel distance saved: 45km (vs. human pickers)
- Accuracy: 99.7%
- Battery efficiency: 92%
- Downtime: 0.02%

### 2.3 Scenario 3: Agricultural Tasks

**Context:** Large-scale farm with 8 specialized agricultural robots for planting, monitoring, and harvesting.

**Setup:**
```typescript
const agricultureScenario = {
  name: "Precision Agriculture Operations",
  duration: 10 * 3600, // 10-hour day
  robots: 8,
  farm: {
    totalArea: 500, // hectares
    fields: [
      { id: 'f1', crop: 'corn', area: 150, readyForPlanting: true },
      { id: 'f2', crop: 'soybeans', area: 200, monitoring: true },
      { id: 'f3', crop: 'wheat', area: 150, readyForHarvest: true }
    ]
  },
  tasks: ['planting', 'monitoring', 'harvesting', 'soil_analysis']
};
```

**Demo Flow:**
1. **Dawn Operations** (0:00-1:00)
   - Weather condition assessment
   - Soil moisture sensor data analyzed
   - Task prioritization based on conditions

2. **Planting Operations** (1:00-5:00)
   - 3 robots planting corn in Field 1
   - Precision seed placement
   - Real-time row tracking
   - Fertilizer application optimization

3. **Monitoring & Analysis** (2:00-8:00)
   - 2 robots patrolling soybean fields
   - Crop health imaging
   - Pest detection alerts
   - Irrigation recommendations

4. **Harvesting** (6:00-10:00)
   - 3 robots harvesting wheat
   - Yield estimation in real-time
   - Quality assessment
   - Logistics coordination with storage

5. **Data Analytics Display** (Throughout)
   - Field coverage maps
   - Crop health heatmaps
   - Yield predictions
   - Resource usage optimization

**Key Metrics:**
- Area planted: 45 hectares
- Seeds planted: 1.2 million
- Crop monitoring: 200 hectares
- Harvested: 60 hectares
- Yield: 8.2 tons/hectare
- Water saved: 25%
- Labor cost reduction: 60%

---

## 3. Data Models

### 3.1 Robot State Representation

```typescript
interface Robot {
  // Identity
  id: string;
  name: string;
  type: RobotType;
  model: string;
  serialNumber: string;

  // Current State
  status: 'idle' | 'working' | 'charging' | 'maintenance' | 'error' | 'offline';
  position: {
    lat: number;
    lng: number;
    altitude?: number;
    heading: number; // degrees
    accuracy: number; // meters
  };

  // Movement
  velocity: {
    speed: number; // m/s
    direction: number; // degrees
  };

  // Resources
  battery: {
    level: number; // 0-100%
    voltage: number;
    current: number; // Amperes
    temperature: number; // Celsius
    health: number; // 0-100%
    timeRemaining: number; // seconds
    cycleCount: number;
  };

  // Task Management
  currentTask: Task | null;
  taskQueue: Task[];
  taskHistory: TaskHistory[];

  // Capabilities
  capabilities: string[];
  specifications: {
    maxSpeed: number;
    maxLoad: number;
    workingWidth?: number;
    sensors: string[];
    connectivity: string[];
  };

  // Health & Maintenance
  health: {
    overall: number; // 0-100%
    components: {
      motors: number;
      sensors: number;
      battery: number;
      software: number;
    };
    lastMaintenance: Date;
    nextMaintenance: Date;
    hoursOperated: number;
  };

  // Telemetry
  telemetry: {
    lastUpdate: Date;
    signalStrength: number;
    dataUsage: number; // MB
    errorCount: number;
  };

  // Statistics
  statistics: {
    totalDistance: number; // km
    totalOperatingTime: number; // hours
    tasksCompleted: number;
    efficiency: number; // 0-100%
    uptime: number; // percentage
  };
}
```

### 3.2 Task Definitions

```typescript
interface Task {
  // Identity
  id: string;
  type: TaskType;
  name: string;
  description: string;

  // Assignment
  assignedTo: string | null; // robot ID
  priority: 1 | 2 | 3 | 4 | 5; // 5 = highest
  status: TaskStatus;

  // Timing
  createdAt: Date;
  scheduledStart: Date;
  actualStart: Date | null;
  estimatedDuration: number; // seconds
  actualDuration: number | null;
  deadline: Date | null;

  // Location & Area
  location: {
    type: 'point' | 'area' | 'route';
    coordinates: Position[] | Polygon;
    address?: string;
  };

  // Task-Specific Data
  parameters: {
    // Lawn mowing
    cuttingHeight?: number;
    pattern?: 'zigzag' | 'spiral' | 'perimeter_first';

    // Warehouse
    items?: PickingItem[];
    destination?: Position;

    // Agriculture
    seedType?: string;
    plantingDepth?: number;
    spacing?: number;
  };

  // Requirements
  requirements: {
    robotType: RobotType[];
    capabilities: string[];
    minimumBattery: number;
    weather?: WeatherRequirement;
  };

  // Dependencies
  dependencies: string[]; // task IDs that must complete first
  blockedBy: string[]; // tasks blocking this one

  // Progress
  progress: {
    percentage: number; // 0-100
    areaCompleted?: number; // sq meters
    itemsProcessed?: number;
    checkpoints: Checkpoint[];
  };

  // Results
  result: {
    status: 'success' | 'partial' | 'failed';
    quality: number; // 0-100%
    issues: Issue[];
    notes: string;
    metadata: Record<string, any>;
  } | null;
}

type TaskType =
  | 'mowing'
  | 'picking'
  | 'delivery'
  | 'planting'
  | 'harvesting'
  | 'monitoring'
  | 'inspection'
  | 'charging'
  | 'maintenance';

type TaskStatus =
  | 'pending'
  | 'scheduled'
  | 'assigned'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

### 3.3 Location & Position Data

```typescript
interface Position {
  lat: number;
  lng: number;
  altitude?: number;
  timestamp: Date;
}

interface Polygon {
  type: 'Polygon';
  coordinates: Position[][];
  properties?: {
    area: number; // sq meters
    perimeter: number; // meters
    obstacles: Obstacle[];
  };
}

interface Obstacle {
  id: string;
  type: 'static' | 'dynamic';
  shape: 'point' | 'circle' | 'polygon';
  position: Position;
  radius?: number;
  polygon?: Position[];
  severity: 'warning' | 'danger';
  metadata?: {
    name?: string;
    description?: string;
    temporary?: boolean;
  };
}

interface Zone {
  id: string;
  name: string;
  type: 'work' | 'charging' | 'restricted' | 'parking';
  boundary: Polygon;
  properties: {
    priority?: number;
    maxRobots?: number;
    requiredCapabilities?: string[];
  };
}
```

### 3.4 Status Updates

```typescript
interface StatusUpdate {
  id: string;
  timestamp: Date;
  robotId: string;

  // Update Type
  type:
    | 'position'
    | 'battery'
    | 'task_progress'
    | 'status_change'
    | 'alert'
    | 'telemetry';

  // Data
  data: {
    position?: Position;
    battery?: BatteryStatus;
    task?: TaskProgress;
    status?: RobotStatus;
    alert?: Alert;
    telemetry?: TelemetryData;
  };

  // Metadata
  priority: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  source: 'robot' | 'system' | 'operator';
}

interface Alert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'battery' | 'task' | 'safety' | 'maintenance' | 'connectivity';
  message: string;
  details: Record<string, any>;
  actionRequired: boolean;
  suggestedActions?: string[];
}

interface TelemetryData {
  cpu: number; // percentage
  memory: number; // MB
  temperature: number; // Celsius
  network: {
    signalStrength: number;
    latency: number; // ms
    bandwidth: number; // Mbps
  };
  sensors: {
    name: string;
    status: 'ok' | 'degraded' | 'error';
    value?: number;
  }[];
}
```

---

## 4. Real-time Updates

### 4.1 WebSocket Event Structure

```typescript
// WebSocket Message Types
type WSMessage =
  | RobotPositionUpdate
  | RobotStatusUpdate
  | TaskUpdate
  | AlertEvent
  | SystemEvent;

// Base message structure
interface BaseWSMessage {
  type: string;
  timestamp: Date;
  sequenceNumber: number;
  source: string;
}

// Position updates (high frequency)
interface RobotPositionUpdate extends BaseWSMessage {
  type: 'robot:position';
  data: {
    robotId: string;
    position: Position;
    velocity: Velocity;
    heading: number;
  };
}

// Status updates (medium frequency)
interface RobotStatusUpdate extends BaseWSMessage {
  type: 'robot:status';
  data: {
    robotId: string;
    status: RobotStatus;
    battery: BatteryStatus;
    currentTask: string | null;
    health: HealthStatus;
  };
}

// Task updates (low frequency)
interface TaskUpdate extends BaseWSMessage {
  type: 'task:update';
  data: {
    taskId: string;
    robotId: string;
    status: TaskStatus;
    progress: number;
    eta: number; // seconds
  };
}

// Alert events (as needed)
interface AlertEvent extends BaseWSMessage {
  type: 'alert';
  data: Alert;
}

// System events
interface SystemEvent extends BaseWSMessage {
  type: 'system:event';
  data: {
    eventType: string;
    severity: string;
    message: string;
    affectedRobots?: string[];
  };
}
```

### 4.2 Update Frequency

```typescript
const updateFrequencies = {
  // Position updates
  position: {
    idle: 5000,        // 5 seconds
    moving: 1000,      // 1 second
    critical: 100,     // 100ms (near obstacles)
  },

  // Status updates
  status: {
    routine: 10000,    // 10 seconds
    working: 5000,     // 5 seconds
    alert: 1000,       // 1 second
  },

  // Battery updates
  battery: {
    normal: 30000,     // 30 seconds
    low: 10000,        // 10 seconds (< 20%)
    critical: 5000,    // 5 seconds (< 10%)
  },

  // Task progress
  task: {
    update: 15000,     // 15 seconds
    milestone: 0,      // immediate
  },

  // Telemetry
  telemetry: {
    basic: 60000,      // 1 minute
    detailed: 300000,  // 5 minutes
  }
};
```

### 4.3 State Transitions

```typescript
// Robot Status State Machine
const statusTransitions = {
  offline: ['idle'],
  idle: ['working', 'charging', 'maintenance', 'offline'],
  working: ['idle', 'charging', 'error', 'offline'],
  charging: ['idle', 'offline'],
  maintenance: ['idle', 'offline'],
  error: ['idle', 'maintenance', 'offline']
};

// Task Status State Machine
const taskTransitions = {
  pending: ['scheduled', 'cancelled'],
  scheduled: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['paused', 'completed', 'failed'],
  paused: ['in_progress', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: []
};

// Event-driven state changes
interface StateChange {
  entity: 'robot' | 'task';
  entityId: string;
  from: string;
  to: string;
  reason: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// State change handler
class StateManager {
  async transitionState(
    entity: Entity,
    newState: string,
    reason: string
  ): Promise<StateChange> {
    // Validate transition
    const validTransition = this.validateTransition(
      entity.currentState,
      newState,
      entity.type
    );

    if (!validTransition) {
      throw new Error(`Invalid transition: ${entity.currentState} -> ${newState}`);
    }

    // Execute transition
    const change = await this.executeTransition(entity, newState, reason);

    // Emit events
    this.eventBus.emit('state:changed', change);

    // Trigger side effects
    await this.handleSideEffects(change);

    return change;
  }

  private async handleSideEffects(change: StateChange): Promise<void> {
    // Example: Robot goes to charging -> release current task
    if (change.to === 'charging' && change.entity === 'robot') {
      await this.taskManager.releaseRobotTasks(change.entityId);
    }

    // Example: Task failed -> alert operator, find replacement robot
    if (change.to === 'failed' && change.entity === 'task') {
      await this.alerting.sendAlert({
        severity: 'warning',
        message: `Task ${change.entityId} failed`,
        reason: change.reason
      });
      await this.taskManager.reassignTask(change.entityId);
    }
  }
}
```

### 4.4 WebSocket Connection Management

```typescript
// Client-side connection setup
class SimulationWebSocket {
  private ws: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('Simulation WebSocket connected');
      this.reconnectAttempts = 0;

      // Subscribe to specific robot updates
      this.subscribe(['robot:*', 'task:update', 'alert']);
    };

    this.ws.onmessage = (event) => {
      const message: WSMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.attemptReconnect();
    };
  }

  private subscribe(channels: string[]): void {
    this.send({
      type: 'subscribe',
      channels: channels
    });
  }

  private handleMessage(message: WSMessage): void {
    switch (message.type) {
      case 'robot:position':
        this.updateRobotPosition(message.data);
        break;
      case 'robot:status':
        this.updateRobotStatus(message.data);
        break;
      case 'task:update':
        this.updateTask(message.data);
        break;
      case 'alert':
        this.handleAlert(message.data);
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      setTimeout(() => {
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.connect(this.ws.url);
      }, delay);
    }
  }
}
```

---

## 5. Demo Mode Features

### 5.1 Speed Controls (Time Manipulation)

```typescript
class TimeController {
  private timeScale = 1.0; // 1.0 = real-time
  private simulationTime: Date;
  private realStartTime: Date;

  constructor(startTime: Date = new Date()) {
    this.simulationTime = startTime;
    this.realStartTime = new Date();
  }

  // Set simulation speed
  setSpeed(scale: number): void {
    // scale values: 0.5 = half speed, 1.0 = real-time, 2.0 = 2x, 10.0 = 10x, 60.0 = 1 hour/minute
    this.timeScale = Math.max(0.1, Math.min(scale, 1000));
    this.realStartTime = new Date();
  }

  // Get current simulation time
  getCurrentTime(): Date {
    const realElapsed = Date.now() - this.realStartTime.getTime();
    const simulatedElapsed = realElapsed * this.timeScale;
    return new Date(this.simulationTime.getTime() + simulatedElapsed);
  }

  // Convert real delta to simulated delta
  getSimulatedDelta(realDelta: number): number {
    return realDelta * this.timeScale;
  }

  // Jump to specific time
  jumpToTime(time: Date): void {
    this.simulationTime = time;
    this.realStartTime = new Date();
  }

  // Presets
  presets = {
    paused: 0,
    halfSpeed: 0.5,
    realTime: 1.0,
    fast: 5.0,
    veryFast: 10.0,
    ultraFast: 60.0, // 1 hour per minute
    timeWarp: 300.0  // 5 hours per minute
  };
}

// UI Controls
interface TimeControlUI {
  speed: number;
  isPlaying: boolean;
  currentTime: Date;
  elapsedTime: number;

  controls: {
    play: () => void;
    pause: () => void;
    setSpeed: (speed: number) => void;
    reset: () => void;
    jumpTo: (time: Date) => void;
  };

  presets: {
    name: string;
    speed: number;
    description: string;
  }[];
}
```

### 5.2 Scenario Switching

```typescript
class ScenarioManager {
  private scenarios: Map<string, Scenario>;
  private currentScenario: Scenario | null = null;

  // Load and switch scenarios
  async switchScenario(scenarioId: string): Promise<void> {
    // Save current state if needed
    if (this.currentScenario) {
      await this.saveScenarioState(this.currentScenario);
    }

    // Load new scenario
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    // Reset simulation
    await this.resetSimulation();

    // Initialize new scenario
    await this.initializeScenario(scenario);

    this.currentScenario = scenario;
  }

  private async initializeScenario(scenario: Scenario): Promise<void> {
    // Create robots
    for (const robotConfig of scenario.robots) {
      await this.spawnRobot(robotConfig);
    }

    // Create tasks
    for (const taskTemplate of scenario.tasks) {
      await this.createTask(taskTemplate);
    }

    // Set environment
    await this.setEnvironment(scenario.environment);

    // Configure events
    await this.scheduleEvents(scenario.scheduledEvents);
  }

  // Scenario templates
  getScenarios(): ScenarioInfo[] {
    return [
      {
        id: 'lawn_mowing',
        name: 'Lawn Care Operations',
        description: '12 robots servicing residential and commercial properties',
        duration: 8 * 3600,
        robotCount: 12,
        complexity: 'medium',
        highlights: [
          'Multi-property coordination',
          'Battery management',
          'Incident handling',
          'Route optimization'
        ]
      },
      {
        id: 'warehouse',
        name: 'Warehouse Fulfillment',
        description: '20 picking robots in e-commerce fulfillment center',
        duration: 12 * 3600,
        robotCount: 20,
        complexity: 'high',
        highlights: [
          'High-volume order processing',
          'Dynamic path planning',
          'Load balancing',
          'Zero-downtime charging'
        ]
      },
      {
        id: 'agriculture',
        name: 'Precision Agriculture',
        description: '8 specialized robots for planting, monitoring, and harvesting',
        duration: 10 * 3600,
        robotCount: 8,
        complexity: 'high',
        highlights: [
          'Multi-task operations',
          'Data-driven decisions',
          'Crop health monitoring',
          'Yield optimization'
        ]
      }
    ];
  }

  // Quick scenario snapshots
  createSnapshot(name: string): ScenarioSnapshot {
    return {
      name,
      timestamp: new Date(),
      robots: this.getRobotStates(),
      tasks: this.getTaskStates(),
      environment: this.getEnvironmentState(),
      statistics: this.getStatistics()
    };
  }

  loadSnapshot(snapshot: ScenarioSnapshot): void {
    this.restoreState(snapshot);
  }
}
```

### 5.3 Manual Robot Control

```typescript
class ManualController {
  private controlledRobot: Robot | null = null;

  // Take control of a robot
  takeControl(robotId: string): void {
    const robot = this.getRobot(robotId);

    // Pause current task
    if (robot.currentTask) {
      this.pauseTask(robot.currentTask);
    }

    robot.status = 'manual_control';
    this.controlledRobot = robot;
  }

  // Release control
  releaseControl(): void {
    if (this.controlledRobot) {
      this.controlledRobot.status = 'idle';

      // Resume task if applicable
      if (this.controlledRobot.currentTask) {
        this.resumeTask(this.controlledRobot.currentTask);
      }

      this.controlledRobot = null;
    }
  }

  // Manual controls
  moveRobot(direction: Vector, speed: number): void {
    if (!this.controlledRobot) return;

    this.controlledRobot.velocity = {
      speed: Math.min(speed, this.controlledRobot.specs.maxSpeed),
      direction: direction.angle
    };
  }

  stopRobot(): void {
    if (!this.controlledRobot) return;

    this.controlledRobot.velocity.speed = 0;
  }

  assignTask(taskId: string): void {
    if (!this.controlledRobot) return;

    const task = this.getTask(taskId);
    this.taskManager.assignTask(this.controlledRobot, task);
    this.releaseControl();
  }

  // UI Controls
  getControlInterface(): ControlInterface {
    return {
      isActive: this.controlledRobot !== null,
      robot: this.controlledRobot,

      commands: {
        move: (x: number, y: number) => this.moveRobot({x, y}, 1.0),
        stop: () => this.stopRobot(),
        rotate: (angle: number) => this.rotateRobot(angle),
        setSpeed: (speed: number) => this.setSpeed(speed)
      },

      shortcuts: {
        'W': 'move forward',
        'S': 'move backward',
        'A': 'turn left',
        'D': 'turn right',
        'Space': 'stop',
        'Esc': 'release control'
      }
    };
  }
}
```

### 5.4 Event Injection

```typescript
class EventInjector {
  // Inject failure events
  injectFailure(robotId: string, failureType: FailureType): void {
    const robot = this.getRobot(robotId);

    switch (failureType) {
      case 'battery_failure':
        robot.battery.health = 0;
        robot.battery.level = 5;
        this.createAlert(robot, 'Battery failure detected', 'critical');
        break;

      case 'sensor_malfunction':
        robot.health.components.sensors = 0;
        this.createAlert(robot, 'Sensor malfunction', 'warning');
        robot.velocity.speed *= 0.5; // Reduce speed
        break;

      case 'motor_issue':
        robot.health.components.motors = 30;
        robot.specs.maxSpeed *= 0.6; // Reduce max speed
        this.createAlert(robot, 'Motor performance degraded', 'warning');
        break;

      case 'communication_loss':
        robot.telemetry.signalStrength = 0;
        this.createAlert(robot, 'Communication lost', 'critical');
        this.handleCommunicationLoss(robot);
        break;
    }
  }

  // Inject obstacles
  injectObstacle(position: Position, type: ObstacleType): Obstacle {
    const obstacle: Obstacle = {
      id: generateId(),
      type: 'dynamic',
      shape: type === 'person' ? 'circle' : 'polygon',
      position: position,
      radius: type === 'person' ? 0.5 : 1.0,
      severity: type === 'hazard' ? 'danger' : 'warning',
      metadata: {
        name: type,
        temporary: true
      }
    };

    // Add to environment
    this.environment.obstacles.push(obstacle);

    // Alert nearby robots
    this.alertNearbyRobots(obstacle, 10); // 10 meter radius

    return obstacle;
  }

  // Inject weather changes
  injectWeather(condition: WeatherCondition): void {
    this.environment.weather = condition;

    // Apply effects to all robots
    for (const robot of this.robots.values()) {
      this.environmentSimulator.applyWeatherEffects(robot, condition);
    }

    // Notify system
    this.eventBus.emit('weather:changed', condition);
  }

  // Inject high-priority task
  injectUrgentTask(task: Partial<Task>): Task {
    const urgentTask: Task = {
      ...task,
      id: generateId(),
      priority: 5,
      status: 'pending',
      createdAt: new Date()
    } as Task;

    // Find best robot immediately
    const bestRobot = this.findBestRobot(urgentTask);

    if (bestRobot) {
      // Preempt current task if lower priority
      if (bestRobot.currentTask && bestRobot.currentTask.priority < 5) {
        this.pauseTask(bestRobot.currentTask);
      }

      this.assignTask(bestRobot, urgentTask);
    }

    return urgentTask;
  }

  // Scheduled event injection
  scheduleEvent(event: ScheduledEvent): void {
    const delay = event.triggerTime.getTime() - Date.now();

    setTimeout(() => {
      switch (event.type) {
        case 'failure':
          this.injectFailure(event.robotId, event.failureType);
          break;
        case 'obstacle':
          this.injectObstacle(event.position, event.obstacleType);
          break;
        case 'weather':
          this.injectWeather(event.weather);
          break;
        case 'urgent_task':
          this.injectUrgentTask(event.task);
          break;
      }
    }, delay);
  }

  // Event presets for demonstrations
  getDemoEvents(): DemoEvent[] {
    return [
      {
        name: 'Battery Failure',
        description: 'Simulate sudden battery failure on active robot',
        trigger: () => this.injectFailure(this.getRandomActiveRobot(), 'battery_failure')
      },
      {
        name: 'Pedestrian Obstacle',
        description: 'Person walks into robot path',
        trigger: () => this.injectObstacle(this.getRandomRobotPath(), 'person')
      },
      {
        name: 'Rain Storm',
        description: 'Sudden weather change affecting operations',
        trigger: () => this.injectWeather({ condition: 'rainy', intensity: 'heavy' })
      },
      {
        name: 'Emergency Task',
        description: 'High-priority task that preempts current work',
        trigger: () => this.injectUrgentTask({ type: 'delivery', priority: 5 })
      }
    ];
  }
}
```

### 5.5 Demo UI Features

```typescript
interface DemoModeUI {
  // Time controls
  timeControl: {
    currentSpeed: number;
    isPlaying: boolean;
    currentTime: Date;
    presets: TimePreset[];
  };

  // Scenario controls
  scenarioControl: {
    currentScenario: string;
    availableScenarios: ScenarioInfo[];
    switchScenario: (id: string) => void;
    createSnapshot: () => void;
    loadSnapshot: (id: string) => void;
  };

  // Manual control
  manualControl: {
    isActive: boolean;
    controlledRobot: Robot | null;
    takeControl: (robotId: string) => void;
    releaseControl: () => void;
    commands: ControlCommands;
  };

  // Event injection
  eventInjection: {
    availableEvents: DemoEvent[];
    injectEvent: (eventId: string) => void;
    scheduleEvent: (event: ScheduledEvent) => void;
    activeEvents: ScheduledEvent[];
  };

  // Visualization options
  visualization: {
    showPaths: boolean;
    showBatteryLevels: boolean;
    showTaskAreas: boolean;
    showObstacles: boolean;
    showSensorRange: boolean;
    showHeatmaps: boolean;
    cameraFollow: string | null; // robot ID
  };

  // Analytics panels
  analytics: {
    realTimeMetrics: Metric[];
    performanceCharts: Chart[];
    comparisonView: boolean;
    exportData: () => void;
  };

  // Presentation mode
  presentationMode: {
    enabled: boolean;
    autoAdvance: boolean;
    highlightKey: string[];
    narrationText: string;
  };
}
```

---

## 6. Implementation Approach

### 6.1 Backend Implementation (Node.js/TypeScript)

**Location:** `/backend/src/simulation/`

**Core Files:**
```
backend/src/simulation/
├── index.ts                    # Main simulation engine
├── robot-generator.ts          # Robot creation and initialization
├── movement-simulator.ts       # Movement and pathfinding
├── task-simulator.ts           # Task management and execution
├── resource-simulator.ts       # Battery and resource management
├── environment-simulator.ts    # Weather, terrain, obstacles
├── time-controller.ts          # Time manipulation
├── event-injector.ts           # Demo event injection
├── websocket-manager.ts        # Real-time updates
└── scenarios/
    ├── lawn-mowing.ts
    ├── warehouse.ts
    └── agriculture.ts
```

**Key Dependencies:**
```json
{
  "dependencies": {
    "ws": "^8.14.0",              // WebSocket server
    "uuid": "^9.0.0",             // ID generation
    "date-fns": "^2.30.0",        // Time manipulation
    "turf": "^6.5.0",             // Geospatial calculations
    "pathfinding": "^0.4.18",     // A* pathfinding
    "seedrandom": "^3.0.5"        // Deterministic random
  }
}
```

**Example: Main Simulation Engine**

```typescript
// backend/src/simulation/index.ts
import { EventEmitter } from 'events';
import { RobotGenerator } from './robot-generator';
import { MovementSimulator } from './movement-simulator';
import { TaskSimulator } from './task-simulator';
import { ResourceSimulator } from './resource-simulator';
import { TimeController } from './time-controller';
import { WebSocketManager } from './websocket-manager';

export class SimulationEngine extends EventEmitter {
  private robots: Map<string, Robot> = new Map();
  private tasks: Map<string, Task> = new Map();
  private isRunning = false;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(
    private robotGenerator: RobotGenerator,
    private movementSim: MovementSimulator,
    private taskSim: TaskSimulator,
    private resourceSim: ResourceSimulator,
    private timeController: TimeController,
    private wsManager: WebSocketManager
  ) {
    super();
  }

  // Initialize simulation
  async initialize(scenario: Scenario): Promise<void> {
    // Generate robots
    const robots = this.robotGenerator.generateFleet(
      scenario.robotCount,
      scenario.robotType
    );

    for (const robot of robots) {
      this.robots.set(robot.id, robot);
    }

    // Generate tasks
    const tasks = this.taskSim.generateTasks(scenario);
    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }

    // Assign initial tasks
    await this.assignInitialTasks();

    this.emit('initialized', {
      robotCount: this.robots.size,
      taskCount: this.tasks.size
    });
  }

  // Main simulation loop
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    const updateRate = 100; // 100ms = 10 updates/second

    this.updateInterval = setInterval(() => {
      this.update(updateRate / 1000); // Convert to seconds
    }, updateRate);

    this.emit('started');
  }

  // Update simulation state
  private update(deltaTime: number): void {
    const simDelta = this.timeController.getSimulatedDelta(deltaTime);

    // Update each robot
    for (const robot of this.robots.values()) {
      // Update position
      if (robot.status === 'working') {
        this.movementSim.updatePosition(robot, simDelta);
        this.wsManager.broadcastPosition(robot);
      }

      // Update resources
      this.resourceSim.updateBattery(robot, simDelta);

      // Update task progress
      if (robot.currentTask) {
        const progress = this.taskSim.simulateProgress(
          robot,
          robot.currentTask,
          simDelta
        );

        if (progress >= 100) {
          this.completeTask(robot, robot.currentTask);
        }
      }

      // Check for alerts
      this.checkRobotAlerts(robot);
    }

    // Broadcast periodic status updates
    if (Date.now() % 5000 < 100) { // Every ~5 seconds
      this.broadcastStatusUpdates();
    }
  }

  // Stop simulation
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.emit('stopped');
  }

  // Task management
  private async assignInitialTasks(): Promise<void> {
    const availableRobots = Array.from(this.robots.values())
      .filter(r => r.status === 'idle');

    const pendingTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => b.priority - a.priority);

    for (const task of pendingTasks) {
      const bestRobot = this.findBestRobot(task, availableRobots);
      if (bestRobot) {
        await this.taskSim.assignTask(bestRobot, task);
        availableRobots.splice(availableRobots.indexOf(bestRobot), 1);
      }
    }
  }

  private completeTask(robot: Robot, task: Task): void {
    this.taskSim.completeTask(robot, task);

    // Assign next task
    const nextTask = this.findNextTask(robot);
    if (nextTask) {
      this.taskSim.assignTask(robot, nextTask);
    } else {
      robot.status = 'idle';
    }

    this.wsManager.broadcastTaskUpdate(task);
  }

  // Alert checking
  private checkRobotAlerts(robot: Robot): void {
    // Low battery
    if (robot.battery.level < 20 && !robot.alerts.has('low_battery')) {
      this.createAlert(robot, 'low_battery', 'warning', 'Battery below 20%');
    }

    // Critical battery
    if (robot.battery.level < 10 && !robot.alerts.has('critical_battery')) {
      this.createAlert(robot, 'critical_battery', 'critical', 'Battery critical!');
      this.sendToCharging(robot);
    }

    // Maintenance due
    if (robot.health.hoursUntilService < 10) {
      this.createAlert(robot, 'maintenance_due', 'info', 'Maintenance due soon');
    }
  }

  // Public API methods
  getRobot(id: string): Robot | undefined {
    return this.robots.get(id);
  }

  getAllRobots(): Robot[] {
    return Array.from(this.robots.values());
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  setTimeSpeed(speed: number): void {
    this.timeController.setSpeed(speed);
    this.emit('speed_changed', speed);
  }
}
```

### 6.2 Frontend Implementation (React/TypeScript)

**Location:** `/app/simulation/`

**Core Components:**
```
app/simulation/
├── SimulationProvider.tsx      # React context and state management
├── MapView.tsx                 # Main map visualization
├── RobotMarkers.tsx            # Robot position markers
├── TaskOverlays.tsx            # Task area visualization
├── ControlPanel.tsx            # Demo controls
├── TimeControls.tsx            # Time manipulation UI
├── ScenarioSelector.tsx        # Scenario switching
├── EventInjector.tsx           # Event injection UI
├── AnalyticsDashboard.tsx      # Real-time metrics
└── hooks/
    ├── useSimulationWebSocket.ts
    ├── useRobotTracking.ts
    └── useSimulationState.ts
```

**Key Dependencies:**
```json
{
  "dependencies": {
    "react-map-gl": "^7.1.0",       // Mapbox integration
    "mapbox-gl": "^2.15.0",         // Map rendering
    "@turf/turf": "^6.5.0",         // Geospatial operations
    "recharts": "^2.8.0",           // Charts and analytics
    "framer-motion": "^10.16.0",    // Animations
    "zustand": "^4.4.0"             // State management
  }
}
```

**Example: WebSocket Hook**

```typescript
// app/simulation/hooks/useSimulationWebSocket.ts
import { useEffect, useState, useCallback } from 'react';
import { useSimulationStore } from '../store';

export function useSimulationWebSocket(url: string) {
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const updateRobotPosition = useSimulationStore(s => s.updateRobotPosition);
  const updateRobotStatus = useSimulationStore(s => s.updateRobotStatus);
  const updateTask = useSimulationStore(s => s.updateTask);
  const addAlert = useSimulationStore(s => s.addAlert);

  useEffect(() => {
    const websocket = new WebSocket(url);

    websocket.onopen = () => {
      console.log('Connected to simulation');
      setConnected(true);

      // Subscribe to all updates
      websocket.send(JSON.stringify({
        type: 'subscribe',
        channels: ['robot:*', 'task:*', 'alert']
      }));
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'robot:position':
          updateRobotPosition(message.data);
          break;
        case 'robot:status':
          updateRobotStatus(message.data);
          break;
        case 'task:update':
          updateTask(message.data);
          break;
        case 'alert':
          addAlert(message.data);
          break;
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('Disconnected from simulation');
      setConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [url]);

  const send = useCallback((data: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, [ws]);

  return { connected, send };
}
```

**Example: Map View Component**

```typescript
// app/simulation/MapView.tsx
import React, { useMemo } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import { useSimulationStore } from './store';
import { RobotMarker } from './RobotMarkers';
import { TaskOverlay } from './TaskOverlays';

export function SimulationMapView() {
  const robots = useSimulationStore(s => s.robots);
  const tasks = useSimulationStore(s => s.tasks);
  const showPaths = useSimulationStore(s => s.visualization.showPaths);
  const cameraFollow = useSimulationStore(s => s.visualization.cameraFollow);

  // Calculate map center
  const center = useMemo(() => {
    if (cameraFollow) {
      const robot = robots.find(r => r.id === cameraFollow);
      if (robot) {
        return {
          latitude: robot.position.lat,
          longitude: robot.position.lng,
          zoom: 16
        };
      }
    }

    // Center on all robots
    if (robots.length > 0) {
      const avgLat = robots.reduce((sum, r) => sum + r.position.lat, 0) / robots.length;
      const avgLng = robots.reduce((sum, r) => sum + r.position.lng, 0) / robots.length;
      return { latitude: avgLat, longitude: avgLng, zoom: 14 };
    }

    return { latitude: 37.7749, longitude: -122.4194, zoom: 12 };
  }, [robots, cameraFollow]);

  return (
    <Map
      {...center}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      {/* Task areas */}
      {tasks.map(task => (
        <TaskOverlay key={task.id} task={task} />
      ))}

      {/* Robot markers */}
      {robots.map(robot => (
        <RobotMarker
          key={robot.id}
          robot={robot}
          showPath={showPaths}
        />
      ))}
    </Map>
  );
}
```

### 6.3 Integration Strategy

**Phase 1: Core Simulation (Week 1)**
- Implement basic simulation engine
- Robot data generation
- Simple movement patterns
- WebSocket communication
- Basic map visualization

**Phase 2: Scenarios & Tasks (Week 2)**
- Implement all three scenarios
- Task generation and assignment
- Resource simulation (battery)
- Time controls
- Demo event injection

**Phase 3: UI & Polish (Week 3)**
- Complete dashboard UI
- Analytics panels
- Manual controls
- Scenario switching
- Performance optimization

**Phase 4: Demo Preparation (Week 4)**
- Create demo scripts
- Test all scenarios
- Performance tuning
- Documentation
- Practice presentations

### 6.4 Libraries & Frameworks

**Backend:**
- **ws** (^8.14.0) - WebSocket server for real-time updates
- **turf** (^6.5.0) - Geospatial calculations and polygon operations
- **pathfinding** (^0.4.18) - A* algorithm for robot pathfinding
- **seedrandom** (^3.0.5) - Deterministic randomness for reproducible demos
- **date-fns** (^2.30.0) - Time manipulation utilities

**Frontend:**
- **react-map-gl** (^7.1.0) - React wrapper for Mapbox GL
- **mapbox-gl** (^2.15.0) - Interactive map rendering
- **@turf/turf** (^6.5.0) - Client-side geospatial operations
- **recharts** (^2.8.0) - Charts and graphs for analytics
- **framer-motion** (^10.16.0) - Smooth animations for UI
- **zustand** (^4.4.0) - Lightweight state management

**Development:**
- **typescript** (^5.2.0) - Type safety
- **vitest** (^0.34.0) - Testing framework
- **@testing-library/react** (^14.0.0) - Component testing

### 6.5 Integration with Existing Code

**Backend Integration:**
```typescript
// backend/src/index.ts - Add simulation routes
import { SimulationEngine } from './simulation';
import { WebSocketManager } from './simulation/websocket-manager';

const wsManager = new WebSocketManager(server);
const simulationEngine = new SimulationEngine(
  robotGenerator,
  movementSim,
  taskSim,
  resourceSim,
  timeController,
  wsManager
);

// REST API endpoints
app.post('/api/simulation/start', async (req, res) => {
  const { scenarioId } = req.body;
  await simulationEngine.initialize(scenarios[scenarioId]);
  simulationEngine.start();
  res.json({ success: true });
});

app.post('/api/simulation/stop', (req, res) => {
  simulationEngine.stop();
  res.json({ success: true });
});

app.get('/api/simulation/robots', (req, res) => {
  const robots = simulationEngine.getAllRobots();
  res.json(robots);
});
```

**Frontend Integration:**
```typescript
// app/page.tsx - Add simulation mode toggle
import { SimulationProvider } from './simulation/SimulationProvider';
import { SimulationMapView } from './simulation/MapView';
import { ControlPanel } from './simulation/ControlPanel';

export default function DashboardPage() {
  const [simulationMode, setSimulationMode] = useState(false);

  return (
    <div>
      <header>
        <button onClick={() => setSimulationMode(!simulationMode)}>
          {simulationMode ? 'Live Mode' : 'Demo Mode'}
        </button>
      </header>

      {simulationMode ? (
        <SimulationProvider>
          <SimulationMapView />
          <ControlPanel />
        </SimulationProvider>
      ) : (
        <LiveDashboard />
      )}
    </div>
  );
}
```

---

## 7. Success Metrics

**Technical Metrics:**
- Update rate: 10 updates/second minimum
- WebSocket latency: < 100ms
- Render performance: 60 FPS
- Support 50+ concurrent robots
- < 2 second scenario switch time

**Demo Effectiveness:**
- Clear visualization of value proposition
- Compelling use case scenarios
- Smooth, professional presentation
- Interactive controls for engagement
- Data-driven decision making visible

**Investor Appeal:**
- Scalability demonstrated (10 → 100+ robots)
- Cost savings quantified
- Efficiency improvements shown
- Multiple market verticals
- Technical sophistication evident

---

## 8. Next Steps

1. **Immediate (This Week)**
   - Review and approve design
   - Set up project structure
   - Install dependencies
   - Create basic simulation engine

2. **Short-term (Next 2 Weeks)**
   - Implement all three scenarios
   - Build UI components
   - WebSocket integration
   - Testing and refinement

3. **Pre-Demo (1 Week Before)**
   - Polish UI/UX
   - Performance optimization
   - Create demo scripts
   - Practice presentations

4. **Post-YC**
   - Transition to real hardware integration
   - Expand scenario library
   - Add ML/AI optimizations
   - Build production monitoring

---

## Conclusion

This simulation system provides a comprehensive, impressive demonstration platform that showcases the full capabilities of the robot fleet management system. By implementing realistic behaviors, multiple scenarios, and interactive controls, it creates a compelling narrative for investors while serving as a foundation for future real-world deployment.

The architecture is designed to be modular, scalable, and maintainable, with clear separation between backend simulation logic and frontend visualization. The demo mode features provide flexibility for different presentation styles and audience engagement levels.

**Key Strengths:**
- ✅ Realistic robot behaviors and physics
- ✅ Multiple industry-relevant scenarios
- ✅ Rich, real-time data visualization
- ✅ Interactive demo controls
- ✅ Clear value proposition demonstration
- ✅ Scalable architecture
- ✅ Professional presentation quality

This simulation system will be a powerful tool for the YC demo and beyond.
