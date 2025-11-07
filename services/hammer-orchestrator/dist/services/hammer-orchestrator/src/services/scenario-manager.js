"use strict";
/**
 * Scenario Manager
 * Pre-configured realistic robot fleet scenarios for demos and testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioManager = void 0;
const shared_types_1 = require("@sepulki/shared-types");
const telemetry_types_1 = require("./telemetry-types");
/**
 * Manages pre-defined scenarios for different robot fleet use cases
 */
class ScenarioManager {
    constructor(generator) {
        this.activeScenarios = new Map();
        // Pre-defined base locations for demos
        this.BASE_LOCATIONS = {
            // Silicon Valley (near YC)
            SILICON_VALLEY: { latitude: 37.4419, longitude: -122.1430, altitude: 10 },
            // Agricultural area (Central California)
            FARM_LAND: { latitude: 36.7783, longitude: -119.4179, altitude: 100 },
            // Industrial/warehouse area (East Bay)
            WAREHOUSE_DISTRICT: { latitude: 37.8044, longitude: -122.2712, altitude: 5 },
            // Custom demo location
            CUSTOM: { latitude: 37.7749, longitude: -122.4194, altitude: 20 },
        };
        this.generator = generator;
    }
    /**
     * Initialize a lawn mowing scenario
     * 12 autonomous lawn mowers covering a large property
     */
    initializeLawnMowingScenario(fleetId, robotIds) {
        const baseLocation = this.BASE_LOCATIONS.SILICON_VALLEY;
        const numRobots = robotIds.length || 12;
        const propertySize = 200; // meters
        console.log(`🌱 Initializing lawn mowing scenario with ${numRobots} robots`);
        // Initialize each robot with a unique zone
        const zonesPerRow = Math.ceil(Math.sqrt(numRobots));
        const zoneWidth = propertySize / zonesPerRow;
        const zoneHeight = propertySize / zonesPerRow;
        robotIds.forEach((robotId, index) => {
            const row = Math.floor(index / zonesPerRow);
            const col = index % zonesPerRow;
            // Calculate zone bounds
            const zoneTopLeft = {
                latitude: baseLocation.latitude + this.metersToLatitude(row * zoneHeight),
                longitude: baseLocation.longitude + this.metersToLongitude(col * zoneWidth, baseLocation.latitude),
                altitude: baseLocation.altitude,
                timestamp: new Date(),
            };
            // Generate lawn mowing pattern (back-and-forth grid)
            const path = this.generator.generateGridPath(zoneTopLeft, zoneWidth, zoneHeight, 2 // 2 meter row spacing
            );
            // Initialize robot at first waypoint
            this.generator.initializeRobot(robotId, fleetId, path[0], shared_types_1.RobotStatus.WORKING);
            // Set robot path
            this.generator.setRobotPath(robotId, {
                waypoints: path,
                speed: 0.8, // 0.8 m/s (slow and steady)
                loopPath: true,
                pauseAtWaypoints: false,
            });
            // Set initial activity
            const state = this.generator.getRobotState(robotId);
            if (state) {
                state.activity = telemetry_types_1.RobotActivity.WORKING;
                state.speed = 0.8;
            }
        });
        const config = {
            type: telemetry_types_1.ScenarioType.LAWN_MOWING,
            name: 'Autonomous Lawn Care Fleet',
            description: '12 autonomous lawn mowers providing comprehensive property coverage',
            fleetId,
            robotCount: numRobots,
            baseLocation: { ...baseLocation, timestamp: new Date() },
            areaSize: propertySize,
            workPattern: {
                type: 'grid',
                coverage: 100,
                efficiency: 95,
                pathOptimization: true,
                avoidanceRadius: 3,
            },
            chargingStations: [
                { ...baseLocation, timestamp: new Date() }, // Central charging station
                {
                    latitude: baseLocation.latitude + this.metersToLatitude(propertySize),
                    longitude: baseLocation.longitude,
                    altitude: baseLocation.altitude,
                    timestamp: new Date(),
                },
            ],
        };
        this.activeScenarios.set(fleetId, config);
        return config;
    }
    /**
     * Initialize a warehouse logistics scenario
     * 20 robots moving inventory, picking, and stocking
     */
    initializeWarehouseScenario(fleetId, robotIds) {
        const baseLocation = this.BASE_LOCATIONS.WAREHOUSE_DISTRICT;
        const numRobots = robotIds.length || 20;
        const warehouseSize = 150; // meters
        console.log(`📦 Initializing warehouse logistics scenario with ${numRobots} robots`);
        // Define warehouse zones
        const zones = {
            receiving: { x: 0, y: 0, width: 30, height: 30 },
            storage: { x: 40, y: 0, width: 80, height: 100 },
            picking: { x: 40, y: 110, width: 80, height: 40 },
            shipping: { x: 130, y: 0, width: 20, height: 30 },
        };
        robotIds.forEach((robotId, index) => {
            // Assign robots to different tasks
            const taskType = index % 4;
            let startZone;
            let endZone;
            let speed;
            if (taskType === 0) {
                // Receiving -> Storage
                startZone = zones.receiving;
                endZone = zones.storage;
                speed = 1.5;
            }
            else if (taskType === 1) {
                // Storage -> Picking
                startZone = zones.storage;
                endZone = zones.picking;
                speed = 1.2;
            }
            else if (taskType === 2) {
                // Picking -> Shipping
                startZone = zones.picking;
                endZone = zones.shipping;
                speed = 1.8;
            }
            else {
                // Shipping -> Receiving (return)
                startZone = zones.shipping;
                endZone = zones.receiving;
                speed = 2.0;
            }
            // Create waypoint path
            const startPoint = {
                latitude: baseLocation.latitude + this.metersToLatitude(startZone.y + Math.random() * startZone.height),
                longitude: baseLocation.longitude + this.metersToLongitude(startZone.x + Math.random() * startZone.width, baseLocation.latitude),
                altitude: baseLocation.altitude,
                timestamp: new Date(),
            };
            const endPoint = {
                latitude: baseLocation.latitude + this.metersToLatitude(endZone.y + Math.random() * endZone.height),
                longitude: baseLocation.longitude + this.metersToLongitude(endZone.x + Math.random() * endZone.width, baseLocation.latitude),
                altitude: baseLocation.altitude,
                timestamp: new Date(),
            };
            // Generate path with intermediate waypoints for realism
            const waypoints = this.generateWarehouseRoute(startPoint, endPoint, 3);
            // Initialize robot
            this.generator.initializeRobot(robotId, fleetId, waypoints[0], shared_types_1.RobotStatus.WORKING);
            // Set robot path
            this.generator.setRobotPath(robotId, {
                waypoints,
                speed,
                loopPath: true,
                pauseAtWaypoints: true,
                pauseDuration: 5, // 5 second pause at waypoints (loading/unloading)
            });
            // Set initial activity
            const state = this.generator.getRobotState(robotId);
            if (state) {
                state.activity = telemetry_types_1.RobotActivity.WORKING;
                state.speed = speed;
            }
        });
        const config = {
            type: telemetry_types_1.ScenarioType.WAREHOUSE_LOGISTICS,
            name: 'Warehouse Automation Fleet',
            description: '20 autonomous mobile robots handling inventory operations',
            fleetId,
            robotCount: numRobots,
            baseLocation: { ...baseLocation, timestamp: new Date() },
            areaSize: warehouseSize,
            workPattern: {
                type: 'waypoint',
                coverage: 90,
                efficiency: 98,
                pathOptimization: true,
                avoidanceRadius: 2,
            },
            chargingStations: [
                { ...baseLocation, timestamp: new Date() }, // Main charging area
                {
                    latitude: baseLocation.latitude + this.metersToLatitude(75),
                    longitude: baseLocation.longitude + this.metersToLongitude(75, baseLocation.latitude),
                    altitude: baseLocation.altitude,
                    timestamp: new Date(),
                },
            ],
        };
        this.activeScenarios.set(fleetId, config);
        return config;
    }
    /**
     * Initialize an agriculture scenario
     * 8 robots for planting, monitoring, and harvesting
     */
    initializeAgricultureScenario(fleetId, robotIds) {
        const baseLocation = this.BASE_LOCATIONS.FARM_LAND;
        const numRobots = robotIds.length || 8;
        const fieldSize = 300; // meters
        console.log(`🚜 Initializing agriculture scenario with ${numRobots} robots`);
        // Define field rows
        const rowSpacing = 3; // 3 meters between rows
        const numRows = Math.floor(fieldSize / rowSpacing);
        const rowsPerRobot = Math.ceil(numRows / numRobots);
        robotIds.forEach((robotId, index) => {
            // Calculate which rows this robot covers
            const startRow = index * rowsPerRobot;
            const endRow = Math.min(startRow + rowsPerRobot, numRows);
            // Create path covering assigned rows
            const topLeft = {
                latitude: baseLocation.latitude + this.metersToLatitude(startRow * rowSpacing),
                longitude: baseLocation.longitude,
                altitude: baseLocation.altitude,
                timestamp: new Date(),
            };
            const path = this.generator.generateGridPath(topLeft, fieldSize, (endRow - startRow) * rowSpacing, rowSpacing);
            // Initialize robot
            this.generator.initializeRobot(robotId, fleetId, path[0], shared_types_1.RobotStatus.WORKING);
            // Set robot path - slower for precision agriculture
            this.generator.setRobotPath(robotId, {
                waypoints: path,
                speed: 0.5, // 0.5 m/s (slow and precise)
                loopPath: true,
                pauseAtWaypoints: false,
            });
            // Set initial activity
            const state = this.generator.getRobotState(robotId);
            if (state) {
                state.activity = telemetry_types_1.RobotActivity.WORKING;
                state.speed = 0.5;
            }
        });
        const config = {
            type: telemetry_types_1.ScenarioType.AGRICULTURE,
            name: 'Precision Agriculture Fleet',
            description: '8 autonomous farm robots for planting, monitoring, and harvesting',
            fleetId,
            robotCount: numRobots,
            baseLocation: { ...baseLocation, timestamp: new Date() },
            areaSize: fieldSize,
            workPattern: {
                type: 'grid',
                coverage: 100,
                efficiency: 92,
                pathOptimization: true,
                avoidanceRadius: 5,
            },
            chargingStations: [
                { ...baseLocation, timestamp: new Date() }, // Farm base
            ],
        };
        this.activeScenarios.set(fleetId, config);
        return config;
    }
    /**
     * Initialize a custom scenario with random patrol patterns
     */
    initializeCustomScenario(fleetId, robotIds, baseLocation, areaSize = 100) {
        const location = baseLocation || this.BASE_LOCATIONS.CUSTOM;
        const numRobots = robotIds.length;
        console.log(`🎯 Initializing custom scenario with ${numRobots} robots`);
        robotIds.forEach((robotId, index) => {
            // Create circular patrol path around base
            const patrolRadius = areaSize / 2 + (index * 10); // Stagger patrol radii
            const waypoints = this.generator.generateCircularPath(location, patrolRadius, 16);
            // Initialize robot
            this.generator.initializeRobot(robotId, fleetId, waypoints[0], shared_types_1.RobotStatus.IDLE);
            // Set robot path
            this.generator.setRobotPath(robotId, {
                waypoints,
                speed: 1.0 + Math.random() * 0.5, // Varied speeds
                loopPath: true,
                pauseAtWaypoints: false,
            });
        });
        const config = {
            type: telemetry_types_1.ScenarioType.CUSTOM,
            name: 'Custom Patrol Scenario',
            description: `${numRobots} robots on circular patrol patterns`,
            fleetId,
            robotCount: numRobots,
            baseLocation: location,
            areaSize,
            workPattern: {
                type: 'random',
                coverage: 80,
                efficiency: 85,
                pathOptimization: false,
                avoidanceRadius: 3,
            },
            chargingStations: [{ ...location, timestamp: new Date() }],
        };
        this.activeScenarios.set(fleetId, config);
        return config;
    }
    /**
     * Get active scenario configuration
     */
    getScenario(fleetId) {
        return this.activeScenarios.get(fleetId);
    }
    /**
     * List all active scenarios
     */
    listScenarios() {
        return Array.from(this.activeScenarios.values());
    }
    /**
     * Stop and remove a scenario
     */
    stopScenario(fleetId) {
        this.activeScenarios.delete(fleetId);
        console.log(`⏹️  Stopped scenario for fleet ${fleetId}`);
    }
    /**
     * Helper: Generate warehouse route with intermediate waypoints
     */
    generateWarehouseRoute(start, end, intermediatePoints) {
        const waypoints = [start];
        // Add intermediate waypoints (simulating aisle navigation)
        for (let i = 1; i <= intermediatePoints; i++) {
            const fraction = i / (intermediatePoints + 1);
            // Add some lateral offset for realistic warehouse navigation
            const lateralOffset = (Math.random() - 0.5) * 0.00001;
            waypoints.push({
                latitude: start.latitude + (end.latitude - start.latitude) * fraction,
                longitude: start.longitude + (end.longitude - start.longitude) * fraction + lateralOffset,
                altitude: start.altitude,
                timestamp: new Date(),
            });
        }
        waypoints.push(end);
        return waypoints;
    }
    /**
     * Helper: Convert meters to latitude degrees
     */
    metersToLatitude(meters) {
        return meters / 111000;
    }
    /**
     * Helper: Convert meters to longitude degrees (latitude-dependent)
     */
    metersToLongitude(meters, latitude) {
        return meters / (111000 * Math.cos((latitude * Math.PI) / 180));
    }
    /**
     * Quick start a demo scenario
     */
    quickStartDemo(scenarioType, fleetId, robotIds) {
        switch (scenarioType) {
            case telemetry_types_1.ScenarioType.LAWN_MOWING:
                return this.initializeLawnMowingScenario(fleetId, robotIds);
            case telemetry_types_1.ScenarioType.WAREHOUSE_LOGISTICS:
                return this.initializeWarehouseScenario(fleetId, robotIds);
            case telemetry_types_1.ScenarioType.AGRICULTURE:
                return this.initializeAgricultureScenario(fleetId, robotIds);
            case telemetry_types_1.ScenarioType.CUSTOM:
            default:
                return this.initializeCustomScenario(fleetId, robotIds);
        }
    }
    /**
     * Get demo scenario recommendations based on fleet size
     */
    getRecommendedScenario(robotCount) {
        if (robotCount <= 8) {
            return telemetry_types_1.ScenarioType.AGRICULTURE;
        }
        else if (robotCount <= 12) {
            return telemetry_types_1.ScenarioType.LAWN_MOWING;
        }
        else if (robotCount <= 20) {
            return telemetry_types_1.ScenarioType.WAREHOUSE_LOGISTICS;
        }
        return telemetry_types_1.ScenarioType.CUSTOM;
    }
    /**
     * Simulate a scenario event (task completion, battery swap, etc.)
     */
    simulateEvent(fleetId, eventType) {
        const scenario = this.activeScenarios.get(fleetId);
        if (!scenario) {
            console.warn(`No active scenario for fleet ${fleetId}`);
            return;
        }
        console.log(`🎬 Simulating event: ${eventType} for fleet ${fleetId}`);
        // Implementation would trigger specific robot state changes
        // This is a placeholder for future enhancement
    }
}
exports.ScenarioManager = ScenarioManager;
