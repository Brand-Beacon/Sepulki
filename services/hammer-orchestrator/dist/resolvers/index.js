"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const graphql_scalars_1 = require("graphql-scalars");
const sepulka_1 = require("./sepulka");
const alloy_1 = require("./alloy");
const fleet_1 = require("./fleet");
const task_1 = require("./task");
const auth_1 = require("./auth");
const telemetry_1 = require("./telemetry");
const upload_1 = require("./upload");
const subscriptions_1 = require("./subscriptions");
const factory_floor_1 = require("./factory-floor");
const edict_mutations_1 = require("./edict-mutations");
exports.resolvers = {
    // Scalar types
    DateTime: graphql_scalars_1.DateTimeResolver,
    JSON: graphql_scalars_1.JSONResolver,
    // Queries
    Query: {
        ...sepulka_1.sepulkaResolvers.Query,
        ...alloy_1.alloyResolvers.Query,
        ...fleet_1.fleetResolvers.Query,
        ...task_1.taskResolvers.Query,
        ...telemetry_1.telemetryResolvers.Query,
        ...factory_floor_1.factoryFloorResolvers.Query,
        // Stub implementation for edicts (TODO: Implement properly)
        edicts: async () => [],
    },
    // Mutations
    Mutation: {
        ...sepulka_1.sepulkaResolvers.Mutation,
        ...fleet_1.fleetResolvers.Mutation,
        ...task_1.taskResolvers.Mutation,
        ...auth_1.authResolvers.Mutation,
        ...upload_1.uploadResolvers.Mutation,
        ...factory_floor_1.factoryFloorResolvers.Mutation,
        ...edict_mutations_1.edictMutations,
        // Stub implementations for missing mutations (TODO: Implement properly)
        logout: async () => { throw new Error('logout not yet implemented'); },
    },
    // Subscriptions
    Subscription: {
        ...telemetry_1.telemetryResolvers.Subscription,
        ...subscriptions_1.subscriptionResolvers,
    },
    // Type resolvers
    Sepulka: sepulka_1.sepulkaResolvers.Sepulka,
    Ingot: sepulka_1.sepulkaResolvers.Ingot,
    Alloy: alloy_1.alloyResolvers.Alloy,
    Fleet: fleet_1.fleetResolvers.Fleet,
    Robot: fleet_1.fleetResolvers.Robot,
    Task: task_1.taskResolvers.Task,
    Run: task_1.taskResolvers.Run,
    Smith: auth_1.authResolvers.Smith,
    FactoryFloor: factory_floor_1.factoryFloorResolvers.FactoryFloor,
};
