"use strict";
/**
 * Realistic Telemetry Generator Service
 * Generates believable robot telemetry data for YC demos and development
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryGenerator = void 0;
const events_1 = require("events");
const shared_types_1 = require("@sepulki/shared-types");
const telemetry_types_1 = require("./telemetry-types");
/**
 * Core telemetry generator engine
 * Produces realistic, time-synchronized telemetry data for robot fleets
 */
class TelemetryGenerator extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.robotStates = new Map();
        this.robotPaths = new Map();
        this.updateIntervals = new Map();
        this.startTime = new Date();
        this.running = false;
        // Metric generation rules
        this.metricRules = new Map([
            [shared_types_1.MetricType.BATTERY_SOC, { type: shared_types_1.MetricType.BATTERY_SOC, baseValue: 85, variance: 0, unit: '%' }],
            [shared_types_1.MetricType.BATTERY_VOLTAGE, { type: shared_types_1.MetricType.BATTERY_VOLTAGE, baseValue: 48, variance: 5, unit: 'V' }],
            [shared_types_1.MetricType.BATTERY_CURRENT, { type: shared_types_1.MetricType.BATTERY_CURRENT, baseValue: 10, variance: 30, unit: 'A' }],
            [shared_types_1.MetricType.MOTOR_TEMPERATURE, { type: shared_types_1.MetricType.MOTOR_TEMPERATURE, baseValue: 45, variance: 15, unit: '°C' }],
            [shared_types_1.MetricType.CPU_USAGE, { type: shared_types_1.MetricType.CPU_USAGE, baseValue: 35, variance: 20, unit: '%' }],
            [shared_types_1.MetricType.MEMORY_USAGE, { type: shared_types_1.MetricType.MEMORY_USAGE, baseValue: 50, variance: 15, unit: '%' }],
            [shared_types_1.MetricType.SIGNAL_STRENGTH, { type: shared_types_1.MetricType.SIGNAL_STRENGTH, baseValue: -65, variance: 10, unit: 'dBm' }],
            [shared_types_1.MetricType.VELOCITY, { type: shared_types_1.MetricType.VELOCITY, baseValue: 1.5, variance: 40, unit: 'm/s' }],
            [shared_types_1.MetricType.VIBRATION, { type: shared_types_1.MetricType.VIBRATION, baseValue: 0.5, variance: 50, unit: 'm/s²' }],
            [shared_types_1.MetricType.AMBIENT_TEMPERATURE, { type: shared_types_1.MetricType.AMBIENT_TEMPERATURE, baseValue: 22, variance: 5, unit: '°C' }],
        ]);
        // Event generation rules
        this.eventRules = [
            {
                type: shared_types_1.EventType.TASK_COMPLETED,
                severity: shared_types_1.EventSeverity.INFO,
                probability: 0.001,
                conditions: { statusEquals: shared_types_1.RobotStatus.WORKING },
                message: (state) => `Task ${state.currentTaskId || 'unknown'} completed successfully`,
            },
            {
                type: shared_types_1.EventType.MAINTENANCE_REQUIRED,
                severity: shared_types_1.EventSeverity.WARNING,
                probability: 0.0001,
                conditions: { batteryBelow: 20 },
                message: 'Battery low - maintenance required soon',
            },
            {
                type: shared_types_1.EventType.HARDWARE_ERROR,
                severity: shared_types_1.EventSeverity.ERROR,
                probability: 0.00005,
                conditions: { temperatureAbove: 70 },
                message: (state) => `Motor temperature critical: ${state.temperature.toFixed(1)}°C`,
            },
        ];
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
                types: [telemetry_types_1.FailureType.BATTERY_DRAIN, telemetry_types_1.FailureType.CONNECTION_LOSS],
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
    initializeRobot(robotId, fleetId, startPosition, initialStatus = shared_types_1.RobotStatus.IDLE) {
        const initialState = {
            robotId,
            fleetId,
            status: initialStatus,
            activity: telemetry_types_1.RobotActivity.IDLE,
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
    setRobotPath(robotId, path) {
        this.robotPaths.set(robotId, path);
    }
    /**
     * Generate a circular patrol path around a center point
     */
    generateCircularPath(center, radiusMeters, numWaypoints = 12) {
        const waypoints = [];
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
    generateGridPath(topLeft, widthMeters, heightMeters, rowSpacing = 2) {
        const waypoints = [];
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
    start() {
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
    stop() {
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
    updateRobotPositions() {
        const deltaTime = (this.config.updateIntervals.position / 1000) * this.config.timeAcceleration;
        for (const [robotId, state] of this.robotStates) {
            if (state.status === shared_types_1.RobotStatus.OFFLINE || state.status === shared_types_1.RobotStatus.ERROR) {
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
    updateRobotStatuses() {
        for (const [robotId, state] of this.robotStates) {
            // Battery drain based on activity
            const drainRate = this.getBatteryDrainRate(state.activity, state.speed);
            const deltaTime = (this.config.updateIntervals.status / 1000) * this.config.timeAcceleration;
            state.batteryLevel = Math.max(0, state.batteryLevel - drainRate * (deltaTime / 3600));
            // Auto-transition to charging if battery low
            if (state.batteryLevel < 15 && state.status !== shared_types_1.RobotStatus.CHARGING) {
                this.transitionRobotState(robotId, shared_types_1.RobotStatus.CHARGING, telemetry_types_1.RobotActivity.CHARGING);
                this.emitEvent(robotId, shared_types_1.EventType.ROBOT_STOPPED, shared_types_1.EventSeverity.WARNING, 'Low battery - returning to charge');
            }
            // Recharge battery
            if (state.status === shared_types_1.RobotStatus.CHARGING) {
                state.batteryLevel = Math.min(100, state.batteryLevel + 0.5 * (deltaTime / 3600) * 100);
                state.speed = 0;
                // Resume work when fully charged
                if (state.batteryLevel >= 95) {
                    this.transitionRobotState(robotId, shared_types_1.RobotStatus.WORKING, telemetry_types_1.RobotActivity.WORKING);
                    this.emitEvent(robotId, shared_types_1.EventType.ROBOT_STARTED, shared_types_1.EventSeverity.INFO, 'Charging complete - resuming work');
                }
            }
            // Update task progress for working robots
            if (state.status === shared_types_1.RobotStatus.WORKING) {
                state.taskProgress = Math.min(100, state.taskProgress + 0.1 * deltaTime);
                state.workHours += deltaTime / 3600;
                // Complete task occasionally
                if (state.taskProgress >= 100 && Math.random() < 0.1) {
                    state.taskProgress = 0;
                    this.emitEvent(robotId, shared_types_1.EventType.TASK_COMPLETED, shared_types_1.EventSeverity.INFO, 'Task completed successfully');
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
    updateRobotMetrics() {
        for (const [robotId, state] of this.robotStates) {
            const metrics = [];
            // Generate metrics based on rules
            for (const [metricType, rule] of this.metricRules) {
                let value = rule.baseValue;
                // Apply activity-based modifications
                if (metricType === shared_types_1.MetricType.BATTERY_SOC) {
                    value = state.batteryLevel;
                }
                else if (metricType === shared_types_1.MetricType.VELOCITY) {
                    value = state.speed;
                }
                else if (metricType === shared_types_1.MetricType.CPU_USAGE) {
                    value = state.cpuUsage + (state.activity === telemetry_types_1.RobotActivity.WORKING ? 20 : 0);
                }
                else if (metricType === shared_types_1.MetricType.MOTOR_TEMPERATURE) {
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
            state.temperature = metrics.find(m => m.type === shared_types_1.MetricType.MOTOR_TEMPERATURE)?.value || state.temperature;
            state.cpuUsage = metrics.find(m => m.type === shared_types_1.MetricType.CPU_USAGE)?.value || state.cpuUsage;
            state.memoryUsage = metrics.find(m => m.type === shared_types_1.MetricType.MEMORY_USAGE)?.value || state.memoryUsage;
            // Check event rules and generate events
            const events = [];
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
    moveAlongPath(currentPos, path, distanceMeters) {
        if (path.waypoints.length === 0)
            return currentPos;
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
    calculateDistance(pos1, pos2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
        const dLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;
        const lat1 = (pos1.latitude * Math.PI) / 180;
        const lat2 = (pos2.latitude * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    /**
     * Calculate heading between two GPS coordinates
     */
    calculateHeading(from, to) {
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
    addGPSNoise(pos, noiseLevel) {
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
    getBatteryDrainRate(activity, speed) {
        const baseRates = {
            [telemetry_types_1.RobotActivity.IDLE]: 0.5,
            [telemetry_types_1.RobotActivity.TRAVELING]: 2.0 + speed * 0.5,
            [telemetry_types_1.RobotActivity.WORKING]: 3.0 + speed * 0.5,
            [telemetry_types_1.RobotActivity.CHARGING]: -20.0, // Negative means charging
            [telemetry_types_1.RobotActivity.RETURNING_TO_BASE]: 2.5,
            [telemetry_types_1.RobotActivity.ERROR]: 0.2,
            [telemetry_types_1.RobotActivity.MAINTENANCE]: 0.1,
        };
        return baseRates[activity] || 1.0;
    }
    /**
     * Calculate overall health score
     */
    calculateHealthScore(state) {
        let score = 100;
        // Battery impact
        if (state.batteryLevel < 20)
            score -= (20 - state.batteryLevel);
        // Temperature impact
        if (state.temperature > 60)
            score -= (state.temperature - 60) * 2;
        // Error impact
        score -= state.errorCount * 5;
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Transition robot to new state
     */
    transitionRobotState(robotId, status, activity) {
        const state = this.robotStates.get(robotId);
        if (!state)
            return;
        state.status = status;
        state.activity = activity;
        state.lastStateChange = new Date();
        // Update speed based on activity
        if (activity === telemetry_types_1.RobotActivity.IDLE || activity === telemetry_types_1.RobotActivity.CHARGING) {
            state.speed = 0;
        }
        else if (activity === telemetry_types_1.RobotActivity.WORKING) {
            state.speed = 0.5 + Math.random() * 1.0; // 0.5-1.5 m/s
        }
        else if (activity === telemetry_types_1.RobotActivity.TRAVELING) {
            state.speed = 1.0 + Math.random() * 1.5; // 1.0-2.5 m/s
        }
        console.log(`🤖 Robot ${robotId}: ${status} (${activity})`);
    }
    /**
     * Inject a random failure
     */
    injectFailure(robotId) {
        const state = this.robotStates.get(robotId);
        if (!state)
            return;
        const failureTypes = this.config.failureInjection.types;
        const failureType = failureTypes[Math.floor(Math.random() * failureTypes.length)];
        console.log(`💥 Injecting failure: ${failureType} for robot ${robotId}`);
        switch (failureType) {
            case telemetry_types_1.FailureType.BATTERY_DRAIN:
                state.batteryLevel = Math.max(5, state.batteryLevel - 20);
                this.emitEvent(robotId, shared_types_1.EventType.HARDWARE_ERROR, shared_types_1.EventSeverity.WARNING, 'Sudden battery drain detected');
                break;
            case telemetry_types_1.FailureType.CONNECTION_LOSS:
                this.transitionRobotState(robotId, shared_types_1.RobotStatus.OFFLINE, telemetry_types_1.RobotActivity.ERROR);
                this.emitEvent(robotId, shared_types_1.EventType.CONNECTION_LOST, shared_types_1.EventSeverity.ERROR, 'Connection lost');
                // Auto-recover after MTTR
                setTimeout(() => {
                    this.transitionRobotState(robotId, shared_types_1.RobotStatus.IDLE, telemetry_types_1.RobotActivity.IDLE);
                    this.emitEvent(robotId, shared_types_1.EventType.CONNECTION_RESTORED, shared_types_1.EventSeverity.INFO, 'Connection restored');
                }, this.config.failureInjection.meanTimeToRecovery * 1000);
                break;
            case telemetry_types_1.FailureType.MOTOR_OVERHEATING:
                state.temperature += 20;
                this.transitionRobotState(robotId, shared_types_1.RobotStatus.ERROR, telemetry_types_1.RobotActivity.ERROR);
                this.emitEvent(robotId, shared_types_1.EventType.HARDWARE_ERROR, shared_types_1.EventSeverity.ERROR, 'Motor overheating detected');
                break;
            case telemetry_types_1.FailureType.GPS_DRIFT:
                state.position = this.addGPSNoise(state.position, 5);
                this.emitEvent(robotId, shared_types_1.EventType.SOFTWARE_ERROR, shared_types_1.EventSeverity.WARNING, 'GPS accuracy degraded');
                break;
        }
        state.errorCount++;
    }
    /**
     * Check if event conditions are met
     */
    checkEventConditions(state, rule) {
        if (!rule.conditions)
            return true;
        const { batteryBelow, temperatureAbove, speedAbove, statusEquals } = rule.conditions;
        if (batteryBelow !== undefined && state.batteryLevel >= batteryBelow)
            return false;
        if (temperatureAbove !== undefined && state.temperature <= temperatureAbove)
            return false;
        if (speedAbove !== undefined && state.speed <= speedAbove)
            return false;
        if (statusEquals !== undefined && state.status !== statusEquals)
            return false;
        return true;
    }
    /**
     * Emit telemetry update event
     */
    emitTelemetryUpdate(robotId, update) {
        const state = this.robotStates.get(robotId);
        if (!state)
            return;
        const fullUpdate = {
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
    emitEvent(robotId, type, severity, message, data) {
        const state = this.robotStates.get(robotId);
        if (!state)
            return;
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
    getRobotState(robotId) {
        return this.robotStates.get(robotId);
    }
    /**
     * Get all robot states
     */
    getAllRobotStates() {
        return new Map(this.robotStates);
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
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
    getStats() {
        return {
            running: this.running,
            robotCount: this.robotStates.size,
            uptime: Date.now() - this.startTime.getTime(),
            config: this.config,
        };
    }
}
exports.TelemetryGenerator = TelemetryGenerator;
