// Simple file storage service using local filesystem for now
// Can be upgraded to S3/MinIO later
import path from 'path'
import crypto from 'crypto'
import fs from 'fs/promises'
import { mkdirSync, existsSync } from 'fs'

// File storage service for uploading robot programs and routes
// Uses MinIO/S3 for storage

interface FileUploadResult {
  fileId: string
  fileName: string
  filePath: string
  fileSize: number
  contentType: string
  url: string
}

export class FileStorageService {
  public storagePath: string

  constructor() {
    this.storagePath = process.env.FILE_STORAGE_PATH || './storage/files'
    
    // Ensure storage directory exists
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true })
    }
  }

  async uploadFile(
    file: File | Buffer,
    fileName: string,
    fileType: 'program' | 'route',
    robotId?: string,
    fleetId?: string
  ): Promise<FileUploadResult> {
    try {
      // Generate unique file ID
      const fileId = crypto.randomUUID()
      
      // Determine storage path
      let storagePath: string
      if (robotId) {
        storagePath = `${fileType}s/robots/${robotId}/${fileId}/${fileName}`
      } else if (fleetId) {
        storagePath = `${fileType}s/fleets/${fleetId}/${fileId}/${fileName}`
      } else {
        storagePath = `${fileType}s/uploads/${fileId}/${fileName}`
      }

      // Convert file to buffer if needed
      let fileBuffer: Buffer
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer()
        fileBuffer = Buffer.from(arrayBuffer)
      } else {
        fileBuffer = file
      }

      // Ensure directory exists
      const fullPath = path.join(this.storagePath, storagePath)
      const dir = path.dirname(fullPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      // Write file to disk
      await fs.writeFile(fullPath, fileBuffer)

      // For now, return a relative URL (can be served via Express static)
      const fileUrl = `/api/files/${storagePath}`

      return {
        fileId,
        fileName,
        filePath: storagePath,
        fileSize: fileBuffer.length,
        contentType,
        url: fileUrl,
      }
    } catch (error) {
      console.error('File upload failed:', error)
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFile(fileId: string): Promise<Buffer | null> {
    try {
      // TODO: Implement file retrieval by fileId
      // This would require storing fileId -> storagePath mapping in database
      // For now, search in storage directory
      const files = await fs.readdir(this.storagePath, { recursive: true })
      for (const file of files) {
        if (typeof file === 'string' && file.includes(fileId)) {
          const fullPath = path.join(this.storagePath, file)
          return await fs.readFile(fullPath)
        }
      }
      return null
    } catch (error) {
      console.error('File retrieval failed:', error)
      return null
    }
  }

  private getContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.json': 'application/json',
      '.gpx': 'application/gpx+xml',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
      '.xml': 'application/xml',
    }
    return contentTypes[ext] || 'application/octet-stream'
  }

  async validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
    // Validate file type
    const validExtensions = ['.json', '.gpx', '.yaml', '.yml']
    const fileExtension = path.extname(file.name).toLowerCase()
    
    if (!validExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `Invalid file type. Please upload a ${validExtensions.join(', ')} file.`,
      }
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxSize / 1024 / 1024}MB limit.`,
      }
    }

    return { valid: true }
  }

  async parseRouteFile(file: File): Promise<any> {
    // Parse route file and extract waypoints
    const text = await file.text()
    const ext = path.extname(file.name).toLowerCase()

    try {
      if (ext === '.json') {
        return JSON.parse(text)
      } else if (ext === '.gpx') {
        // TODO: Parse GPX file
        // For now, return raw XML
        return { type: 'gpx', raw: text }
      } else if (ext === '.yaml' || ext === '.yml') {
        // TODO: Parse YAML file
        // For now, return raw text
        return { type: 'yaml', raw: text }
      }
    } catch (error) {
      throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return null
  }
}

