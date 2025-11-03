'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { RouteGuard } from '@/components/RouteGuard'
import { FACTORY_FLOOR_QUERY } from '@/lib/graphql/queries'
import { UPDATE_FACTORY_FLOOR_MUTATION, DELETE_FACTORY_FLOOR_MUTATION } from '@/lib/graphql/mutations'
import { FACTORY_FLOORS_QUERY } from '@/lib/graphql/queries'
import { useHasPermission } from '@/hooks/useHasPermission'
import { Permission } from '@sepulki/shared-types'

function EditFactoryFloorPageContent() {
  const params = useParams()
  const router = useRouter()
  const floorId = params.id as string
  const hasManageFleetPermission = useHasPermission(Permission.MANAGE_FLEET)
  
  const { data, loading: queryLoading, error: queryError } = useQuery(FACTORY_FLOOR_QUERY, {
    variables: { id: floorId },
    skip: !floorId,
  })

  const [updateFactoryFloor] = useMutation(UPDATE_FACTORY_FLOOR_MUTATION, {
    refetchQueries: [
      { query: FACTORY_FLOOR_QUERY, variables: { id: floorId } },
      { query: FACTORY_FLOORS_QUERY, variables: { limit: 100, offset: 0 } }
    ],
    awaitRefetchQueries: true,
  })

  const [deleteFactoryFloor] = useMutation(DELETE_FACTORY_FLOOR_MUTATION, {
    refetchQueries: [{ query: FACTORY_FLOORS_QUERY, variables: { limit: 100, offset: 0 } }],
    awaitRefetchQueries: true,
  })

  const floor = data?.factoryFloor

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [widthMeters, setWidthMeters] = useState('')
  const [heightMeters, setHeightMeters] = useState('')
  const [scaleFactor, setScaleFactor] = useState('')
  const [originX, setOriginX] = useState('')
  const [originY, setOriginY] = useState('')
  const [blueprintFile, setBlueprintFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Populate form when floor data loads
  useEffect(() => {
    if (floor) {
      setName(floor.name || '')
      setDescription(floor.description || '')
      setWidthMeters(floor.widthMeters?.toString() || '')
      setHeightMeters(floor.heightMeters?.toString() || '')
      setScaleFactor(floor.scaleFactor?.toString() || '')
      setOriginX(floor.originX?.toString() || '0')
      setOriginY(floor.originY?.toString() || '0')
      if (floor.blueprintUrl) {
        setImagePreview(floor.blueprintUrl)
      }
    }
  }, [floor])

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

    if (widthMeters && parseFloat(widthMeters) <= 0) {
      errors.widthMeters = 'Width must be greater than 0'
    }

    if (heightMeters && parseFloat(heightMeters) <= 0) {
      errors.heightMeters = 'Height must be greater than 0'
    }

    if (scaleFactor && parseFloat(scaleFactor) <= 0) {
      errors.scaleFactor = 'Scale factor must be greater than 0'
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

    if (!hasManageFleetPermission) {
      return
    }

    setSubmitting(true)
    try {
      // If blueprint file is provided, upload it first via REST endpoint
      let blueprintUrl = floor?.blueprintUrl

      if (blueprintFile) {
        const formData = new FormData()
        formData.append('blueprint', blueprintFile)

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

        const uploadResponse = await fetch(`${apiUrl}/api/upload/blueprint?floorId=${floorId}`, {
          method: 'POST',
          headers: token ? {
            'Authorization': `Bearer ${token}`,
          } : {},
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Blueprint upload failed')
        }

        const uploadResult = await uploadResponse.json()
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Blueprint upload failed')
        }

        blueprintUrl = uploadResult.url
      }

      // Update factory floor via GraphQL mutation
      const updateInput: any = {}
      if (name.trim() !== floor?.name) updateInput.name = name.trim()
      if (description.trim() !== (floor?.description || '')) updateInput.description = description.trim() || undefined
      if (widthMeters && parseFloat(widthMeters) !== floor?.widthMeters) updateInput.widthMeters = parseFloat(widthMeters)
      if (heightMeters && parseFloat(heightMeters) !== floor?.heightMeters) updateInput.heightMeters = parseFloat(heightMeters)
      if (scaleFactor && parseFloat(scaleFactor) !== floor?.scaleFactor) updateInput.scaleFactor = parseFloat(scaleFactor)
      if (originX && parseFloat(originX) !== floor?.originX) updateInput.originX = parseFloat(originX)
      if (originY && parseFloat(originY) !== floor?.originY) updateInput.originY = parseFloat(originY)

      // Only update if there are changes
      if (Object.keys(updateInput).length > 0 || blueprintFile) {
        await updateFactoryFloor({
          variables: {
            id: floorId,
            input: Object.keys(updateInput).length > 0 ? updateInput : undefined,
            blueprintFile: blueprintFile || undefined,
          },
        })
      }

      // Redirect to floor detail page
      router.push(`/floors/${floorId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to update factory floor')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete factory floor "${floor?.name}"? This will unassign all robots from this floor.`)) {
      return
    }

    try {
      await deleteFactoryFloor({ variables: { id: floorId } })
      router.push('/floors')
    } catch (err: any) {
      setError(err.message || 'Failed to delete factory floor')
    }
  }

  if (queryLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </div>
    )
  }

  if (queryError || !floor) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Error loading factory floor</p>
          <p className="text-sm text-red-600 mt-1">{queryError?.message || 'Floor not found'}</p>
        </div>
      </div>
    )
  }

  if (!hasManageFleetPermission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">You don't have permission to edit factory floors.</p>
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
          ← Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Factory Floor</h1>
            <p className="text-gray-600 mt-2">Update floor configuration and blueprint</p>
          </div>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Floor
          </button>
        </div>
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
            />
            {validationErrors.scaleFactor && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.scaleFactor}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Pixels per meter in the blueprint image
            </p>
          </div>
        </div>

        {/* Origin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="originX" className="block text-sm font-medium text-gray-700 mb-2">
              Origin X (pixels)
            </label>
            <input
              type="number"
              id="originX"
              value={originX}
              onChange={(e) => setOriginX(e.target.value)}
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              placeholder="0"
            />
          </div>

          <div>
            <label htmlFor="originY" className="block text-sm font-medium text-gray-700 mb-2">
              Origin Y (pixels)
            </label>
            <input
              type="number"
              id="originY"
              value={originY}
              onChange={(e) => setOriginY(e.target.value)}
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              placeholder="0"
            />
          </div>
        </div>

        {/* Blueprint File Upload */}
        <div>
          <label htmlFor="blueprintFile" className="block text-sm font-medium text-gray-700 mb-2">
            Blueprint File (optional - leave empty to keep current)
          </label>
          {imagePreview && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Current Blueprint:</p>
              <img
                src={imagePreview}
                alt="Current blueprint"
                className="max-w-full h-auto border border-gray-300 rounded-md"
                style={{ maxHeight: '400px' }}
              />
            </div>
          )}
          <input
            type="file"
            id="blueprintFile"
            accept="image/png,image/jpeg,image/jpg,application/pdf"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />
          {blueprintFile && (
            <p className="mt-2 text-sm text-gray-600">
              New file selected: {blueprintFile.name} ({(blueprintFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
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
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Updating...' : 'Update Floor'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function EditFactoryFloorPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <EditFactoryFloorPageContent />
    </RouteGuard>
  )
}

