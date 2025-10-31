import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

import { createContext } from './context';
import { resolvers } from './resolvers';
import { setupDataLoaders } from './dataloaders';
import { AuthenticationError } from './errors';
import { FileStorageService } from './services/fileStorage';

const typeDefs = readFileSync(
  join(__dirname, '../../../packages/graphql-schema/schema.graphql'),
  'utf8'
);

async function startServer() {
  // Create Express app
  const app = express();
  const httpServer = createServer(app);

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
  });

  await server.start();

  // Apply CORS and JSON parsing globally
  app.use(cors<cors.CorsRequest>({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }))
  app.use(express.json())

  // Apply middleware
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        
        // For local development only, allow mock authentication
        const isLocalDev = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') && 
                          (process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1'));
        
        if (isLocalDev && token && token.endsWith('.mock-signature-for-development')) {
          console.log('🔧 Local development mode: Creating mock context for token');
          return await createContext({ token });
        }
        
        // For local development without auth, provide a basic context
        if (isLocalDev && !token) {
          console.log('🔧 Local development mode: Creating anonymous context');
          return await createContext({});
        }
        
        try {
          return await createContext({ token });
        } catch (error) {
          // Log the actual error for debugging
          console.error('Context creation error:', error);
          throw new AuthenticationError(`Authentication failed: ${error instanceof Error ? error.message : error}`);
        }
      },
    }),
  );

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const validExtensions = ['.json', '.gpx', '.yaml', '.yml']
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'))
      if (validExtensions.includes(fileExtension)) {
        cb(null, true)
      } else {
        cb(new Error(`Invalid file type. Please upload a ${validExtensions.join(', ')} file.`))
      }
    }
  })

  const fileStorage = new FileStorageService()

  // Serve uploaded files
  app.use('/api/files', express.static(fileStorage.storagePath))

  // File upload endpoint (REST for simplicity)
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      // Get auth token
      const authHeader = req.headers.authorization
      const token = authHeader?.replace('Bearer ', '')
      const context = await createContext({ token })
      
      // Require authentication (check for smith/session)
      if (!context.smith && !context.session) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const { robotId, fleetId, uploadType } = req.body
      const file = req.file

      // Validate input
      if (!robotId && !fleetId) {
        return res.status(400).json({ error: 'Either robotId or fleetId must be provided' })
      }

      // Upload file to storage
      const uploadResult = await fileStorage.uploadFile(
        file.buffer,
        file.originalname,
        uploadType === 'route' ? 'route' : 'program',
        robotId || undefined,
        fleetId || undefined
      )

      // Create task
      const taskQuery = `
        INSERT INTO tasks (name, description, type, parameters, priority, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `

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
      })
    } catch (error) {
      console.error('Upload failed:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  })

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok',
      service: 'hammer-orchestrator',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  const PORT = process.env.PORT || 4000;
  
  httpServer.listen(PORT, () => {
    console.log(`🔨 Hammer Orchestrator ready at http://localhost:${PORT}/graphql`);
  });
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
