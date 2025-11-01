import { FileStorageService } from '../../src/services/fileStorage'
import fs from 'fs/promises'
import path from 'path'
import { existsSync, mkdirSync, rmSync } from 'fs'

describe('FileStorageService', () => {
  let fileStorage: FileStorageService
  let testStoragePath: string

  beforeEach(() => {
    testStoragePath = path.join(__dirname, '../../test-storage')
    process.env.FILE_STORAGE_PATH = testStoragePath
    fileStorage = new FileStorageService()
    
    // Clean test storage directory
    if (existsSync(testStoragePath)) {
      rmSync(testStoragePath, { recursive: true, force: true })
    }
    mkdirSync(testStoragePath, { recursive: true })
  })

  afterEach(() => {
    // Clean up test storage
    if (existsSync(testStoragePath)) {
      rmSync(testStoragePath, { recursive: true, force: true })
    }
  })

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const fileBuffer = Buffer.from('{"test": "data"}')
      const fileName = 'test.json'
      const robotId = 'robot-123'

      const result = await fileStorage.uploadFile(
        fileBuffer,
        fileName,
        'program',
        robotId
      )

      expect(result.fileId).toBeDefined()
      expect(result.fileName).toBe(fileName)
      expect(result.filePath).toContain('robots/robot-123')
      expect(result.fileSize).toBe(fileBuffer.length)
    })

    it('should store file in correct location for robot', async () => {
      const fileBuffer = Buffer.from('test data')
      const result = await fileStorage.uploadFile(
        fileBuffer,
        'test.json',
        'program',
        'robot-123'
      )

      const fullPath = path.join(testStoragePath, result.filePath)
      const fileExists = existsSync(fullPath)
      expect(fileExists).toBe(true)

      const storedContent = await fs.readFile(fullPath)
      expect(storedContent.toString()).toBe('test data')
    })

    it('should store file in correct location for fleet', async () => {
      const fileBuffer = Buffer.from('test data')
      const result = await fileStorage.uploadFile(
        fileBuffer,
        'route.gpx',
        'route',
        undefined,
        'fleet-456'
      )

      expect(result.filePath).toContain('fleets/fleet-456')
      expect(result.filePath).toContain('route')
    })

    it('should generate unique file IDs', async () => {
      const fileBuffer = Buffer.from('test')
      const result1 = await fileStorage.uploadFile(
        fileBuffer,
        'test1.json',
        'program'
      )
      const result2 = await fileStorage.uploadFile(
        fileBuffer,
        'test2.json',
        'program'
      )

      expect(result1.fileId).not.toBe(result2.fileId)
    })
  })

  describe('validateFile', () => {
    it('should validate JSON files', async () => {
      const file = { name: 'test.json', size: 1024 } as File
      const result = await fileStorage.validateFile(file)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate GPX files', async () => {
      const file = { name: 'route.gpx', size: 2048 } as File
      const result = await fileStorage.validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid file types', async () => {
      const file = { name: 'test.txt', size: 1024 } as File
      const result = await fileStorage.validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid file type')
    })

    it('should reject files exceeding size limit', async () => {
      const file = { name: 'test.json', size: 15 * 1024 * 1024 } as File // 15MB
      const result = await fileStorage.validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds')
    })
  })

  describe('parseRouteFile', () => {
    it('should parse JSON route files', async () => {
      const jsonContent = JSON.stringify({
        waypoints: [
          { lat: 37.7749, lng: -122.4194, sequence: 1 },
          { lat: 37.7849, lng: -122.4294, sequence: 2 }
        ]
      })
      const file = new File([jsonContent], 'route.json', { type: 'application/json' })

      const result = await fileStorage.parseRouteFile(file)

      expect(result.waypoints).toBeDefined()
      expect(result.waypoints.length).toBe(2)
    })

    it('should handle GPX files', async () => {
      const gpxContent = '<?xml version="1.0"?><gpx><wpt lat="37.7749" lon="-122.4194"/></gpx>'
      const file = new File([gpxContent], 'route.gpx', { type: 'application/gpx+xml' })

      const result = await fileStorage.parseRouteFile(file)

      expect(result.type).toBe('gpx')
      expect(result.raw).toContain('gpx')
    })

    it('should handle invalid JSON gracefully', async () => {
      const invalidJson = '{ invalid json }'
      const file = new File([invalidJson], 'route.json', { type: 'application/json' })

      await expect(fileStorage.parseRouteFile(file)).rejects.toThrow()
    })
  })

  describe('getFile', () => {
    it('should retrieve uploaded file by fileId', async () => {
      const fileBuffer = Buffer.from('test content')
      const uploadResult = await fileStorage.uploadFile(
        fileBuffer,
        'test.json',
        'program',
        'robot-123'
      )

      const retrievedFile = await fileStorage.getFile(uploadResult.fileId)

      expect(retrievedFile).not.toBeNull()
      expect(retrievedFile!.toString()).toBe('test content')
    })

    it('should return null for non-existent fileId', async () => {
      const result = await fileStorage.getFile('non-existent-id')
      expect(result).toBeNull()
    })
  })
})

