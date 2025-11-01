import { gql } from '@apollo/client'

// Upload Mutations
export const UPLOAD_PROGRAM_MUTATION = gql`
  mutation UploadProgram($robotId: ID, $fleetId: ID, $file: Upload!) {
    uploadProgram(robotId: $robotId, fleetId: $fleetId, file: $file) {
      success
      taskId
      fileId
      fileName
      robots {
        id
        name
        status
        batteryLevel
      }
      errors {
        code
        message
      }
    }
  }
`

export const UPLOAD_ROUTE_MUTATION = gql`
  mutation UploadRoute($robotId: ID, $fleetId: ID, $file: Upload!) {
    uploadRoute(robotId: $robotId, fleetId: $fleetId, file: $file) {
      success
      taskId
      fileId
      fileName
      route {
        id
        name
        waypoints {
          id
          sequence
          position {
            lat
            lng
            alt
          }
        }
      }
      robots {
        id
        name
        status
        batteryLevel
      }
      errors {
        code
        message
      }
    }
  }
`

// Task Mutations
export const DISPATCH_TASK_MUTATION = gql`
  mutation DispatchTask($fleetId: ID!, $input: TaskInput!) {
    dispatchTask(fleetId: $fleetId, input: $input) {
      task {
        id
        name
        description
        type
        status
        priority
      }
      assignments {
        robotId
        estimatedDuration
        confidence
      }
      errors {
        code
        message
      }
    }
  }
`

export const CANCEL_TASK_MUTATION = gql`
  mutation CancelTask($taskId: ID!) {
    cancelTask(taskId: $taskId) {
      id
      name
      status
    }
  }
`

// Design Mutations
export const FORGE_SEPULKA_MUTATION = gql`
  mutation ForgeSepulka($input: ForgeInput!) {
    forgeSepulka(input: $input) {
      sepulka {
        id
        name
        description
        version
        status
        pattern {
          id
          name
        }
        alloys {
          id
          name
          type
        }
      }
      errors {
        code
        message
        field
      }
    }
  }
`

export const CAST_INGOT_MUTATION = gql`
  mutation CastIngot($sepulkaId: ID!) {
    castIngot(sepulkaId: $sepulkaId) {
      ingot {
        id
        sepulkaId
        status
      }
      errors {
        code
        message
      }
    }
  }
`

export const QUENCH_TO_FLEET_MUTATION = gql`
  mutation QuenchToFleet($ingotId: ID!, $fleetId: ID!, $rolloutPercent: Int) {
    quenchToFleet(ingotId: $ingotId, fleetId: $fleetId, rolloutPercent: $rolloutPercent) {
      robots {
        id
        name
        status
      }
      errors {
        code
        message
      }
    }
  }
`

