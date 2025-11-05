import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { sepulkaResolvers } from './sepulka';
import { alloyResolvers } from './alloy';
import { fleetResolvers } from './fleet';
import { taskResolvers } from './task';
import { authResolvers } from './auth';
import { telemetryResolvers } from './telemetry';
import { uploadResolvers } from './upload';
import { subscriptionResolvers } from './subscriptions';
import { factoryFloorResolvers } from './factory-floor';
import { edictMutations } from './edict-mutations';
import type { Resolvers } from './types';

export const resolvers: Resolvers = {
  // Scalar types
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  // Queries
  Query: {
    ...sepulkaResolvers.Query,
    ...alloyResolvers.Query,
    ...fleetResolvers.Query,
    ...taskResolvers.Query,
    ...telemetryResolvers.Query,
    ...factoryFloorResolvers.Query,
    
    // Stub implementation for edicts (TODO: Implement properly)
    edicts: async () => [],
  },

  // Mutations
  Mutation: {
    ...sepulkaResolvers.Mutation,
    ...fleetResolvers.Mutation,
    ...taskResolvers.Mutation,
    ...authResolvers.Mutation,
    ...uploadResolvers.Mutation,
    ...factoryFloorResolvers.Mutation,
    ...edictMutations,

    // Stub implementations for missing mutations (TODO: Implement properly)
    logout: async () => { throw new Error('logout not yet implemented') },
  },

  // Subscriptions
  Subscription: {
    ...telemetryResolvers.Subscription,
    ...subscriptionResolvers,
  },

  // Type resolvers
  Sepulka: sepulkaResolvers.Sepulka,
  Ingot: sepulkaResolvers.Ingot,
  Alloy: alloyResolvers.Alloy,
  Fleet: fleetResolvers.Fleet,
  Robot: fleetResolvers.Robot,
  Task: taskResolvers.Task,
  Run: taskResolvers.Run,
  Smith: authResolvers.Smith,
  FactoryFloor: factoryFloorResolvers.FactoryFloor,
};
