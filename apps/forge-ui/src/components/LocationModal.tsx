'use client'

import { useState } from 'react'
import { X, MapPin, Loader2 } from 'lucide-react'

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  entityId: string
  entityName: string
  entityType: 'fleet' | 'robot'
  currentLocation?: { latitude: number; longitude: number }
  onLocationUpdate: (coordinates: { latitude: number; longitude: number }) => void
}

// Geocode address using OpenStreetMap Nominatim API
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
    {
      headers: {
        'User-Agent': 'Sepulki Fleet Management System'
      }
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to geocode address')
  }
  
  const data = await response.json()
  
  if (!data || data.length === 0) {
    throw new Error('Address not found')
  }
  
  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon)
  }
}

// Parse coordinates from string (format: "lat, lng" or "lat,lng")
function parseCoordinates(input: string): { latitude: number; longitude: number } | null {
  const trimmed = input.trim()
  const parts = trimmed.split(/[,\s]+/)
  
  if (parts.length !== 2) {
    return null
  }
  
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  
  if (isNaN(lat) || isNaN(lng)) {
    return null
  }
  
  // Validate coordinate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }
  
  return { latitude: lat, longitude: lng }
}

export function LocationModal({
  isOpen,
  onClose,
  entityId,
  entityName,
  entityType,
  currentLocation,
  onLocationUpdate
}: LocationModalProps) {
  const [inputType, setInputType] = useState<'address' | 'coordinates'>('address')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isFleet = entityType === 'fleet'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let result: { latitude: number; longitude: number }

      if (inputType === 'address') {
        if (!address.trim()) {
          setError(`Please enter an address`)
          setLoading(false)
          return
        }
        
        result = await geocodeAddress(address)
      } else {
        if (!coordinates.trim()) {
          setError('Please enter coordinates')
          setLoading(false)
          return
        }
        
        const parsed = parseCoordinates(coordinates)
        if (!parsed) {
          setError('Invalid coordinates format. Use: latitude, longitude (e.g., 42.9634, -85.6681)')
          setLoading(false)
          return
        }
        
        result = parsed
      }

      // Update location
      await onLocationUpdate(result)
      
      // Close modal
      onClose()
      
      // Reset form
      setAddress('')
      setCoordinates('')
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update location')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      setAddress('')
      setCoordinates('')
      setError(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-orange-600" />
                Update {isFleet ? 'Fleet' : 'Robot'} Location
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={handleClose}
                disabled={loading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Update location for <span className="font-medium">{entityName}</span>
            </p>

            {currentLocation && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 mb-1">Current Location:</p>
                <p className="text-sm text-gray-900">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </p>
              </div>
            )}

            {/* Input type selector */}
            <div className="mb-4 flex space-x-4 border-b border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setInputType('address')
                  setError(null)
                }}
                className={`pb-2 px-1 text-sm font-medium ${
                  inputType === 'address'
                    ? 'border-b-2 border-orange-600 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Address
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputType('coordinates')
                  setError(null)
                }}
                className={`pb-2 px-1 text-sm font-medium ${
                  inputType === 'coordinates'
                    ? 'border-b-2 border-orange-600 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Coordinates
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {inputType === 'address' ? (
                <div className="mb-4">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value)
                      setError(null)
                    }}
                    placeholder="e.g., 123 Main St, Grand Rapids, MI"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter a street address, city, or location name
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label htmlFor="coordinates" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Coordinates
                  </label>
                  <input
                    type="text"
                    id="coordinates"
                    value={coordinates}
                    onChange={(e) => {
                      setCoordinates(e.target.value)
                      setError(null)
                    }}
                    placeholder="e.g., 42.9634, -85.6681"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Format: latitude, longitude (comma-separated)
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (inputType === 'address' ? !address.trim() : !coordinates.trim())}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Location'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

