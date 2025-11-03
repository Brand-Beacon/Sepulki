import { gql } from '@apollo/client'

// Fleet Queries
export const FLEETS_QUERY = gql`
  query Fleets($filter: FleetFilter, $limit: Int, $offset: Int) {
    fleets(filter: $filter, limit: $limit, offset: $offset) {
      id
      name
      description
      status
      locus {
        id
        name
        coordinates {
          latitude
          longitude
          altitude
        }
      }
      robots {
        id
        name
        status
        batteryLevel
        healthScore
        lastSeen
      }
      activeTask {
        id
        name
        status
      }
    }
  }
`

export const FLEET_QUERY = gql`
  query Fleet($id: ID!) {
    fleet(id: $id) {
      id
      name
      description
      status
      locus {
        id
        name
        description
        coordinates {
          latitude
          longitude
          altitude
        }
      }
      robots {
        id
        name
        status
        batteryLevel
        healthScore
        lastSeen
        pose {
          position {
            latitude
            longitude
            altitude
          }
          orientation
          jointPositions
          timestamp
        }
        streamUrl
      }
      activeTask {
        id
        name
        description
        status
        priority
      }
    }
  }
`

// Robot Queries
export const ROBOTS_QUERY = gql`
  query Robots($fleetId: ID, $status: RobotStatus, $limit: Int, $offset: Int) {
    robots(fleetId: $fleetId, status: $status, limit: $limit, offset: $offset) {
      id
      name
      sepulkaId
      fleetId
      status
      batteryLevel
      healthScore
      lastSeen
      pose {
        position {
          latitude
          longitude
          altitude
        }
        orientation
        jointPositions
        timestamp
      }
      streamUrl
    }
  }
`

export const ROBOT_QUERY = gql`
  query Robot($id: ID!) {
    robot(id: $id) {
      id
      name
      sepulkaId
      fleetId
      status
      batteryLevel
      healthScore
      lastSeen
      pose {
        position {
          latitude
          longitude
          altitude
        }
        orientation
        jointPositions
        timestamp
      }
      streamUrl
      currentIngot {
        id
        version
        status
      }
    }
  }
`

// Task Queries
export const TASKS_QUERY = gql`
  query Tasks($filter: TaskFilter, $limit: Int, $offset: Int) {
    tasks(filter: $filter, limit: $limit, offset: $offset) {
      id
      name
      description
      type
      status
      priority
      scheduledAt
      createdAt
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

export const TASK_QUERY = gql`
  query Task($id: ID!) {
    task(id: $id) {
      id
      name
      description
      type
      status
      priority
      scheduledAt
      createdAt
      parameters
      assignedRobots {
        id
        name
        status
        batteryLevel
      }
      runs {
        id
        status
        startedAt
        completedAt
        metrics
        logs
      }
    }
  }
`

// Design Queries
export const SEPULKA_QUERY = gql`
  query Sepulka($id: ID!) {
    sepulka(id: $id) {
      id
      name
      description
      version
      status
      pattern {
        id
        name
        category
      }
      alloys {
        id
        name
        type
        specifications
      }
      parameters
      createdAt
      createdBy {
        id
        name
        email
      }
    }
  }
`

// Factory Floor Queries
export const FACTORY_FLOORS_QUERY = gql`
  query FactoryFloors($limit: Int, $offset: Int) {
    factoryFloors(limit: $limit, offset: $offset) {
      id
      name
      description
      blueprintUrl
      blueprintType
      widthMeters
      heightMeters
      scaleFactor
      originX
      originY
      createdAt
      createdBy {
        id
        name
        email
      }
      robots {
        id
        name
        status
      }
    }
  }
`

export const FACTORY_FLOOR_QUERY = gql`
  query FactoryFloor($id: ID!) {
    factoryFloor(id: $id) {
      id
      name
      description
      blueprintUrl
      blueprintType
      widthMeters
      heightMeters
      scaleFactor
      originX
      originY
      createdAt
      createdBy {
        id
        name
        email
      }
      robots {
        id
        name
        status
        batteryLevel
        healthScore
        lastSeen
        floorPositionX
        floorPositionY
        floorPositionTheta
        isMobile
        floorRotationDegrees
        factoryFloor {
          id
          name
        }
      }
    }
  }
`

