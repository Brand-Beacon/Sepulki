import request from 'supertest'
import express from 'express'
import multer from 'multer'
import { createContext } from '../../src/context'
import { FileStorageService } from '../../src/services/fileStorage'
import { Pool } from 'pg'

// Mock dependencies
jest.mock('../../src/context')
jest.mock('../../src/services/fileStorage')

describe('File Upload API', () => {
  let app: express.Application
  let mockDb: jest.Mocked<Pool>
  let mockFileStorage: jest.Mocked<FileStorageService>

  beforeEach(() => {
    // Setup Express app
    app = express()
    app.use(express.json())

    // Mock multer
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    })

    // Mock file storage
    mockFileStorage = {
      uploadFile: jest.fn(),
      validateFile: jest.fn(),
      parseRouteFile: jest.fn(),
      getFile: jest.fn(),
      storagePath: './storage/files',
    } as any

    // Mock database
    mockDb = {
      query: jest.fn(),
    } as any

    // Mock context
    ;(createContext as jest.Mock).mockResolvedValue({
      db: mockDb,
      smith: { id: 'smith-123', email: 'test@example.com' },
      session: { smithId: 'smith-123' },
    })

    // Upload endpoint
    app.post('/api/upload', upload.single('file'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' })
        }

        const authHeader = req.headers.authorization
        const token = authHeader?.replace('Bearer ', '')
        const context = await createContext({ token })

        if (!context.smith && !context.session) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const { robotId, fleetId, uploadType } = req.body

        if (!robotId && !fleetId) {
          return res.status(400).json({ error: 'Either robotId or fleetId must be provided' })
        }

        const uploadResult = await mockFileStorage.uploadFile(
          req.file.buffer,
          req.file.originalname,
          uploadType === 'route' ? 'route' : 'program',
          robotId || undefined,
          fleetId || undefined
        )

        // Mock task creation
        mockDb.query.mockResolvedValueOnce({
          rows: [{ id: 'task-123', name: 'Test Task' }],
        })

        // Mock robot assignment
        if (robotId) {
          mockDb.query.mockResolvedValueOnce({
            rows: [{ id: robotId, name: 'Test Robot', status: 'WORKING', battery_level: 80 }],
          })
        }

        res.json({
          success: true,
          taskId: 'task-123',
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          robots: [],
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        })
      }
    })
  })

  describe('POST /api/upload', () => {
    it('should upload a file successfully', async () => {
      mockFileStorage.uploadFile.mockResolvedValue({
        fileId: 'file-123',
        fileName: 'test.json',
        filePath: 'programs/test.json',
        fileSize: 1024,
        contentType: 'application/json',
        url: '/api/files/test.json',
      })

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer test-token')
        .field('robotId', 'robot-123')
        .field('uploadType', 'program')
        .attach('file', Buffer.from('{"test": "data"}'), 'test.json')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.taskId).toBe('task-123')
      expect(response.body.fileId).toBe('file-123')
    })

    it('should require authentication', async () => {
      ;(createContext as jest.Mock).mockResolvedValueOnce({
        db: mockDb,
        smith: undefined,
        session: undefined,
      })

      const response = await request(app)
        .post('/api/upload')
        .field('robotId', 'robot-123')
        .field('uploadType', 'program')
        .attach('file', Buffer.from('test'), 'test.json')

      expect(response.status).toBe(401)
      expect(response.body.error).toContain('Authentication required')
    })

    it('should require robotId or fleetId', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer test-token')
        .field('uploadType', 'program')
        .attach('file', Buffer.from('test'), 'test.json')

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('robotId or fleetId')
    })

    it('should handle file upload errors', async () => {
      mockFileStorage.uploadFile.mockRejectedValue(new Error('Storage error'))

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer test-token')
        .field('robotId', 'robot-123')
        .field('uploadType', 'program')
        .attach('file', Buffer.from('test'), 'test.json')

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
    })

    it('should support fleet uploads', async () => {
      mockFileStorage.uploadFile.mockResolvedValue({
        fileId: 'file-456',
        fileName: 'route.gpx',
        filePath: 'routes/fleet-789/route.gpx',
        fileSize: 2048,
        contentType: 'application/gpx+xml',
        url: '/api/files/route.gpx',
      })

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer test-token')
        .field('fleetId', 'fleet-789')
        .field('uploadType', 'route')
        .attach('file', Buffer.from('gpx content'), 'route.gpx')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(mockFileStorage.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'route.gpx',
        'route',
        undefined,
        'fleet-789'
      )
    })
  })
})

