'use client'

import { useState, useCallback, useRef } from 'react'
import { AlertCircle, File, Upload as UploadIcon, X } from 'lucide-react'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  acceptedTypes?: string[]
  maxSize?: number // in bytes
  className?: string
}

export function FileUploader({
  onFileSelect,
  acceptedTypes = ['.json', '.gpx', '.yaml', '.yml'],
  maxSize = 10 * 1024 * 1024, // 10MB
  className = ''
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (selectedFile: File): { valid: boolean; error?: string } => {
    // Validate file type
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
    if (!acceptedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `Invalid file type. Please upload a ${acceptedTypes.join(', ')} file.`
      }
    }

    // Validate file size
    if (selectedFile.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0)
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit.`
      }
    }

    return { valid: true }
  }

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validation = validateFile(selectedFile)
    
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
    onFileSelect(selectedFile)
  }, [onFileSelect, acceptedTypes, maxSize])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }, [handleFileSelect])

  const handleRemove = useCallback(() => {
    setFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className={className}>
      {/* File Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragging ? 'border-orange-500 bg-orange-50' : ''}
          ${file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-orange-500 hover:bg-gray-50'}
          ${error ? 'border-red-500 bg-red-50' : ''}
        `}
      >
        {file ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <div className="bg-green-100 rounded-full p-3">
                <File className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <UploadIcon className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Drag and drop your file here</p>
              <p className="text-sm text-gray-500 mt-2">or click to browse</p>
            </div>
            <div>
              <button
                type="button"
                className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700"
                onClick={(e) => e.stopPropagation()}
              >
                Select File
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Supported formats: {acceptedTypes.join(', ')} (Max {(maxSize / 1024 / 1024).toFixed(0)}MB)
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

