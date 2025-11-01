import type { Context } from '../context'
import { requirePermission } from '../context'
import { ValidationError, ServiceError } from '../errors'
import { Permission } from '@sepulki/shared-types'
import { FileStorageService } from '../services/fileStorage'
import { TaskStatus, TaskPriority, TaskType } from '@sepulki/shared-types'
import crypto from 'crypto'

const fileStorage = new FileStorageService()

export const uploadResolvers = {
  Mutation: {
    async uploadProgram(parent: any, args: any, context: Context) {
      const { smith } = await requirePermission(context, Permission.CREATE_TASK)
      const { robotId, fleetId, file } = args

      // Validate input
      if (!robotId && !fleetId) {
        throw new ValidationError('Either robotId or fleetId must be provided', 'robotId')
      }

      if (!file) {
        throw new ValidationError('File is required', 'file')
      }

      try {
        // Upload file to storage
        const uploadResult = await fileStorage.uploadFile(
          file,
          file.filename || 'program.json',
          'program',
          robotId,
          fleetId
        )

        // Create task for program execution
        const taskQuery = `
          INSERT INTO tasks (name, description, type, parameters, priority, status, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `

        const taskParams = {
          name: `Program: ${uploadResult.fileName}`,
          description: `Uploaded program: ${uploadResult.fileName}`,
          type: TaskType.CUSTOM, // Use CUSTOM, actual type stored in parameters
          parameters: {
            fileId: uploadResult.fileId,
            fileName: uploadResult.fileName,
            filePath: uploadResult.filePath,
            fileUrl: uploadResult.url,
            uploadType: 'program', // Store actual upload type
          },
          priority: TaskPriority.NORMAL,
          status: TaskStatus.PENDING,
          createdBy: smith.id,
        }

        const taskResult = await context.db.query(taskQuery, [
          taskParams.name,
          taskParams.description,
          taskParams.type,
          JSON.stringify(taskParams.parameters),
          taskParams.priority,
          taskParams.status,
          taskParams.createdBy,
        ])

        const task = taskResult.rows[0]

        // Assign task to robot(s)
        let assignedRobots: any[] = []

        if (robotId) {
          // Assign to specific robot
          await context.db.query(
            'INSERT INTO task_robots (task_id, robot_id) VALUES ($1, $2)',
            [task.id, robotId]
          )

          const robotResult = await context.db.query('SELECT * FROM robots WHERE id = $1', [robotId])
          assignedRobots = robotResult.rows
        } else if (fleetId) {
          // Assign to all robots in fleet
          const robotsResult = await context.db.query(
            'SELECT * FROM robots WHERE fleet_id = $1 AND status != $2',
            [fleetId, 'OFFLINE']
          )

          for (const robot of robotsResult.rows) {
            await context.db.query(
              'INSERT INTO task_robots (task_id, robot_id) VALUES ($1, $2)',
              [task.id, robot.id]
            )
          }

          assignedRobots = robotsResult.rows
        }

        return {
          success: true,
          taskId: task.id,
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          robots: assignedRobots,
          errors: [],
        }
      } catch (error) {
        console.error('Upload program failed:', error)
        return {
          success: false,
          taskId: null,
          fileId: null,
          fileName: null,
          robots: [],
          errors: [
            {
              code: 'UPLOAD_FAILED',
              message: error instanceof Error ? error.message : 'Failed to upload program',
            },
          ],
        }
      }
    },

    async uploadRoute(parent: any, args: any, context: Context) {
      const { smith } = await requirePermission(context, Permission.CREATE_TASK)
      const { robotId, fleetId, file } = args

      // Validate input
      if (!robotId && !fleetId) {
        throw new ValidationError('Either robotId or fleetId must be provided', 'robotId')
      }

      if (!file) {
        throw new ValidationError('File is required', 'file')
      }

      try {
        // Upload file to storage
        const uploadResult = await fileStorage.uploadFile(
          file,
          file.filename || 'route.json',
          'route',
          robotId,
          fleetId
        )

        // Parse route file to extract waypoints
        let routeData: any = null
        try {
          routeData = await fileStorage.parseRouteFile(file)
        } catch (parseError) {
          console.warn('Failed to parse route file:', parseError)
          // Continue anyway - route data will be stored as raw file
        }

        // Create task for route following
        const taskQuery = `
          INSERT INTO tasks (name, description, type, parameters, priority, status, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `

        const taskParams = {
          name: `Route: ${uploadResult.fileName}`,
          description: `Uploaded route: ${uploadResult.fileName}`,
          type: TaskType.CUSTOM, // Use CUSTOM, actual type stored in parameters
          parameters: {
            fileId: uploadResult.fileId,
            fileName: uploadResult.fileName,
            filePath: uploadResult.filePath,
            fileUrl: uploadResult.url,
            route: routeData,
            uploadType: 'route', // Store actual upload type
          },
          priority: TaskPriority.NORMAL,
          status: TaskStatus.PENDING,
          createdBy: smith.id,
        }

        const taskResult = await context.db.query(taskQuery, [
          taskParams.name,
          taskParams.description,
          taskParams.type,
          JSON.stringify(taskParams.parameters),
          taskParams.priority,
          taskParams.status,
          taskParams.createdBy,
        ])

        const task = taskResult.rows[0]

        // Assign task to robot(s)
        let assignedRobots: any[] = []

        if (robotId) {
          await context.db.query(
            'INSERT INTO task_robots (task_id, robot_id) VALUES ($1, $2)',
            [task.id, robotId]
          )

          const robotResult = await context.db.query('SELECT * FROM robots WHERE id = $1', [robotId])
          assignedRobots = robotResult.rows
        } else if (fleetId) {
          const robotsResult = await context.db.query(
            'SELECT * FROM robots WHERE fleet_id = $1 AND status != $2',
            [fleetId, 'OFFLINE']
          )

          for (const robot of robotsResult.rows) {
            await context.db.query(
              'INSERT INTO task_robots (task_id, robot_id) VALUES ($1, $2)',
              [task.id, robot.id]
            )
          }

          assignedRobots = robotsResult.rows
        }

        // Create route entry (if route data was parsed)
        let route: any = null
        if (routeData) {
          const routeQuery = `
            INSERT INTO routes (id, name, task_id, waypoints, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *
          `
          // TODO: Create routes table if needed, or store in task parameters
          route = {
            id: crypto.randomUUID(),
            name: uploadResult.fileName,
            waypoints: routeData.waypoints || [],
          }
        }

        return {
          success: true,
          taskId: task.id,
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          route,
          robots: assignedRobots,
          errors: [],
        }
      } catch (error) {
        console.error('Upload route failed:', error)
        return {
          success: false,
          taskId: null,
          fileId: null,
          fileName: null,
          route: null,
          robots: [],
          errors: [
            {
              code: 'UPLOAD_FAILED',
              message: error instanceof Error ? error.message : 'Failed to upload route',
            },
          ],
        }
      }
    },
  },
}

