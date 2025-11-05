/**
 * Realistic Telemetry Generator Service
 * Generates believable robot telemetry data for YC demos and development
 */

import { EventEmitter } from 'events';
import {
  RobotStatus,
  MetricType,
  EventType,
  EventSeverity,
} from '@sepulki/shared-types';
import {
  ScenarioType,
  RobotActivity,
  RobotTelemetryState,
  GPSCoordinate,
  RobotPath,
  TelemetryGeneratorConfig,
  TelemetryUpdate,
  FailureType,
  MetricRule,
  EventRule,
} from './telemetry-types';

/**
 * Core telemetry generator engine
 * Produces realistic, time-synchronized telemetry data for robot fleets
 */
export class TelemetryGenerator extends EventEmitter {
  private robotStates: Map<string, RobotTelemetryState> = new Map();
  private robotPaths: Map<string, RobotPath> = new Map();
  private config: TelemetryGeneratorConfig;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private startTime: Date = new Date();
  private running: boolean = false;

  // Metric generation rules
  private metricRules: Map<MetricType, MetricRule> = new Map([
    [MetricType.BATTERY_SOC, { type: MetricType.BATTERY_SOC, baseValue: 85, variance: 0, unit: '%' }],
    [MetricType.BATTERY_VOLTAGE, { type: MetricType.BATTERY_VOLTAGE, baseValue: 48, variance: 5, unit: 'V' }],
    [MetricType.BATTERY_CURRENT, { type: MetricType.BATTERY_CURRENT, baseValue: 10, variance: 30, unit: 'A' }],
    [MetricType.MOTOR_TEMPERATURE, { type: MetricType.MOTOR_TEMPERATURE, baseValue: 45, variance: 15, unit: '°C' }],
    [MetricType.CPU_USAGE, { type: MetricType.CPU_USAGE, baseValue: 35, variance: 20, unit: '%' }],
    [MetricType.MEMORY_USAGE, { type: MetricType.MEMORY_USAGE, baseValue: 50, variance: 15, unit: '%' }],
    [MetricType.SIGNAL_STRENGTH, { type: MetricType.SIGNAL_STRENGTH, baseValue: -65, variance: 10, unit: 'dBm' }],
    [MetricType.VELOCITY, { type: MetricType.VELOCITY, baseValue: 1.5, variance: 40, unit: 'm/s' }],
    [MetricType.VIBRATION, { type: MetricType.VIBRATION, baseValue: 0.5, variance: 50, unit: 'm/s²' }],
    [MetricType.AMBIENT_TEMPERATURE, { type: MetricType.AMBIENT_TEMPERATURE, baseValue: 22, variance: 5, unit: '°C' }],
  ]);

  // Event generation rules
  private eventRules: EventRule[] = [
    {
      type: EventType.TASK_COMPLETED,
      severity: EventSeverity.INFO,
      probability: 0.001,
      conditions: { statusEquals: RobotStatus.WORKING },
      message: (state) => `Task ${state.currentTaskId || 'unknown'} completed successfully`,
    },
    {
      type: EventType.MAINTENANCE_REQUIRED,
      severity: EventSeverity.WARNING,
      probability: 0.0001,
      conditions: { batteryBelow: 20 },
      message: 'Battery low - maintenance required soon',
    },
    {
      type: EventType.HARDWARE_ERROR,
      severity: EventSeverity.ERROR,
      probability: 0.00005,
      conditions: { temperatureAbove: 70 },
      message: (state) => `Motor temperature critical: ${state.temperature.toFixed(1)}°C`,
    },
  ];

  constructor(config: Partial<TelemetryGeneratorConfig> = {}) {
    super();
    this.config = {
      enabled: true,
      timeAcceleration: 1,
      updateIntervals: {
        position: 100,
        status: 1000,
        metrics: 5000,
      },
      failureInjection: {
        enabled: false,
        failureRate: 0.01,
        types: [FailureType.BATTERY_DRAIN, FailureType.CONNECTION_LOSS],
        meanTimeToRecovery: 30,
      },
      realismLevel: 'high',
      noiseLevel: 0.1,
      ...config,
    };
  }

  /**
   * Initialize a robot with starting state and path
   */
  public initializeRobot(
    robotId: string,
    fleetId: string,
    startPosition: GPSCoordinate,
    initialStatus: RobotStatus = RobotStatus.IDLE
  ): void {
    const initialState: RobotTelemetryState = {
      robotId,
      fleetId,
      status: initialStatus,
      activity: RobotActivity.IDLE,
      position: startPosition,
      heading: Math.random() * 360,
      speed: 0,
      batteryLevel: 85 + Math.random() * 15, // 85-100%
      batteryVoltage: 48 + (Math.random() - 0.5) * 4,
      batteryCurrent: 0,
      healthScore: 95 + Math.random() * 5,
      taskProgress: 0,
      temperature: 25 + Math.random() * 5,
      cpuUsage: 20 + Math.random() * 10,
      memoryUsage: 40 + Math.random() * 10,
      signalStrength: -60 - Math.random() * 20,
      vibration: 0.1 + Math.random() * 0.2,
      errorCount: 0,
      lastStateChange: new Date(),
      odometer: 0,
      workHours: 0,
    };

    this.robotStates.set(robotId, initialState);
    console.log(`📡 Initialized telemetry for robot ${robotId} in fleet ${fleetId}`);
  }

  /**
   * Set a path for robot to follow
   */
  public setRobotPath(robotId: string, path: RobotPath): void {
    this.robotPaths.set(robotId, path);
  }

  /**
   * Generate a circular patrol path around a center point
   */
  public generateCircularPath(
    center: GPSCoordinate,
    radiusMeters: number,
    numWaypoints: number = 12
  ): GPSCoordinate[] {
    const waypoints: GPSCoordinate[] = [];
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 111000 * Math.cos((center.latitude * Math.PI) / 180);

    for (let i = 0; i < numWaypoints; i++) {
      const angle = (i / numWaypoints) * 2 * Math.PI;
      const offsetLat = (Math.sin(angle) * radiusMeters) / metersPerDegreeLat;
      const offsetLng = (Math.cos(angle) * radiusMeters) / metersPerDegreeLng;

      waypoints.push({
        latitude: center.latitude + offsetLat,
        longitude: center.longitude + offsetLng,
        altitude: center.altitude,
        timestamp: new Date(),
      });
    }

    return waypoints;
  }

  /**
   * Generate a grid pattern path (e.g., lawn mowing)
   */
  public generateGridPath(
    topLeft: GPSCoordinate,
    widthMeters: number,
    heightMeters: number,
    rowSpacing: number = 2
  ): GPSCoordinate[] {
    const waypoints: GPSCoordinate[] = [];
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 111000 * Math.cos((topLeft.latitude * Math.PI) / 180);

    let direction = 1; // 1 for right, -1 for left
    const numRows = Math.floor(heightMeters / rowSpacing);

    for (let row = 0; row <= numRows; row++) {
      const offsetLat = -(row * rowSpacing) / metersPerDegreeLat;
      const startLng = direction === 1 ? 0 : widthMeters;
      const endLng = direction === 1 ? widthMeters : 0;

      // Start of row
      waypoints.push({
        latitude: topLeft.latitude + offsetLat,
        longitude: topLeft.longitude + startLng / metersPerDegreeLng,
        altitude: topLeft.altitude,
        timestamp: new Date(),
      });

      // End of row
      waypoints.push({
        latitude: topLeft.latitude + offsetLat,
        longitude: topLeft.longitude + endLng / metersPerDegreeLng,
        altitude: topLeft.altitude,
        timestamp: new Date(),
      });

      direction *= -1; // Alternate direction for next row
    }

    return waypoints;
  }

  /**
   * Start generating telemetry updates
   */
  public start(): void {
    if (this.running) {
      console.warn('⚠️  Telemetry generator already running');
      return;
    }

    this.running = true;
    this.startTime = new Date();

    // Position updates (high frequency)
    const positionInterval = setInterval(() => {
      this.updateRobotPositions();
    }, this.config.updateIntervals.position / this.config.timeAcceleration);

    // Status updates (medium frequency)
    const statusInterval = setInterval(() => {
      this.updateRobotStatuses();
    }, this.config.updateIntervals.status / this.config.timeAcceleration);

    // Metrics updates (lower frequency)
    const metricsInterval = setInterval(() => {
      this.updateRobotMetrics();
    }, this.config.updateIntervals.metrics / this.config.timeAcceleration);

    this.updateIntervals.set('position', positionInterval);
    this.updateIntervals.set('status', statusInterval);
    this.updateIntervals.set('metrics', metricsInterval);

    console.log(`🚀 Telemetry generator started (${this.config.timeAcceleration}x acceleration)`);
    this.emit('started');
  }

  /**
   * Stop generating telemetry updates
   */
  public stop(): void {
    this.running = false;

    for (const [name, interval] of this.updateIntervals) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    console.log('⏹️  Telemetry generator stopped');
    this.emit('stopped');
  }

  /**
   * Update robot positions along their paths
   */
  private updateRobotPositions(): void {
    const deltaTime = (this.config.updateIntervals.position / 1000) * this.config.timeAcceleration;

    for (const [robotId, state] of this.robotStates) {
      if (state.status === RobotStatus.OFFLINE || state.status === RobotStatus.ERROR) {
        continue;
      }

      const path = this.robotPaths.get(robotId);
      if (!path || path.waypoints.length === 0) {
        continue;
      }

      // Calculate next position based on current speed
      const distanceToMove = state.speed * deltaTime;
      const newPosition = this.moveAlongPath(state.position, path, distanceToMove);

      // Update heading based on movement direction
      if (distanceToMove > 0) {
        state.heading = this.calculateHeading(state.position, newPosition);
      }

      state.position = newPosition;
      state.odometer += distanceToMove;

      // Add GPS noise for realism
      if (this.config.noiseLevel > 0) {
        state.position = this.addGPSNoise(state.position, this.config.noiseLevel);
      }

      // Emit position update
      this.emitTelemetryUpdate(robotId, {
        position: state.position,
      });
    }
  }

  /**
   * Update robot statuses and activities
   */
  private updateRobotStatuses(): void {
    for (const [robotId, state] of this.robotStates) {
      // Battery drain based on activity
      const drainRate = this.getBatteryDrainRate(state.activity, state.speed);
      const deltaTime = (this.config.updateIntervals.status / 1000) * this.config.timeAcceleration;
      state.batteryLevel = Math.max(0, state.batteryLevel - drainRate * (deltaTime / 3600));

      // Auto-transition to charging if battery low
      if (state.batteryLevel < 15 && state.status !== RobotStatus.CHARGING) {
        this.transitionRobotState(robotId, RobotStatus.CHARGING, RobotActivity.CHARGING);
        this.emitEvent(robotId, EventType.ROBOT_STOPPED, EventSeverity.WARNING, 'Low battery - returning to charge');
      }

      // Recharge battery
      if (state.status === RobotStatus.CHARGING) {
        state.batteryLevel = Math.min(100, state.batteryLevel + 0.5 * (deltaTime / 3600) * 100);
        state.speed = 0;

        // Resume work when fully charged
        if (state.batteryLevel >= 95) {
          this.transitionRobotState(robotId, RobotStatus.WORKING, RobotActivity.WORKING);
          this.emitEvent(robotId, EventType.ROBOT_STARTED, EventSeverity.INFO, 'Charging complete - resuming work');
        }
      }

      // Update task progress for working robots
      if (state.status === RobotStatus.WORKING) {
        state.taskProgress = Math.min(100, state.taskProgress + 0.1 * deltaTime);
        state.workHours += deltaTime / 3600;

        // Complete task occasionally
        if (state.taskProgress >= 100 && Math.random() < 0.1) {
          state.taskProgress = 0;
          this.emitEvent(robotId, EventType.TASK_COMPLETED, EventSeverity.INFO, 'Task completed successfully');
        }
      }

      // Failure injection
      if (this.config.failureInjection.enabled && Math.random() < this.config.failureInjection.failureRate * deltaTime / 3600) {
        this.injectFailure(robotId);
      }

      // Health score calculation
      state.healthScore = this.calculateHealthScore(state);

      // Emit status update
      this.emitTelemetryUpdate(robotId, {
        status: state.status,
      });
    }
  }

  /**
   * Update robot metrics (sensors, performance, etc.)
   */
  private updateRobotMetrics(): void {
    for (const [robotId, state] of this.robotStates) {
      const metrics: TelemetryUpdate['metrics'] = [];

      // Generate metrics based on rules
      for (const [metricType, rule] of this.metricRules) {
        let value = rule.baseValue;

        // Apply activity-based modifications
        if (metricType === MetricType.BATTERY_SOC) {
          value = state.batteryLevel;
        } else if (metricType === MetricType.VELOCITY) {
          value = state.speed;
        } else if (metricType === MetricType.CPU_USAGE) {
          value = state.cpuUsage + (state.activity === RobotActivity.WORKING ? 20 : 0);
        } else if (metricType === MetricType.MOTOR_TEMPERATURE) {
          value = state.temperature + (state.speed > 0 ? 10 : 0);
        }

        // Add variance
        const variance = (Math.random() - 0.5) * 2 * (rule.variance / 100) * value;
        value += variance;

        // Add noise
        if (this.config.noiseLevel > 0) {
          value += (Math.random() - 0.5) * this.config.noiseLevel * value;
        }

        metrics.push({
          type: metricType,
          value: Math.max(0, value),
          unit: rule.unit,
        });
      }

      // Update internal state from generated metrics
      state.temperature = metrics.find(m => m.type === MetricType.MOTOR_TEMPERATURE)?.value || state.temperature;
      state.cpuUsage = metrics.find(m => m.type === MetricType.CPU_USAGE)?.value || state.cpuUsage;
      state.memoryUsage = metrics.find(m => m.type === MetricType.MEMORY_USAGE)?.value || state.memoryUsage;

      // Check event rules and generate events
      const events: TelemetryUpdate['events'] = [];
      for (const rule of this.eventRules) {
        if (Math.random() < rule.probability && this.checkEventConditions(state, rule)) {
          const message = typeof rule.message === 'function' ? rule.message(state) : rule.message;
          events.push({
            type: rule.type,
            severity: rule.severity,
            message,
            data: { robotId, timestamp: new Date().toISOString() },
          });
        }
      }

      // Emit metrics update
      this.emitTelemetryUpdate(robotId, { metrics, events });
    }
  }

  /**
   * Move robot along path by specified distance
   */
  private moveAlongPath(
    currentPos: GPSCoordinate,
    path: RobotPath,
    distanceMeters: number
  ): GPSCoordinate {
    if (path.waypoints.length === 0) return currentPos;

    // Find nearest waypoint
    let nearestIndex = 0;
    let minDistance = this.calculateDistance(currentPos, path.waypoints[0]);

    for (let i = 1; i < path.waypoints.length; i++) {
      const distance = this.calculateDistance(currentPos, path.waypoints[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    // Get next waypoint
    const nextIndex = (nearestIndex + 1) % path.waypoints.length;
    const targetWaypoint = path.waypoints[nextIndex];

    // Calculate direction and move toward target
    const distanceToTarget = this.calculateDistance(currentPos, targetWaypoint);

    if (distanceMeters >= distanceToTarget) {
      // Reached waypoint, move to next
      return targetWaypoint;
    }

    // Interpolate position
    const fraction = distanceMeters / distanceToTarget;
    return {
      latitude: currentPos.latitude + (targetWaypoint.latitude - currentPos.latitude) * fraction,
      longitude: currentPos.longitude + (targetWaypoint.longitude - currentPos.longitude) * fraction,
      altitude: currentPos.altitude,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate distance between two GPS coordinates (Haversine formula)
   */
  private calculateDistance(pos1: GPSCoordinate, pos2: GPSCoordinate): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
    const dLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;
    const lat1 = (pos1.latitude * Math.PI) / 180;
    const lat2 = (pos2.latitude * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate heading between two GPS coordinates
   */
  private calculateHeading(from: GPSCoordinate, to: GPSCoordinate): number {
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const heading = (Math.atan2(y, x) * 180) / Math.PI;

    return (heading + 360) % 360; // Normalize to 0-360
  }

  /**
   * Add GPS noise for realism
   */
  private addGPSNoise(pos: GPSCoordinate, noiseLevel: number): GPSCoordinate {
    const noiseMeters = noiseLevel * 5; // 5 meters max noise at level 1
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 111000 * Math.cos((pos.latitude * Math.PI) / 180);

    return {
      latitude: pos.latitude + ((Math.random() - 0.5) * 2 * noiseMeters) / metersPerDegreeLat,
      longitude: pos.longitude + ((Math.random() - 0.5) * 2 * noiseMeters) / metersPerDegreeLng,
      altitude: pos.altitude,
      timestamp: new Date(),
    };
  }

  /**
   * Get battery drain rate based on activity
   */
  private getBatteryDrainRate(activity: RobotActivity, speed: number): number {
    const baseRates = {
      [RobotActivity.IDLE]: 0.5,
      [RobotActivity.TRAVELING]: 2.0 + speed * 0.5,
      [RobotActivity.WORKING]: 3.0 + speed * 0.5,
      [RobotActivity.CHARGING]: -20.0, // Negative means charging
      [RobotActivity.RETURNING_TO_BASE]: 2.5,
      [RobotActivity.ERROR]: 0.2,
      [RobotActivity.MAINTENANCE]: 0.1,
    };

    return baseRates[activity] || 1.0;
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(state: RobotTelemetryState): number {
    let score = 100;

    // Battery impact
    if (state.batteryLevel < 20) score -= (20 - state.batteryLevel);

    // Temperature impact
    if (state.temperature > 60) score -= (state.temperature - 60) * 2;

    // Error impact
    score -= state.errorCount * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Transition robot to new state
   */
  private transitionRobotState(
    robotId: string,
    status: RobotStatus,
    activity: RobotActivity
  ): void {
    const state = this.robotStates.get(robotId);
    if (!state) return;

    state.status = status;
    state.activity = activity;
    state.lastStateChange = new Date();

    // Update speed based on activity
    if (activity === RobotActivity.IDLE || activity === RobotActivity.CHARGING) {
      state.speed = 0;
    } else if (activity === RobotActivity.WORKING) {
      state.speed = 0.5 + Math.random() * 1.0; // 0.5-1.5 m/s
    } else if (activity === RobotActivity.TRAVELING) {
      state.speed = 1.0 + Math.random() * 1.5; // 1.0-2.5 m/s
    }

    console.log(`🤖 Robot ${robotId}: ${status} (${activity})`);
  }

  /**
   * Inject a random failure
   */
  private injectFailure(robotId: string): void {
    const state = this.robotStates.get(robotId);
    if (!state) return;

    const failureTypes = this.config.failureInjection.types;
    const failureType = failureTypes[Math.floor(Math.random() * failureTypes.length)];

    console.log(`💥 Injecting failure: ${failureType} for robot ${robotId}`);

    switch (failureType) {
      case FailureType.BATTERY_DRAIN:
        state.batteryLevel = Math.max(5, state.batteryLevel - 20);
        this.emitEvent(robotId, EventType.HARDWARE_ERROR, EventSeverity.WARNING, 'Sudden battery drain detected');
        break;

      case FailureType.CONNECTION_LOSS:
        this.transitionRobotState(robotId, RobotStatus.OFFLINE, RobotActivity.ERROR);
        this.emitEvent(robotId, EventType.CONNECTION_LOST, EventSeverity.ERROR, 'Connection lost');
        // Auto-recover after MTTR
        setTimeout(() => {
          this.transitionRobotState(robotId, RobotStatus.IDLE, RobotActivity.IDLE);
          this.emitEvent(robotId, EventType.CONNECTION_RESTORED, EventSeverity.INFO, 'Connection restored');
        }, this.config.failureInjection.meanTimeToRecovery * 1000);
        break;

      case FailureType.MOTOR_OVERHEATING:
        state.temperature += 20;
        this.transitionRobotState(robotId, RobotStatus.ERROR, RobotActivity.ERROR);
        this.emitEvent(robotId, EventType.HARDWARE_ERROR, EventSeverity.ERROR, 'Motor overheating detected');
        break;

      case FailureType.GPS_DRIFT:
        state.position = this.addGPSNoise(state.position, 5);
        this.emitEvent(robotId, EventType.SOFTWARE_ERROR, EventSeverity.WARNING, 'GPS accuracy degraded');
        break;
    }

    state.errorCount++;
  }

  /**
   * Check if event conditions are met
   */
  private checkEventConditions(state: RobotTelemetryState, rule: EventRule): boolean {
    if (!rule.conditions) return true;

    const { batteryBelow, temperatureAbove, speedAbove, statusEquals } = rule.conditions;

    if (batteryBelow !== undefined && state.batteryLevel >= batteryBelow) return false;
    if (temperatureAbove !== undefined && state.temperature <= temperatureAbove) return false;
    if (speedAbove !== undefined && state.speed <= speedAbove) return false;
    if (statusEquals !== undefined && state.status !== statusEquals) return false;

    return true;
  }

  /**
   * Emit telemetry update event
   */
  private emitTelemetryUpdate(robotId: string, update: Partial<TelemetryUpdate>): void {
    const state = this.robotStates.get(robotId);
    if (!state) return;

    const fullUpdate: TelemetryUpdate = {
      robotId,
      fleetId: state.fleetId,
      timestamp: new Date(),
      ...update,
    };

    this.emit('telemetry', fullUpdate);
  }

  /**
   * Emit telemetry event
   */
  private emitEvent(
    robotId: string,
    type: EventType,
    severity: EventSeverity,
    message: string,
    data?: Record<string, any>
  ): void {
    const state = this.robotStates.get(robotId);
    if (!state) return;

    const event = {
      type,
      severity,
      message,
      data: { robotId, ...data },
    };

    this.emit('event', {
      robotId,
      fleetId: state.fleetId,
      timestamp: new Date(),
      events: [event],
    });

    console.log(`📢 Event [${severity}] ${robotId}: ${message}`);
  }

  /**
   * Get current state of a robot
   */
  public getRobotState(robotId: string): RobotTelemetryState | undefined {
    return this.robotStates.get(robotId);
  }

  /**
   * Get all robot states
   */
  public getAllRobotStates(): Map<string, RobotTelemetryState> {
    return new Map(this.robotStates);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<TelemetryGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
    console.log(`⚙️  Updated telemetry generator config`, config);

    // Restart if running to apply new intervals
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get generator statistics
   */
  public getStats(): {
    running: boolean;
    robotCount: number;
    uptime: number;
    config: TelemetryGeneratorConfig;
  } {
    return {
      running: this.running,
      robotCount: this.robotStates.size,
      uptime: Date.now() - this.startTime.getTime(),
      config: this.config,
    };
  }
}
