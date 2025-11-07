/**
 * Telemetry Generator Type Definitions
 * Comprehensive types for realistic robot telemetry simulation
 */

import { RobotStatus, MetricType, EventType, EventSeverity } from '@sepulki/shared-types';

/**
 * Scenario types for different robot fleet operations
 */
export enum ScenarioType {
  LAWN_MOWING = 'LAWN_MOWING',
  WAREHOUSE_LOGISTICS = 'WAREHOUSE_LOGISTICS',
  AGRICULTURE = 'AGRICULTURE',
  CUSTOM = 'CUSTOM'
}

/**
 * Robot activity states with realistic transitions
 */
export enum RobotActivity {
  IDLE = 'IDLE',
  TRAVELING = 'TRAVELING',
  WORKING = 'WORKING',
  CHARGING = 'CHARGING',
  RETURNING_TO_BASE = 'RETURNING_TO_BASE',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * GPS coordinate with timestamp
 */
export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: Date;
}

/**
 * Robot path configuration for realistic movement
 */
export interface RobotPath {
  waypoints: GPSCoordinate[];
  speed: number; // meters per second
  loopPath: boolean;
  pauseAtWaypoints?: boolean;
  pauseDuration?: number; // seconds
}

/**
 * Robot telemetry state snapshot
 */
export interface RobotTelemetryState {
  robotId: string;
  fleetId: string;
  status: RobotStatus;
  activity: RobotActivity;
  position: GPSCoordinate;
  heading: number; // degrees, 0-360
  speed: number; // meters per second
  batteryLevel: number; // 0-100%
  batteryVoltage: number; // volts
  batteryCurrent: number; // amps
  healthScore: number; // 0-100%
  taskProgress: number; // 0-100%
  currentTaskId?: string;
  temperature: number; // celsius
  cpuUsage: number; // 0-100%
  memoryUsage: number; // 0-100%
  signalStrength: number; // dBm
  vibration: number; // m/s²
  errorCount: number;
  lastStateChange: Date;
  odometer: number; // total meters traveled
  workHours: number; // total work hours
}

/**
 * Scenario configuration for fleet simulation
 */
export interface ScenarioConfig {
  type: ScenarioType;
  name: string;
  description: string;
  fleetId: string;
  robotCount: number;
  baseLocation: GPSCoordinate;
  areaSize: number; // meters radius
  workPattern: WorkPattern;
  chargingStations: GPSCoordinate[];
  safetyZones?: SafetyZone[];
  customBehaviors?: CustomBehavior[];
}

/**
 * Work pattern defines how robots operate in the scenario
 */
export interface WorkPattern {
  type: 'grid' | 'random' | 'waypoint' | 'zone-based';
  coverage: number; // 0-100% of area
  efficiency: number; // 0-100% task efficiency
  pathOptimization: boolean;
  avoidanceRadius: number; // meters between robots
}

/**
 * Safety zone definition
 */
export interface SafetyZone {
  id: string;
  center: GPSCoordinate;
  radius: number; // meters
  type: 'exclusion' | 'slow' | 'stop';
  speedLimit?: number; // m/s
}

/**
 * Custom behavior for scenario-specific actions
 */
export interface CustomBehavior {
  name: string;
  trigger: BehaviorTrigger;
  action: BehaviorAction;
  probability?: number; // 0-1
  duration?: number; // seconds
}

/**
 * Behavior trigger conditions
 */
export interface BehaviorTrigger {
  type: 'time' | 'battery' | 'position' | 'random' | 'task_completion';
  condition?: {
    batteryThreshold?: number;
    timeOfDay?: string;
    location?: GPSCoordinate;
    radius?: number;
  };
}

/**
 * Behavior action to execute
 */
export interface BehaviorAction {
  type: 'pause' | 'speed_change' | 'status_change' | 'emit_event' | 'route_change';
  parameters?: Record<string, any>;
}

/**
 * Telemetry generator configuration
 */
export interface TelemetryGeneratorConfig {
  enabled: boolean;
  timeAcceleration: number; // 1x to 300x
  updateIntervals: {
    position: number; // ms
    status: number; // ms
    metrics: number; // ms
  };
  failureInjection: FailureInjectionConfig;
  realismLevel: 'low' | 'medium' | 'high';
  noiseLevel: number; // 0-1, adds random variance to readings
}

/**
 * Failure injection for testing robustness
 */
export interface FailureInjectionConfig {
  enabled: boolean;
  failureRate: number; // 0-1 probability per hour
  types: FailureType[];
  meanTimeToRecovery: number; // seconds
}

/**
 * Types of failures that can be injected
 */
export enum FailureType {
  BATTERY_DRAIN = 'BATTERY_DRAIN', // Sudden battery drop
  CONNECTION_LOSS = 'CONNECTION_LOSS', // Lost connection
  SENSOR_ERROR = 'SENSOR_ERROR', // Sensor malfunction
  MOTOR_OVERHEATING = 'MOTOR_OVERHEATING', // Thermal issue
  GPS_DRIFT = 'GPS_DRIFT', // Position accuracy loss
  SOFTWARE_CRASH = 'SOFTWARE_CRASH', // System error
  OBSTACLE_COLLISION = 'OBSTACLE_COLLISION', // Physical collision
  COMMUNICATION_LAG = 'COMMUNICATION_LAG' // High latency
}

/**
 * Metric generation rule
 */
export interface MetricRule {
  type: MetricType;
  baseValue: number;
  variance: number; // +/- percentage
  unit: string;
  dependencies?: {
    metric: MetricType;
    factor: number; // multiplier based on dependent metric
  }[];
}

/**
 * Event generation rule
 */
export interface EventRule {
  type: EventType;
  severity: EventSeverity;
  probability: number; // 0-1 per update cycle
  conditions?: {
    batteryBelow?: number;
    temperatureAbove?: number;
    speedAbove?: number;
    statusEquals?: RobotStatus;
  };
  message: string | ((state: RobotTelemetryState) => string);
}

/**
 * Telemetry update packet
 */
export interface TelemetryUpdate {
  robotId: string;
  fleetId: string;
  timestamp: Date;
  position?: GPSCoordinate;
  status?: RobotStatus;
  metrics?: Array<{
    type: MetricType;
    value: number;
    unit: string;
  }>;
  events?: Array<{
    type: EventType;
    severity: EventSeverity;
    message: string;
    data?: Record<string, any>;
  }>;
}

/**
 * Scenario statistics for monitoring
 */
export interface ScenarioStats {
  scenarioId: string;
  scenarioType: ScenarioType;
  startTime: Date;
  elapsedTime: number; // seconds
  robotCount: number;
  activeRobots: number;
  totalDistance: number; // meters
  totalWorkCompleted: number; // percentage
  averageBatteryLevel: number;
  averageHealthScore: number;
  eventCount: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  failureCount: number;
}
