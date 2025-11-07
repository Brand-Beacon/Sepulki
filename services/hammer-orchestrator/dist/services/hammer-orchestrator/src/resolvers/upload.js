"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadResolvers = void 0;
const context_1 = require("../context");
const errors_1 = require("../errors");
const shared_types_1 = require("@sepulki/shared-types");
const fileStorage_1 = require("../services/fileStorage");
const shared_types_2 = require("@sepulki/shared-types");
const crypto_1 = __importDefault(require("crypto"));
const fileStorage = new fileStorage_1.FileStorageService();
exports.uploadResolvers = {
    Mutation: {
        async uploadProgram(parent, args, context) {
            const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.CREATE_TASK);
            const { robotId, fleetId, file } = args;
            // Validate input
            if (!robotId && !fleetId) {
                throw new errors_1.ValidationError('Either robotId or fleetId must be provided', 'robotId');
            }
            if (!file) {
                throw new errors_1.ValidationError('File is required', 'file');
            }
            try {
                // Upload file to storage
                const uploadResult = await fileStorage.uploadFile(file, file.filename || 'program.json', 'program', robotId, fleetId);
                // Create task for program execution
                const taskQuery = `
          INSERT INTO tasks (name, description, type, parameters, priority, status, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
                const taskParams = {
                    name: `Program: ${uploadResult.fileName}`,
                    description: `Uploaded program: ${uploadResult.fileName}`,
                    type: shared_types_2.TaskType.CUSTOM, // Use CUSTOM, actual type stored in parameters
                    parameters: {
                        fileId: uploadResult.fileId,
                        fileName: uploadResult.fileName,
                        filePath: uploadResult.filePath,
                        fileUrl: uploadResult.url,
                        uploadType: 'program', // Store actual upload type
                    },
                    priority: shared_types_2.TaskPriority.NORMAL,
                    status: shared_types_2.TaskStatus.PENDING,
                    createdBy: smith.id,
                };
                const taskResult = await context.db.query(taskQuery, [
                    taskParams.name,
                    taskParams.description,
                    taskParams.type,
                    JSON.stringify(taskParams.parameters),
                    taskParams.priority,
                    taskParams.status,
                    taskParams.createdBy,
                ]);
                const task = taskResult.rows[0];
                // Assign task to robot(s)
                let assignedRobots = [];
                if (robotId) {
                    // Assign to specific robot
                    await context.db.query('INSERT INTO task_robots (task_id, robot_id) VALUES ($1, $2)', [task.id, robotId]);
                    const robotResult = await context.db.query('SELECT * FROM robots WHERE id = $1', [robotId]);
                    assignedRobots = robotResult.rows;
                }
                else if (fleetId) {
                    // Assign to all robots in fleet
                    const robotsResult = await context.db.query('SELECT * FROM robots WHERE fleet_id = $1 AND status != $2', [fleetId, 'OFFLINE']);
                    for (const robot of robotsResult.rows) {
                        await context.db.query('INSERT INTO task_robots (task_id, robot_id) VALUES ($1, $2)', [task.id, robot.id]);
                    }
                    assignedRobots = robotsResult.rows;
                }
                return {
                    success: true,
                    taskId: task.id,
                    fileId: uploadResult.fileId,
                    fileName: uploadResult.fileName,
                    robots: assignedRobots,
                    errors: [],
                };
            }
            catch (error) {
                console.error('Upload program failed:', error);
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
                };
            }
        },
        async uploadRoute(parent, args, context) {
            const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.CREATE_TASK);
            const { robotId, fleetId, file } = args;
            // Validate input
            if (!robotId && !fleetId) {
                throw new errors_1.ValidationError('Either robotId or fleetId must be provided', 'robotId');
            }
            if (!file) {
                throw new errors_1.ValidationError('File is required', 'file');
            }
            try {
                // Upload file to storage
                const uploadResult = await fileStorage.uploadFile(file, file.filename || 'route.json', 'route', robotId, fleetId);
                // Parse route file to extract waypoints
                let routeData = null;
                try {
                    routeData = await fileStorage.parseRouteFile(file);
                }
                catch (parseError) {
                    console.warn('Failed to parse route file:', parseError);
                    // Continue anyway - route data will be stored as raw file
                }
                // Create task for route following
                const taskQuery = `
          INSERT INTO tasks (name, description, type, parameters, priority, status, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
                const taskParams = {
                    name: `Route: ${uploadResult.fileName}`,
                    description: `Uploaded route: ${uploadResult.fileName}`,
                    type: shared_types_2.TaskType.CUSTOM, // Use CUSTOM, actual type stored in parameters
                    parameters: {
                        fileId: uploadResult.fileId,
                        fileName: uploadResult.fileName,
                        filePath: uploadResult.filePath,
                        fileUrl: uploadResult.url,
                        route: routeData,
                        uploadType: 'route', // Store actual upload type
                    },
                    priority: shared_types_2.TaskPriority.NORMAL,
                    status: shared_types_2.TaskStatus.PENDING,
                    createdBy: smith.id,
                };
                const taskResult = await context.db.query(taskQuery, [
                    taskParams.name,
                    taskParams.description,
                    taskParams.type,
                    JSON.stringify(taskParams.parameters),
                    taskParams.priority,
                    taskParams.status,
                    taskParams.createdBy,
                ]);
                const task = taskResult.rows[0];
                // Assign task to robot(s)
                let assignedRobots = [];
                if (robotId) {
                    await context.db.query('INSERT INTO task_robots (task_id, robot_id) VALUES ($1, $2)', [task.id, robotId]);
                    const robotResult = await context.db.query('SELECT * FROM robots WHERE id = $1', [robotId]);
                    assignedRobots = robotResult.rows;
                }
                else if (fleetId) {
                    const robotsResult = await context.db.query('SELECT * FROM robots WHERE fleet_id = $1 AND status != $2', [fleetId, 'OFFLINE']);
                    for (const robot of robotsResult.rows) {
                        await context.db.query('INSERT INTO task_robots (task_id, robot_id) VALUES ($1, $2)', [task.id, robot.id]);
                    }
                    assignedRobots = robotsResult.rows;
                }
                // Create route entry (if route data was parsed)
                let route = null;
                if (routeData) {
                    const routeQuery = `
            INSERT INTO routes (id, name, task_id, waypoints, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *
          `;
                    // TODO: Create routes table if needed, or store in task parameters
                    route = {
                        id: crypto_1.default.randomUUID(),
                        name: uploadResult.fileName,
                        waypoints: routeData.waypoints || [],
                    };
                }
                return {
                    success: true,
                    taskId: task.id,
                    fileId: uploadResult.fileId,
                    fileName: uploadResult.fileName,
                    route,
                    robots: assignedRobots,
                    errors: [],
                };
            }
            catch (error) {
                console.error('Upload route failed:', error);
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
                };
            }
        },
    },
};
