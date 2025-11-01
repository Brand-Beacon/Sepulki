import { gql } from '@apollo/client'

// Real-time subscriptions for fleet monitoring

export const ROBOT_STATUS_SUBSCRIPTION = gql`
  subscription RobotStatus($robotId: ID!) {
    robotStatus(robotId: $robotId) {
      id
      name
      status
      batteryLevel
      healthScore
      lastSeen
      pose
    }
  }
`

export const FLEET_ROBOT_STATUS_SUBSCRIPTION = gql`
  subscription FleetRobotStatus($fleetId: ID!) {
    robotStatus(robotId: $fleetId) {
      id
      name
      status
      batteryLevel
      healthScore
      lastSeen
      pose
    }
  }
`

export const BELLOWS_STREAM_SUBSCRIPTION = gql`
  subscription BellowsStream($fleetId: ID!) {
    bellowsStream(fleetId: $fleetId) {
      fleetId
      metrics {
        timestamp
        robotId
        batteryLevel
        healthScore
        pose
      }
      events {
        timestamp
        type
        robotId
        message
      }
      realTime
    }
  }
`

export const TASK_UPDATES_SUBSCRIPTION = gql`
  subscription TaskUpdates($fleetId: ID) {
    taskUpdates(fleetId: $fleetId) {
      id
      name
      status
      priority
      assignedRobots {
        id
        name
        status
      }
      runs {
        id
        status
        startedAt
        completedAt
      }
    }
  }
`

