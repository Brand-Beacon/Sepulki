'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/RouteGuard'
import { useHasPermission } from '@/hooks/useHasPermission'
import { Permission } from '@sepulki/shared-types'

function CreateFactoryFloorPageContent() {
  const router = useRouter()
  const hasManageFleetPermission = useHasPermission(Permission.MANAGE_FLEET)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [widthMeters, setWidthMeters] = useState('')
  const [heightMeters, setHeightMeters] = useState('')
  const [scaleFactor, setScaleFactor] = useState('')
  const [blueprintFile, setBlueprintFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PNG, JPG, or PDF file.')
      return
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File size exceeds 50MB limit.')
      return
    }

    setBlueprintFile(file)
    setError(null)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!name.trim()) {
      errors.name = 'Name is required'
    }

    if (!widthMeters || parseFloat(widthMeters) <= 0) {
      errors.widthMeters = 'Width must be greater than 0'
    }

    if (!heightMeters || parseFloat(heightMeters) <= 0) {
      errors.heightMeters = 'Height must be greater than 0'
    }

    if (!scaleFactor || parseFloat(scaleFactor) <= 0) {
      errors.scaleFactor = 'Scale factor must be greater than 0'
    }

    if (!blueprintFile) {
      errors.blueprintFile = 'Blueprint file is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    if (!blueprintFile || !hasManageFleetPermission) {
      return
    }

    setLoading(true)
    try {
      // Use REST endpoint for factory floor creation with blueprint upload
      const formData = new FormData()
      formData.append('blueprint', blueprintFile)
      formData.append('name', name.trim())
      if (description.trim()) {
        formData.append('description', description.trim())
      }
      formData.append('widthMeters', widthMeters)
      formData.append('heightMeters', heightMeters)
      formData.append('scaleFactor', scaleFactor)
      formData.append('originX', '0')
      formData.append('originY', '0')

      const apiUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace('/graphql', '') || 'http://localhost:4000'
      const authData = typeof window !== 'undefined' ? (window as any).__SEPULKI_AUTH__ : null
      const smith = authData?.smith

      // Generate JWT token for auth
      let token: string | null = null
      if (smith) {
        const header = { alg: 'HS256', typ: 'JWT' }
        const payload = {
          sub: smith.id,
          email: smith.email,
          name: smith.name,
          role: smith.role,
          sessionId: 'mock-session-001',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        }
        const encodedHeader = btoa(JSON.stringify(header))
        const encodedPayload = btoa(JSON.stringify(payload))
        const signature = 'mock-signature-for-development'
        token = `${encodedHeader}.${encodedPayload}.${signature}`
      }

      const response = await fetch(`${apiUrl}/api/floors/create`, {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create factory floor')
      }

      const result = await response.json()
      if (!result.success || !result.factoryFloor) {
        throw new Error(result.error || 'Failed to create factory floor')
      }

      // Redirect to the newly created floor
      router.push(`/floors/${result.factoryFloor.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create factory floor')
    } finally {
      setLoading(false)
    }
  }

  if (!hasManageFleetPermission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">You don't have permission to create factory floors.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          ← Back to Factory Floors
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create Factory Floor</h1>
        <p className="text-gray-600 mt-2">Upload a blueprint and configure floor dimensions</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-8 space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Floor Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setValidationErrors({ ...validationErrors, name: '' })
            }}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
              validationErrors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Factory Floor A"
          />
          {validationErrors.name && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Optional description of the factory floor"
          />
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="widthMeters" className="block text-sm font-medium text-gray-700 mb-2">
              Width (meters) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="widthMeters"
              value={widthMeters}
              onChange={(e) => {
                setWidthMeters(e.target.value)
                setValidationErrors({ ...validationErrors, widthMeters: '' })
              }}
              step="0.1"
              min="0.1"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
                validationErrors.widthMeters ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="50.0"
            />
            {validationErrors.widthMeters && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.widthMeters}</p>
            )}
          </div>

          <div>
            <label htmlFor="heightMeters" className="block text-sm font-medium text-gray-700 mb-2">
              Height (meters) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="heightMeters"
              value={heightMeters}
              onChange={(e) => {
                setHeightMeters(e.target.value)
                setValidationErrors({ ...validationErrors, heightMeters: '' })
              }}
              step="0.1"
              min="0.1"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
                validationErrors.heightMeters ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="30.0"
            />
            {validationErrors.heightMeters && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.heightMeters}</p>
            )}
          </div>

          <div>
            <label htmlFor="scaleFactor" className="block text-sm font-medium text-gray-700 mb-2">
              Scale Factor (px/m) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="scaleFactor"
              value={scaleFactor}
              onChange={(e) => {
                setScaleFactor(e.target.value)
                setValidationErrors({ ...validationErrors, scaleFactor: '' })
              }}
              step="0.1"
              min="0.1"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
                validationErrors.scaleFactor ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="10.0"
            />
            {validationErrors.scaleFactor && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.scaleFactor}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Pixels per meter in the blueprint image
            </p>
          </div>
        </div>

        {/* Blueprint File Upload */}
        <div>
          <label htmlFor="blueprintFile" className="block text-sm font-medium text-gray-700 mb-2">
            Blueprint File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            id="blueprintFile"
            accept="image/png,image/jpeg,image/jpg,application/pdf"
            onChange={handleFileChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
              validationErrors.blueprintFile ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {validationErrors.blueprintFile && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.blueprintFile}</p>
          )}
          {blueprintFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {blueprintFile.name} ({(blueprintFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
              <img
                src={imagePreview}
                alt="Blueprint preview"
                className="max-w-full h-auto border border-gray-300 rounded-md"
                style={{ maxHeight: '400px' }}
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Floor'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function CreateFactoryFloorPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <CreateFactoryFloorPageContent />
    </RouteGuard>
  )
}

