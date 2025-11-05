"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const default_1 = require("@apollo/server/plugin/landingPage/default");
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const http_1 = require("http");
const fs_1 = require("fs");
const path_1 = require("path");
const context_1 = require("./context");
const resolvers_1 = require("./resolvers");
const errors_1 = require("./errors");
const fileStorage_1 = require("./services/fileStorage");
const telemetry_integration_1 = require("./services/telemetry-integration");
const pg_1 = require("pg");
// Security middleware imports
const security_1 = require("./middleware/security");
const rate_limit_1 = require("./middleware/rate-limit");
const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../../../packages/graphql-schema/schema.graphql'), 'utf8');
// Initialize telemetry service (global instance)
let telemetryService = null;
async function startServer() {
    // Create Express app
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    // Configure request timeout
    httpServer.timeout = security_1.requestTimeout;
    // Initialize database pool for telemetry service
    const db = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://smith:forge_dev@localhost:5432/sepulki',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });
    // Initialize telemetry integration service
    telemetryService = new telemetry_integration_1.TelemetryIntegrationService(db);
    // Start telemetry generation if enabled
    const enableTelemetry = process.env.ENABLE_TELEMETRY !== 'false'; // Enabled by default
    if (enableTelemetry) {
        console.log('🚀 Starting telemetry generation...');
        try {
            await telemetryService.startTelemetryGeneration();
        }
        catch (error) {
            console.error('⚠️  Failed to start telemetry generation:', error);
            console.log('📝 Server will continue without telemetry');
        }
    }
    else {
        console.log('⏸️  Telemetry generation disabled via ENABLE_TELEMETRY=false');
    }
    // Create Apollo Server
    const server = new server_1.ApolloServer({
        typeDefs,
        resolvers: resolvers_1.resolvers,
        plugins: [
            (0, default_1.ApolloServerPluginLandingPageLocalDefault)({ embed: true }),
        ],
    });
    await server.start();
    // Apply security middleware (includes Helmet, CORS, rate limiting, etc.)
    (0, security_1.applySecurityMiddleware)(app);
    // Apply rate limiting
    (0, rate_limit_1.applyRateLimiting)(app);
    // Apply JSON parsing with size limit
    app.use(express_1.default.json({ limit: security_1.requestSizeLimit }));
    app.use(express_1.default.urlencoded({ extended: true, limit: security_1.requestSizeLimit }));
    // Apply middleware
    app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => {
            const authHeader = req.headers.authorization;
            const token = authHeader?.replace('Bearer ', '');
            // For local development only, allow mock authentication
            const isLocalDev = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') &&
                (process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1'));
            if (isLocalDev && token && token.endsWith('.mock-signature-for-development')) {
                console.log('🔧 Local development mode: Creating mock context for token');
                return await (0, context_1.createContext)({ token });
            }
            // For local development without auth, provide a basic context
            if (isLocalDev && !token) {
                console.log('🔧 Local development mode: Creating anonymous context');
                return await (0, context_1.createContext)({});
            }
            try {
                return await (0, context_1.createContext)({ token });
            }
            catch (error) {
                // Log the actual error for debugging
                console.error('Context creation error:', error);
                throw new errors_1.AuthenticationError(`Authentication failed: ${error instanceof Error ? error.message : error}`);
            }
        },
    }));
    // Configure multer for file uploads
    const upload = (0, multer_1.default)({
        storage: multer_1.default.memoryStorage(),
        limits: {
            fileSize: 50 * 1024 * 1024, // 50MB (increased for blueprints)
        },
        fileFilter: (req, file, cb) => {
            const validExtensions = ['.json', '.gpx', '.yaml', '.yml'];
            const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
            if (validExtensions.includes(fileExtension)) {
                cb(null, true);
            }
            else {
                cb(new Error(`Invalid file type. Please upload a ${validExtensions.join(', ')} file.`));
            }
        }
    });
    // Configure multer for blueprint uploads (images/PDF)
    const blueprintUpload = (0, multer_1.default)({
        storage: multer_1.default.memoryStorage(),
        limits: {
            fileSize: 50 * 1024 * 1024, // 50MB
        },
        fileFilter: (req, file, cb) => {
            const validExtensions = ['.png', '.jpg', '.jpeg', '.pdf'];
            const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
            if (validExtensions.includes(fileExtension)) {
                cb(null, true);
            }
            else {
                cb(new Error(`Invalid file type. Please upload a ${validExtensions.join(', ')} file.`));
            }
        }
    });
    const fileStorage = new fileStorage_1.FileStorageService();
    // Serve uploaded files
    app.use('/api/files', express_1.default.static(fileStorage.storagePath));
    // File upload endpoint (REST for simplicity)
    app.post('/api/upload', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file provided' });
            }
            // Get auth token
            const authHeader = req.headers.authorization;
            const token = authHeader?.replace('Bearer ', '');
            const context = await (0, context_1.createContext)({ token });
            // Require authentication (check for smith/session)
            if (!context.smith && !context.session) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const { robotId, fleetId, uploadType } = req.body;
            const file = req.file;
            // Validate input
            if (!robotId && !fleetId) {
                return res.status(400).json({ error: 'Either robotId or fleetId must be provided' });
            }
            // Upload file to storage
            const uploadResult = await fileStorage.uploadFile(file.buffer, file.originalname, uploadType === 'route' ? 'route' : 'program', robotId || undefined, fleetId || undefined);
            // Create task
            const taskQuery = `
        INSERT INTO tasks (name, description, type, parameters, priority, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
            const taskParams = {
                name: `${uploadType === 'route' ? 'Route' : 'Program'}: ${uploadResult.fileName}`,
                description: `Uploaded ${uploadType}: ${uploadResult.fileName}`,
                type: 'CUSTOM', // Use CUSTOM task type, store actual type in parameters
                parameters: {
                    fileId: uploadResult.fileId,
                    fileName: uploadResult.fileName,
                    filePath: uploadResult.filePath,
                    fileUrl: uploadResult.url,
                    uploadType, // Store actual upload type in parameters
                },
                priority: 'NORMAL',
                status: 'PENDING',
                createdBy: context.smith?.id || context.session?.smithId || 'system',
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
            res.json({
                success: true,
                taskId: task.id,
                fileId: uploadResult.fileId,
                fileName: uploadResult.fileName,
                robots: assignedRobots.map(r => ({
                    id: r.id,
                    name: r.name,
                    status: r.status,
                    batteryLevel: r.battery_level,
                })),
            });
        }
        catch (error) {
            console.error('Upload failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed'
            });
        }
    });
    // Blueprint upload endpoint for existing floors (REST for simplicity)
    app.post('/api/upload/blueprint', blueprintUpload.single('blueprint'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file provided' });
            }
            // Get auth token
            const authHeader = req.headers.authorization;
            const token = authHeader?.replace('Bearer ', '');
            const context = await (0, context_1.createContext)({ token });
            // Require authentication
            if (!context.smith && !context.session) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const { floorId } = req.query;
            const file = req.file;
            // Upload file to storage
            const uploadResult = await fileStorage.uploadFile(file.buffer, file.originalname, 'blueprint', undefined, undefined, floorId || undefined);
            res.json({
                success: true,
                fileId: uploadResult.fileId,
                fileName: uploadResult.fileName,
                filePath: uploadResult.filePath,
                url: uploadResult.url,
            });
        }
        catch (error) {
            console.error('Blueprint upload failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed'
            });
        }
    });
    // Factory floor creation with blueprint upload endpoint (REST for simplicity)
    app.post('/api/floors/create', blueprintUpload.single('blueprint'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Blueprint file is required' });
            }
            // Get auth token
            const authHeader = req.headers.authorization;
            const token = authHeader?.replace('Bearer ', '');
            const context = await (0, context_1.createContext)({ token });
            // Require authentication
            if (!context.smith && !context.session) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const { name, description, widthMeters, heightMeters, scaleFactor, originX, originY } = req.body;
            // Validate required fields
            if (!name || !widthMeters || !heightMeters || !scaleFactor) {
                return res.status(400).json({ error: 'Name, widthMeters, heightMeters, and scaleFactor are required' });
            }
            const file = req.file;
            // Start transaction
            const client = await context.db.connect();
            await client.query('BEGIN');
            try {
                // Upload file to storage
                const uploadResult = await fileStorage.uploadFile(file.buffer, file.originalname, 'blueprint');
                // Determine blueprint type from file extension
                const fileExt = file.originalname.toLowerCase().split('.').pop() || '';
                let blueprintType;
                if (['png', 'jpg', 'jpeg'].includes(fileExt)) {
                    blueprintType = 'IMAGE';
                }
                else if (fileExt === 'pdf') {
                    blueprintType = 'PDF';
                }
                else {
                    blueprintType = 'IMAGE';
                }
                // Create factory floor record
                const insertQuery = `
          INSERT INTO factory_floors (
            name, description, blueprint_url, blueprint_type,
            width_meters, height_meters, scale_factor,
            origin_x, origin_y, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;
                const floorResult = await client.query(insertQuery, [
                    name,
                    description || null,
                    uploadResult.url,
                    blueprintType,
                    parseFloat(widthMeters),
                    parseFloat(heightMeters),
                    parseFloat(scaleFactor),
                    originX ? parseFloat(originX) : 0,
                    originY ? parseFloat(originY) : 0,
                    context.smith?.id || context.session?.smithId
                ]);
                await client.query('COMMIT');
                const factoryFloor = floorResult.rows[0];
                res.json({
                    success: true,
                    factoryFloor: {
                        id: factoryFloor.id,
                        name: factoryFloor.name,
                        description: factoryFloor.description,
                        blueprintUrl: factoryFloor.blueprint_url,
                        blueprintType: factoryFloor.blueprint_type,
                        widthMeters: factoryFloor.width_meters,
                        heightMeters: factoryFloor.height_meters,
                        scaleFactor: factoryFloor.scale_factor,
                        originX: factoryFloor.origin_x,
                        originY: factoryFloor.origin_y,
                        createdAt: factoryFloor.created_at,
                    }
                });
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('Factory floor creation failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create factory floor'
            });
        }
    });
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            service: 'hammer-orchestrator',
            version: process.env.npm_package_version || '1.0.0',
            timestamp: new Date().toISOString(),
            telemetry: telemetryService ? telemetryService.getStats() : { enabled: false }
        });
    });
    // Telemetry control endpoints
    app.get('/api/telemetry/stats', (req, res) => {
        if (!telemetryService) {
            return res.status(503).json({ error: 'Telemetry service not available' });
        }
        res.json(telemetryService.getStats());
    });
    app.post('/api/telemetry/config', express_1.default.json(), async (req, res) => {
        if (!telemetryService) {
            return res.status(503).json({ error: 'Telemetry service not available' });
        }
        try {
            const config = req.body;
            telemetryService.updateConfig(config);
            res.json({
                success: true,
                message: 'Telemetry configuration updated',
                config: telemetryService.getStats()
            });
        }
        catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to update config'
            });
        }
    });
    app.post('/api/telemetry/scenario', express_1.default.json(), async (req, res) => {
        if (!telemetryService) {
            return res.status(503).json({ error: 'Telemetry service not available' });
        }
        try {
            const { fleetId, scenarioType } = req.body;
            if (!fleetId || !scenarioType) {
                return res.status(400).json({
                    error: 'fleetId and scenarioType are required'
                });
            }
            await telemetryService.createScenario(fleetId, scenarioType);
            res.json({
                success: true,
                message: `Scenario ${scenarioType} created for fleet ${fleetId}`,
                scenario: telemetryService.getScenarioManager().getScenario(fleetId)
            });
        }
        catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to create scenario'
            });
        }
    });
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
        console.log(`🔨 Hammer Orchestrator ready at http://localhost:${PORT}/graphql`);
    });
}
// Handle shutdown gracefully
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (telemetryService) {
        console.log('⏹️  Stopping telemetry service...');
        telemetryService.stopTelemetryGeneration();
    }
    await (0, rate_limit_1.closeRateLimitStore)();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    if (telemetryService) {
        console.log('⏹️  Stopping telemetry service...');
        telemetryService.stopTelemetryGeneration();
    }
    await (0, rate_limit_1.closeRateLimitStore)();
    process.exit(0);
});
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
