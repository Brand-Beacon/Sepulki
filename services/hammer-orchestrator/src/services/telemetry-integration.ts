/**
 * Telemetry Integration Service
 * Connects telemetry generator with GraphQL subscriptions and database
 */

import { Pool } from 'pg';
import { TelemetryGenerator } from './telemetry-generator';
import { ScenarioManager } from './scenario-manager';
import {
  publishRobotStatusUpdate,
  publishBellowsStreamUpdate,
  publishTaskUpdate,
} from '../resolvers/subscriptions';
import { RobotStatus, MetricType, EventSeverity } from '@sepulki/shared-types';
import { TelemetryUpdate, ScenarioType, RobotTelemetryState } from './telemetry-types';

/**
 * Integration service that bridges telemetry generation with the GraphQL layer
 */
export class TelemetryIntegrationService {
  private generator: TelemetryGenerator;
  private scenarioManager: ScenarioManager;
  private db: Pool;
  private initialized: boolean = false;

  constructor(db: Pool) {
    this.db = db;
    this.generator = new TelemetryGenerator({
      enabled: true,
      timeAcceleration: 1,
      updateIntervals: {
        position: 100,   // 100ms for smooth position updates
        status: 1000,    // 1 second for status
        metrics: 5000,   // 5 seconds for detailed metrics
      },
      failureInjection: {
        enabled: false, // Disable by default, enable for testing
        failureRate: 0.01,
        types: [],
        meanTimeToRecovery: 30,
      },
      realismLevel: 'high',
      noiseLevel: 0.1,
    });

    this.scenarioManager = new ScenarioManager(this.generator);
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for telemetry updates
   */
  private setupEventListeners(): void {
    // Listen for telemetry updates
    this.generator.on('telemetry', async (update: TelemetryUpdate) => {
      await this.handleTelemetryUpdate(update);
    });

    // Listen for telemetry events
    this.generator.on('event', async (update: TelemetryUpdate) => {
      await this.handleTelemetryEvent(update);
    });

    // Listen for generator lifecycle events
    this.generator.on('started', () => {
      console.log('✅ Telemetry generator started');
    });

    this.generator.on('stopped', () => {
      console.log('⏹️  Telemetry generator stopped');
    });
  }

  /**
   * Handle telemetry update and publish to subscriptions
   */
  private async handleTelemetryUpdate(update: TelemetryUpdate): Promise<void> {
    try {
      const { robotId, fleetId, position, status, metrics } = update;

      // Update database if position changed
      if (position) {
        await this.updateRobotPosition(robotId, position);
      }

      // Update database if status changed
      if (status) {
        await this.updateRobotStatus(robotId, status);
      }

      // Get current robot state
      const robotState = this.generator.getRobotState(robotId);
      if (!robotState) return;

      // Publish robot status update to GraphQL subscription
      await publishRobotStatusUpdate({
        id: robotId,
        status: robotState.status,
        batteryLevel: robotState.batteryLevel,
        healthScore: robotState.healthScore,
        pose: position ? {
          position: {
            latitude: position.latitude,
            longitude: position.longitude,
            altitude: position.altitude || 0,
          },
          orientation: { w: 1, x: 0, y: 0, z: 0 },
          timestamp: position.timestamp,
        } : undefined,
        lastSeen: new Date(),
      });

      // Publish bellows stream update if metrics included
      if (metrics && metrics.length > 0) {
        await publishBellowsStreamUpdate(fleetId, {
          metrics: metrics.map(m => ({
            robotId,
            timestamp: update.timestamp,
            metric: m.type,
            value: m.value,
            unit: m.unit,
            tags: {
              fleet: fleetId,
              robot: robotId,
            },
          })),
          events: [],
          realTime: true,
        });
      }
    } catch (error) {
      console.error('Error handling telemetry update:', error);
    }
  }

  /**
   * Handle telemetry event and publish to subscriptions
   */
  private async handleTelemetryEvent(update: TelemetryUpdate): Promise<void> {
    try {
      const { robotId, fleetId, events } = update;

      if (!events || events.length === 0) return;

      // Publish bellows stream update with events
      await publishBellowsStreamUpdate(fleetId, {
        metrics: [],
        events: events.map((event, index) => ({
          id: `${robotId}-${Date.now()}-${index}`,
          robotId,
          fleetId,
          timestamp: update.timestamp,
          type: event.type,
          severity: event.severity,
          message: event.message,
          data: event.data,
          acknowledged: false,
        })),
        realTime: true,
      });

      // Log critical events
      if (events.some(e => e.severity === EventSeverity.CRITICAL || e.severity === EventSeverity.ERROR)) {
        console.error(`🚨 Critical event for robot ${robotId}:`, events);
      }
    } catch (error) {
      console.error('Error handling telemetry event:', error);
    }
  }

  /**
   * Update robot position in database
   */
  private async updateRobotPosition(robotId: string, position: any): Promise<void> {
    try {
      // Get robot to find its fleet
      const robotResult = await this.db.query(
        'SELECT fleet_id FROM robots WHERE id = $1',
        [robotId]
      );

      if (robotResult.rows.length === 0) {
        console.warn(`Robot ${robotId} not found in database`);
        return;
      }

      const fleetId = robotResult.rows[0].fleet_id;

      // Get fleet locus coordinates
      const fleetResult = await this.db.query(
        `SELECT l.coordinates
         FROM fleets f
         JOIN loci l ON f.locus_id = l.id
         WHERE f.id = $1`,
        [fleetId]
      );

      if (fleetResult.rows.length === 0 || !fleetResult.rows[0].coordinates) {
        return; // Can't convert without locus coordinates
      }

      const locusCoords = fleetResult.rows[0].coordinates;
      const locusLat = locusCoords.latitude;
      const locusLng = locusCoords.longitude;

      // Convert GPS to local coordinates
      const localCoords = this.gpsToLocalCoordinates(
        position.latitude,
        position.longitude,
        locusLat,
        locusLng
      );

      // Update last_pose in database
      const lastPose = {
        position: {
          x: localCoords.x,
          y: localCoords.y,
          z: localCoords.z,
        },
        orientation: { w: 1, x: 0, y: 0, z: 0 },
        timestamp: position.timestamp.toISOString(),
      };

      await this.db.query(
        'UPDATE robots SET last_pose = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(lastPose), robotId]
      );
    } catch (error) {
      console.error(`Error updating robot position for ${robotId}:`, error);
    }
  }

  /**
   * Update robot status in database
   */
  private async updateRobotStatus(robotId: string, status: RobotStatus): Promise<void> {
    try {
      await this.db.query(
        'UPDATE robots SET status = $1, updated_at = NOW(), last_seen = NOW() WHERE id = $2',
        [status, robotId]
      );
    } catch (error) {
      console.error(`Error updating robot status for ${robotId}:`, error);
    }
  }

  /**
   * Convert GPS coordinates to local coordinates (meters)
   */
  private gpsToLocalCoordinates(
    gpsLat: number,
    gpsLng: number,
    locusLat: number,
    locusLng: number
  ): { x: number; y: number; z: number } {
    const latToMeters = 111000;
    const lngToMeters = 111000 * Math.cos((locusLat * Math.PI) / 180);

    const offsetLat = gpsLat - locusLat;
    const offsetLng = gpsLng - locusLng;

    return {
      x: offsetLng * lngToMeters,
      y: offsetLat * latToMeters,
      z: 0,
    };
  }

  /**
   * Initialize telemetry for a fleet from database
   */
  public async initializeFleetTelemetry(fleetId: string): Promise<void> {
    try {
      // Get fleet and robots from database
      const fleetResult = await this.db.query(
        `SELECT f.*, l.coordinates as locus_coordinates
         FROM fleets f
         LEFT JOIN loci l ON f.locus_id = l.id
         WHERE f.id = $1`,
        [fleetId]
      );

      if (fleetResult.rows.length === 0) {
        console.warn(`Fleet ${fleetId} not found`);
        return;
      }

      const fleet = fleetResult.rows[0];
      const locusCoordinates = fleet.locus_coordinates;

      if (!locusCoordinates) {
        console.warn(`Fleet ${fleetId} has no locus coordinates - using default`);
        return;
      }

      // Get robots in fleet
      const robotsResult = await this.db.query(
        'SELECT * FROM robots WHERE fleet_id = $1 AND status != $2',
        [fleetId, RobotStatus.OFFLINE]
      );

      const robots = robotsResult.rows;
      console.log(`🤖 Initializing telemetry for ${robots.length} robots in fleet ${fleetId}`);

      // Determine scenario based on fleet size and name
      const robotIds = robots.map(r => r.id);
      const scenarioType = this.determineScenarioType(fleet.name, robots.length);

      // Initialize scenario
      const scenario = this.scenarioManager.quickStartDemo(scenarioType, fleetId, robotIds);

      console.log(`✅ Initialized ${scenario.name} scenario for fleet ${fleetId}`);
    } catch (error) {
      console.error(`Error initializing fleet telemetry for ${fleetId}:`, error);
    }
  }

  /**
   * Determine scenario type based on fleet characteristics
   */
  private determineScenarioType(fleetName: string, robotCount: number): ScenarioType {
    const nameLower = fleetName.toLowerCase();

    if (nameLower.includes('lawn') || nameLower.includes('mow') || nameLower.includes('garden')) {
      return ScenarioType.LAWN_MOWING;
    } else if (nameLower.includes('warehouse') || nameLower.includes('logistics') || nameLower.includes('inventory')) {
      return ScenarioType.WAREHOUSE_LOGISTICS;
    } else if (nameLower.includes('farm') || nameLower.includes('agri') || nameLower.includes('crop')) {
      return ScenarioType.AGRICULTURE;
    }

    // Fall back to robot count-based recommendation
    return this.scenarioManager.getRecommendedScenario(robotCount);
  }

  /**
   * Start telemetry generation for all active fleets
   */
  public async startTelemetryGeneration(): Promise<void> {
    if (this.initialized) {
      console.warn('⚠️  Telemetry already initialized');
      return;
    }

    try {
      // Get all active fleets
      const fleetsResult = await this.db.query(
        `SELECT id FROM fleets WHERE status IN ('ACTIVE', 'IDLE')`
      );

      console.log(`🚀 Starting telemetry for ${fleetsResult.rows.length} active fleets`);

      // Initialize telemetry for each fleet
      for (const fleet of fleetsResult.rows) {
        await this.initializeFleetTelemetry(fleet.id);
      }

      // Start the generator
      this.generator.start();
      this.initialized = true;

      console.log('✅ Telemetry generation started successfully');
    } catch (error) {
      console.error('Error starting telemetry generation:', error);
      throw error;
    }
  }

  /**
   * Stop telemetry generation
   */
  public stopTelemetryGeneration(): void {
    this.generator.stop();
    this.initialized = false;
  }

  /**
   * Get generator statistics
   */
  public getStats(): any {
    return {
      generator: this.generator.getStats(),
      scenarios: this.scenarioManager.listScenarios(),
      initialized: this.initialized,
    };
  }

  /**
   * Update generator configuration
   */
  public updateConfig(config: any): void {
    this.generator.updateConfig(config);
  }

  /**
   * Manually trigger a scenario for a fleet
   */
  public async createScenario(
    fleetId: string,
    scenarioType: ScenarioType,
    options?: any
  ): Promise<void> {
    // Get robots in fleet
    const robotsResult = await this.db.query(
      'SELECT id FROM robots WHERE fleet_id = $1',
      [fleetId]
    );

    const robotIds = robotsResult.rows.map(r => r.id);

    if (robotIds.length === 0) {
      throw new Error(`No robots found in fleet ${fleetId}`);
    }

    // Initialize scenario
    this.scenarioManager.quickStartDemo(scenarioType, fleetId, robotIds);
    console.log(`✅ Created ${scenarioType} scenario for fleet ${fleetId}`);
  }

  /**
   * Get scenario manager instance
   */
  public getScenarioManager(): ScenarioManager {
    return this.scenarioManager;
  }

  /**
   * Get generator instance
   */
  public getGenerator(): TelemetryGenerator {
    return this.generator;
  }
}
