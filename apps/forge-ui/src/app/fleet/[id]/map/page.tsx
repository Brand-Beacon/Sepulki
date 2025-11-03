'use client'

import { useParams, useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/RouteGuard'
import { RobotMap } from '@/components/RobotMap'
import { useQuery } from '@apollo/client/react'
import { FLEET_QUERY } from '@/lib/graphql/queries'
import { Loader2, MapPin, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useHasPermission } from '@/hooks/useHasPermission'
import { Permission } from '@sepulki/shared-types'
import { LocationModal } from '@/components/LocationModal'
import { useMutation } from '@apollo/client/react'
import { UPDATE_FLEET_LOCATION_MUTATION, UPDATE_ROBOT_LOCATION_MUTATION } from '@/lib/graphql/mutations'
import { useState } from 'react'

function FleetMapPageContent() {
  const params = useParams()
  const router = useRouter()
  const fleetId = params.id as string
  const hasManageFleetPermission = useHasPermission(Permission.MANAGE_FLEET)
  const [selectedEntityForEdit, setSelectedEntityForEdit] = useState<{
    id: string
    name: string
    type: 'fleet' | 'robot'
    coordinates?: { latitude: number; longitude: number }
  } | null>(null)

  const { data, loading, error } = useQuery(FLEET_QUERY, {
    variables: { id: fleetId },
    fetchPolicy: 'cache-and-network'
  })

  const [updateFleetLocation] = useMutation(UPDATE_FLEET_LOCATION_MUTATION, {
    refetchQueries: [{ query: FLEET_QUERY, variables: { id: fleetId } }],
    awaitRefetchQueries: true,
    onError: (error) => {
      console.error('Failed to update fleet location:', error)
    }
  })

  const [updateRobotLocation] = useMutation(UPDATE_ROBOT_LOCATION_MUTATION, {
    refetchQueries: [{ query: FLEET_QUERY, variables: { id: fleetId } }],
    awaitRefetchQueries: true,
    onError: (error) => {
      console.error('Failed to update robot location:', error)
    }
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <span className="ml-3 text-gray-600">Loading fleet map...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Error loading fleet map</p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  const fleet = (data && typeof data === 'object' && 'fleet' in data) 
    ? (data as { fleet?: any }).fleet 
    : undefined

  const handleFleetClick = (fleetId: string, coordinates: { latitude: number; longitude: number }) => {
    if (!hasManageFleetPermission || !fleet) return
    
    setSelectedEntityForEdit({
      id: fleetId,
      name: fleet.name,
      type: 'fleet',
      coordinates
    })
  }

  const handleRobotClick = async (robotId: string, coordinates: { latitude: number; longitude: number }) => {
    if (!hasManageFleetPermission || !fleet) return
    
    try {
      await updateRobotLocation({
        variables: {
          robotId: robotId,
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            altitude: coordinates.altitude
          }
        }
      })
      // Location will be updated via refetch
    } catch (error) {
      console.error('Failed to update robot location:', error)
      throw error
    }
  }

  const handleLocationUpdate = async (coordinates: { latitude: number; longitude: number }) => {
    if (!selectedEntityForEdit) return

    try {
      if (selectedEntityForEdit.type === 'fleet') {
        await updateFleetLocation({
          variables: {
            fleetId: selectedEntityForEdit.id,
            coordinates: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              altitude: coordinates.altitude
            }
          }
        })
      } else if (selectedEntityForEdit.type === 'robot') {
        await updateRobotLocation({
          variables: {
            robotId: selectedEntityForEdit.id,
            coordinates: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              altitude: coordinates.altitude
            }
          }
        })
      }
      
      setSelectedEntityForEdit(null)
    } catch (error) {
      console.error('Failed to update location:', error)
      throw error
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Fleet
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <MapPin className="w-8 h-8 mr-3 text-orange-600" />
              Fleet Map: {fleet?.name || 'Loading...'}
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time GPS visualization of robot positions
              {fleet?.locus?.coordinates && (
                <span className="ml-2 text-sm">
                  • {fleet.locus.coordinates.latitude.toFixed(6)}, {fleet.locus.coordinates.longitude.toFixed(6)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href={`/fleet/${fleetId}`}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700"
            >
              Fleet Dashboard
            </Link>
            <Link
              href={`/fleet/${fleetId}/kennel`}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700"
            >
              Kennel View
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Fleet Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Robots</p>
            <p className="text-2xl font-bold text-gray-900">{fleet?.robots?.length || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-2xl font-bold text-gray-900">{fleet?.status || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Location</p>
            <p className="text-lg font-medium text-gray-900">{fleet?.locus?.name || 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <RobotMap
          fleetId={fleetId}
          height="600px"
          editable={hasManageFleetPermission}
          onFleetClick={hasManageFleetPermission ? handleFleetClick : undefined}
          onRobotClick={hasManageFleetPermission ? handleRobotClick : undefined}
        />
      </div>
      
      {selectedEntityForEdit && selectedEntityForEdit.type === 'fleet' && (
        <LocationModal
          isOpen={!!selectedEntityForEdit}
          onClose={() => setSelectedEntityForEdit(null)}
          entityId={selectedEntityForEdit.id}
          entityName={selectedEntityForEdit.name}
          entityType={selectedEntityForEdit.type}
          currentLocation={selectedEntityForEdit.coordinates}
          onLocationUpdate={handleLocationUpdate}
        />
      )}

      {hasManageFleetPermission && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Edit Mode:</strong> Drag fleet and robot pins to update their locations, or click them to enter coordinates manually
          </p>
        </div>
      )}

      <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Legend</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>Working</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span>Idle</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500" />
            <span>Charging</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span>Error/Offline</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Click on robot markers to view details and access live streams
        </p>
      </div>
    </div>
  )
}

export default function FleetMapPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <FleetMapPageContent />
    </RouteGuard>
  )
}

