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

  // Apply CORS and JSON parsing globally - Allow both localhost and 127.0.0.1
  app.use(cors<cors.CorsRequest>({
    origin: (origin, callback) => {
      // Allow requests from localhost:3000 or 127.0.0.1:3000
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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
      fileSize: 50 * 1024 * 1024, // 50MB (increased for blueprints)
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

  // Configure multer for blueprint uploads (images/PDF)
  const blueprintUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
      const validExtensions = ['.png', '.jpg', '.jpeg', '.pdf']
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

  // Blueprint upload endpoint for existing floors (REST for simplicity)
  app.post('/api/upload/blueprint', blueprintUpload.single('blueprint'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      // Get auth token
      const authHeader = req.headers.authorization
      const token = authHeader?.replace('Bearer ', '')
      const context = await createContext({ token })
      
      // Require authentication
      if (!context.smith && !context.session) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const { floorId } = req.query
      const file = req.file

      // Upload file to storage
      const uploadResult = await fileStorage.uploadFile(
        file.buffer,
        file.originalname,
        'blueprint',
        undefined,
        undefined,
        floorId as string || undefined
      )

      res.json({
        success: true,
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        filePath: uploadResult.filePath,
        url: uploadResult.url,
      })
    } catch (error) {
      console.error('Blueprint upload failed:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  })

  // Factory floor creation with blueprint upload endpoint (REST for simplicity)
  app.post('/api/floors/create', blueprintUpload.single('blueprint'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Blueprint file is required' })
      }

      // Get auth token
      const authHeader = req.headers.authorization
      const token = authHeader?.replace('Bearer ', '')
      const context = await createContext({ token })
      
      // Require authentication
      if (!context.smith && !context.session) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const { name, description, widthMeters, heightMeters, scaleFactor, originX, originY } = req.body

      // Validate required fields
      if (!name || !widthMeters || !heightMeters || !scaleFactor) {
        return res.status(400).json({ error: 'Name, widthMeters, heightMeters, and scaleFactor are required' })
      }

      const file = req.file

      // Start transaction
      const client = await context.db.connect()
      await client.query('BEGIN')

      try {
        // Upload file to storage
        const uploadResult = await fileStorage.uploadFile(
          file.buffer,
          file.originalname,
          'blueprint'
        )

        // Determine blueprint type from file extension
        const fileExt = file.originalname.toLowerCase().split('.').pop() || ''
        let blueprintType: string
        if (['png', 'jpg', 'jpeg'].includes(fileExt)) {
          blueprintType = 'IMAGE'
        } else if (fileExt === 'pdf') {
          blueprintType = 'PDF'
        } else {
          blueprintType = 'IMAGE'
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
        `
        
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
        ])

        await client.query('COMMIT')
        
        const factoryFloor = floorResult.rows[0]

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
        })
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Factory floor creation failed:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create factory floor'
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
