import { gql } from '@apollo/client'

// Fleet Location Mutations
export const UPDATE_FLEET_LOCATION_MUTATION = gql`
  mutation UpdateFleetLocation($fleetId: ID!, $coordinates: CoordinatesInput!) {
    updateFleetLocation(fleetId: $fleetId, coordinates: $coordinates) {
      id
      name
      locus {
        id
        name
        coordinates {
          latitude
          longitude
          altitude
        }
      }
    }
  }
`

export const UPDATE_ROBOT_LOCATION_MUTATION = gql`
  mutation UpdateRobotLocation($robotId: ID!, $coordinates: CoordinatesInput!) {
    updateRobotLocation(robotId: $robotId, coordinates: $coordinates) {
        id
        name
      pose {
          position {
          latitude
          longitude
          altitude
        }
        timestamp
      }
    }
  }
`

// Factory Floor Mutations
export const CREATE_FACTORY_FLOOR_MUTATION = gql`
  mutation CreateFactoryFloor($input: FactoryFloorInput!, $blueprintFile: Upload!) {
    createFactoryFloor(input: $input, blueprintFile: $blueprintFile) {
      factoryFloor {
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
      }
      errors {
        code
        message
        field
      }
    }
  }
`

export const UPDATE_FACTORY_FLOOR_MUTATION = gql`
  mutation UpdateFactoryFloor($id: ID!, $input: UpdateFactoryFloorInput, $blueprintFile: Upload) {
    updateFactoryFloor(id: $id, input: $input, blueprintFile: $blueprintFile) {
      factoryFloor {
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
      }
      errors {
        code
        message
        field
      }
    }
  }
`

export const DELETE_FACTORY_FLOOR_MUTATION = gql`
  mutation DeleteFactoryFloor($id: ID!) {
    deleteFactoryFloor(id: $id)
  }
`

export const ASSIGN_ROBOT_TO_FLOOR_MUTATION = gql`
  mutation AssignRobotToFloor($robotId: ID!, $floorId: ID!, $position: FloorPositionInput) {
    assignRobotToFloor(robotId: $robotId, floorId: $floorId, position: $position) {
      id
      name
      factoryFloor {
        id
        name
      }
      floorPositionX
      floorPositionY
      floorPositionTheta
      floorRotationDegrees
    }
  }
`

export const UPDATE_ROBOT_FLOOR_POSITION_MUTATION = gql`
  mutation UpdateRobotFloorPosition($robotId: ID!, $position: FloorPositionInput!) {
    updateRobotFloorPosition(robotId: $robotId, position: $position) {
        id
        name
      floorPositionX
      floorPositionY
      floorPositionTheta
      floorRotationDegrees
    }
  }
`

export const UPDATE_ROBOT_MOBILITY_MUTATION = gql`
  mutation UpdateRobotMobility($robotId: ID!, $isMobile: Boolean!) {
    updateRobotMobility(robotId: $robotId, isMobile: $isMobile) {
      id
      name
      isMobile
    }
  }
`
