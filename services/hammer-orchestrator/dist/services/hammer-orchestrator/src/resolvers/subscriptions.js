"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionResolvers = exports.SUBSCRIPTION_CHANNELS = exports.pubsub = void 0;
exports.publishRobotStatusUpdate = publishRobotStatusUpdate;
exports.publishBellowsStreamUpdate = publishBellowsStreamUpdate;
exports.publishTaskUpdate = publishTaskUpdate;
exports.publishPolicyBreach = publishPolicyBreach;
const context_1 = require("../context");
const shared_types_1 = require("@sepulki/shared-types");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const graphql_subscriptions_2 = require("graphql-subscriptions");
// Create PubSub instance for subscriptions
// In production, this would use Redis pub/sub
exports.pubsub = new graphql_subscriptions_2.PubSub();
// Subscription channel names
exports.SUBSCRIPTION_CHANNELS = {
    ROBOT_STATUS: 'ROBOT_STATUS',
    BELLOWS_STREAM: 'BELLOWS_STREAM',
    TASK_UPDATES: 'TASK_UPDATES',
    POLICY_BREACHES: 'POLICY_BREACHES',
};
exports.subscriptionResolvers = {
    robotStatus: {
        subscribe: async (parent, { robotId }, context) => {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_FLEET);
            return (0, graphql_subscriptions_1.withFilter)(() => exports.pubsub.asyncIterator([exports.SUBSCRIPTION_CHANNELS.ROBOT_STATUS]), (payload, variables) => {
                // Filter by robotId if provided
                if (variables.robotId) {
                    return payload.robotStatus.id === variables.robotId;
                }
                // Otherwise subscribe to all robot status updates
                return true;
            })();
        }
    },
    bellowsStream: {
        subscribe: async (parent, { fleetId }, context) => {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_BELLOWS);
            return (0, graphql_subscriptions_1.withFilter)(() => exports.pubsub.asyncIterator([exports.SUBSCRIPTION_CHANNELS.BELLOWS_STREAM]), (payload, variables) => {
                // Filter by fleetId
                return payload.bellowsStream.fleetId === variables.fleetId;
            })();
        }
    },
    taskUpdates: {
        subscribe: async (parent, { fleetId }, context) => {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_TASKS);
            return (0, graphql_subscriptions_1.withFilter)(() => exports.pubsub.asyncIterator([exports.SUBSCRIPTION_CHANNELS.TASK_UPDATES]), (payload, variables) => {
                // Filter by fleetId if provided
                if (variables.fleetId) {
                    // Check if task is assigned to any robot in the fleet
                    const task = payload.taskUpdates;
                    return task.assignedRobots?.some((robot) => robot.fleetId === variables.fleetId);
                }
                return true;
            })();
        }
    },
    policyBreaches: {
        subscribe: async (parent, { severity }, context) => {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_FLEET);
            return (0, graphql_subscriptions_1.withFilter)(() => exports.pubsub.asyncIterator([exports.SUBSCRIPTION_CHANNELS.POLICY_BREACHES]), (payload, variables) => {
                // Filter by severity if provided
                if (variables.severity) {
                    return payload.policyBreach.severity === variables.severity;
                }
                return true;
            })();
        }
    }
};
// Helper functions to publish updates
async function publishRobotStatusUpdate(robot) {
    await exports.pubsub.publish(exports.SUBSCRIPTION_CHANNELS.ROBOT_STATUS, {
        robotStatus: robot
    });
}
async function publishBellowsStreamUpdate(fleetId, data) {
    await exports.pubsub.publish(exports.SUBSCRIPTION_CHANNELS.BELLOWS_STREAM, {
        bellowsStream: {
            fleetId,
            ...data
        }
    });
}
async function publishTaskUpdate(task) {
    await exports.pubsub.publish(exports.SUBSCRIPTION_CHANNELS.TASK_UPDATES, {
        taskUpdates: task
    });
}
async function publishPolicyBreach(breach) {
    await exports.pubsub.publish(exports.SUBSCRIPTION_CHANNELS.POLICY_BREACHES, {
        policyBreach: breach
    });
}
