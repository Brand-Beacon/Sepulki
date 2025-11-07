"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryResolvers = void 0;
const context_1 = require("../context");
const shared_types_1 = require("@sepulki/shared-types");
exports.telemetryResolvers = {
    Query: {
        async bellows(parent, { fleetId, timeRange }, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_BELLOWS);
            // TODO: Implement integration with Bellows telemetry service
            // This would fetch real telemetry data from InfluxDB
            return {
                fleetId,
                metrics: [
                    // Mock data structure
                    {
                        robotId: 'robot-1',
                        timestamp: new Date(),
                        metric: 'BATTERY_SOC',
                        value: 85.5,
                        unit: '%',
                        tags: {
                            fleet: fleetId,
                            location: 'zone-a'
                        }
                    }
                ],
                events: [
                    {
                        id: 'event-1',
                        robotId: 'robot-1',
                        fleetId,
                        timestamp: new Date(),
                        type: 'TASK_COMPLETED',
                        severity: 'INFO',
                        message: 'Task completed successfully',
                        data: {},
                        acknowledged: false
                    }
                ],
                realTime: false
            };
        }
    },
    Subscription: {
        bellowsStream: async (parent, { fleetId }, context) => {
            // Stub implementation for development
            return {
                fleetId,
                metrics: [],
                events: [],
                realTime: false
            };
        },
    }
};
