import type { Context } from '../context'
import { requirePermission } from '../context'
import { Permission } from '@sepulki/shared-types'
import { withFilter } from 'graphql-subscriptions'
import { PubSub } from 'graphql-subscriptions'

// Create PubSub instance for subscriptions
// In production, this would use Redis pub/sub
export const pubsub = new PubSub() as any

// Subscription channel names
export const SUBSCRIPTION_CHANNELS = {
  ROBOT_STATUS: 'ROBOT_STATUS',
  BELLOWS_STREAM: 'BELLOWS_STREAM',
  TASK_UPDATES: 'TASK_UPDATES',
  POLICY_BREACHES: 'POLICY_BREACHES',
}

export const subscriptionResolvers = {
  robotStatus: {
    subscribe: async (parent: any, { robotId }: any, context: Context) => {
      await requirePermission(context, Permission.VIEW_FLEET)
      
      return withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.ROBOT_STATUS]),
        (payload, variables) => {
          // Filter by robotId if provided
          if (variables.robotId) {
            return payload.robotStatus.id === variables.robotId
          }
          // Otherwise subscribe to all robot status updates
          return true
        }
      )()
    }
  },

  bellowsStream: {
    subscribe: async (parent: any, { fleetId }: any, context: Context) => {
      await requirePermission(context, Permission.VIEW_BELLOWS)

      return withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.BELLOWS_STREAM]),
        (payload, variables) => {
          // Filter by fleetId
          return payload.bellowsStream.fleetId === variables.fleetId
        }
      )()
    }
  },

  taskUpdates: {
    subscribe: async (parent: any, { fleetId }: any, context: Context) => {
      await requirePermission(context, Permission.VIEW_TASKS)
      
      return withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.TASK_UPDATES]),
        (payload, variables) => {
          // Filter by fleetId if provided
          if (variables.fleetId) {
            // Check if task is assigned to any robot in the fleet
            const task = payload.taskUpdates
            return task.assignedRobots?.some((robot: any) => robot.fleetId === variables.fleetId)
          }
          return true
        }
      )()
    }
  },

  policyBreaches: {
    subscribe: async (parent: any, { severity }: any, context: Context) => {
      await requirePermission(context, Permission.MANAGE_FLEET)
      
      return withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.POLICY_BREACHES]),
        (payload, variables) => {
          // Filter by severity if provided
          if (variables.severity) {
            return payload.policyBreach.severity === variables.severity
          }
          return true
        }
      )()
    }
  }
}

// Helper functions to publish updates
export async function publishRobotStatusUpdate(robot: any) {
  await pubsub.publish(SUBSCRIPTION_CHANNELS.ROBOT_STATUS, {
    robotStatus: robot
  })
}

export async function publishBellowsStreamUpdate(fleetId: string, data: any) {
  await pubsub.publish(SUBSCRIPTION_CHANNELS.BELLOWS_STREAM, {
    bellowsStream: {
      fleetId,
      ...data
    }
  })
}

export async function publishTaskUpdate(task: any) {
  await pubsub.publish(SUBSCRIPTION_CHANNELS.TASK_UPDATES, {
    taskUpdates: task
  })
}

export async function publishPolicyBreach(breach: any) {
  await pubsub.publish(SUBSCRIPTION_CHANNELS.POLICY_BREACHES, {
    policyBreach: breach
  })
}

