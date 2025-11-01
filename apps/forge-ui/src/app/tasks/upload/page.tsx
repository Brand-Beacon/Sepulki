'use client'

import { RouteGuard } from '@/components/RouteGuard'
import { useAuth } from '@/components/AuthProvider'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileUploader } from '@/components/FileUploader'
import { RoutePreview } from '@/components/RoutePreview'

function TasksUploadPageContent() {
  const { smith } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fleetId = searchParams.get('fleetId')
  const robotId = searchParams.get('robotId')

  const [file, setFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<'program' | 'route'>('program')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setUploadResult(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setError(null)
    setSuccess(false)
    setUploading(true)

    try {
      // Use REST endpoint for file uploads (simpler than GraphQL file uploads)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadType', uploadType)
      
      if (robotId) {
        formData.append('robotId', robotId)
      } else if (fleetId) {
        formData.append('fleetId', fleetId)
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      if (result.success) {
        setSuccess(true)
        setUploadResult(result)
        
        // Redirect after success
        setTimeout(() => {
          if (robotId) {
            router.push(`/robot/${robotId}`)
          } else if (fleetId) {
            router.push(`/fleet/${fleetId}`)
          } else {
            router.push('/tasks')
          }
        }, 2000)
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          ← Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Upload Program or Route</h1>
            <p className="text-gray-600 mt-2">
              {robotId ? `Uploading to specific robot` : fleetId ? `Uploading to fleet` : 'Upload program/route files for robots'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-8">
        {/* Upload Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Type
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => {
                setUploadType('program')
                setFile(null)
                setError(null)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadType === 'program'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Program
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadType('route')
                setFile(null)
                setError(null)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadType === 'route'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Route
            </button>
          </div>
        </div>

        {/* File Upload Area */}
        <FileUploader
          onFileSelect={handleFileSelect}
          acceptedTypes={['.json', '.gpx', '.yaml', '.yml']}
          maxSize={10 * 1024 * 1024}
        />

        {/* Route Preview */}
        {uploadType === 'route' && file && <RoutePreview file={file} />}

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm text-gray-500">Processing</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && uploadResult && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">Upload successful!</p>
            <div className="mt-2 space-y-1 text-sm text-green-700">
              <p>File: {uploadResult.fileName}</p>
              {uploadResult.taskId && (
                <p>Task created: <Link href={`/tasks`} className="underline">{uploadResult.taskId}</Link></p>
              )}
              {uploadResult.robots?.length > 0 && (
                <p>Deployed to {uploadResult.robots.length} robot{uploadResult.robots.length !== 1 ? 's' : ''}</p>
              )}
              <p className="text-xs mt-2">Redirecting...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading || success}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : success ? 'Uploaded!' : 'Upload & Deploy'}
          </button>
        </div>

        {/* Deployment Target Info */}
        {(robotId || fleetId) && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {robotId ? (
                <>Deploying to specific robot. <Link href={`/robot/${robotId}`} className="underline">View robot details</Link></>
              ) : (
                <>Deploying to entire fleet. <Link href={`/fleet/${fleetId}`} className="underline">View fleet details</Link></>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasksUploadPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <TasksUploadPageContent />
    </RouteGuard>
  )
}

