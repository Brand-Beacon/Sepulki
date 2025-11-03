'use client'

import { useParams, useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/RouteGuard'
import { useQuery, useSubscription, useMutation } from '@apollo/client/react'
import { FLEET_QUERY } from '@/lib/graphql/queries'
import { BELLOWS_STREAM_SUBSCRIPTION } from '@/lib/graphql/subscriptions'
import { UPDATE_ROBOT_LOCATION_MUTATION } from '@/lib/graphql/mutations'
import { Loader2, MapPin, Activity, Battery } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useHasPermission } from '@/hooks/useHasPermission'
import { Permission } from '@sepulki/shared-types'

// Dynamic import to avoid SSR issues
const RobotMap = dynamic(
  () => import('@/components/RobotMap').then((mod) => mod.RobotMap),
  { ssr: false }
)

function FleetDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const fleetId = params.id as string
  const hasManageFleetPermission = useHasPermission(Permission.MANAGE_FLEET)

  const { data, loading, error } = useQuery(FLEET_QUERY, {
    variables: { id: fleetId },
    fetchPolicy: 'cache-and-network'
  })

  // Subscribe to real-time telemetry
  const { data: telemetryData } = useSubscription(BELLOWS_STREAM_SUBSCRIPTION, {
    variables: { fleetId },
    skip: !fleetId,
  })

  const [updateRobotLocation] = useMutation(UPDATE_ROBOT_LOCATION_MUTATION, {
    refetchQueries: [{ query: FLEET_QUERY, variables: { id: fleetId } }],
    awaitRefetchQueries: true,
    onError: (error) => {
      console.error('Failed to update robot location:', error)
    }
  })

  const handleRobotClick = async (robotId: string, coordinates: { latitude: number; longitude: number }) => {
    if (!hasManageFleetPermission) return
    
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <span className="ml-3 text-gray-600">Loading fleet details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Error loading fleet</p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  const fleet = (data && typeof data === 'object' && 'fleet' in data) 
    ? (data as { fleet?: any }).fleet 
    : undefined
  const robots = fleet?.robots || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': case 'WORKING': case 'IN_PROGRESS':
        return 'text-green-600 bg-green-100'
      case 'IDLE': case 'PENDING':
        return 'text-blue-600 bg-blue-100'
      case 'CHARGING':
        return 'text-yellow-600 bg-yellow-100'
      case 'MAINTENANCE': case 'ASSIGNED':
        return 'text-orange-600 bg-orange-100'
      case 'OFFLINE': case 'COMPLETED':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          ← Back to Fleet
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{fleet?.name || 'Fleet'}</h1>
            <p className="text-gray-600 mt-2">{fleet?.description || 'Fleet details'}</p>
            {fleet?.locus && (
              <p className="text-sm text-gray-500 mt-1">
                Location: {fleet.locus.name}
                {fleet.locus.coordinates && (
                  <span className="ml-2">
                    • {fleet.locus.coordinates.latitude.toFixed(6)}, {fleet.locus.coordinates.longitude.toFixed(6)}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(fleet?.status || '')}`}>
              {fleet?.status || 'UNKNOWN'}
            </span>
            <Link
              href={`/fleet/${fleetId}/map`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              View Map
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Activity className="w-6 h-6 mr-3 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Robots</p>
              <p className="text-2xl font-bold text-gray-900">{robots.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Activity className="w-6 h-6 mr-3 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-500">Working</p>
              <p className="text-2xl font-bold text-gray-900">
                {robots.filter((r: any) => r.status === 'WORKING').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Battery className="w-6 h-6 mr-3 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Battery</p>
              <p className="text-2xl font-bold text-gray-900">
                {robots.length > 0
                  ? Math.round(robots.reduce((sum: number, r: any) => sum + (r.batteryLevel || 0), 0) / robots.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <MapPin className="w-6 h-6 mr-3 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-500">Location</p>
              <p className="text-lg font-medium text-gray-900">{fleet?.locus?.name || 'Unknown'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Robot Positions</h2>
            <Link
              href={`/fleet/${fleetId}/map`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View Full Map →
            </Link>
          </div>
          <RobotMap
            fleetId={fleetId}
            height="500px"
            editable={hasManageFleetPermission}
            onRobotClick={hasManageFleetPermission ? handleRobotClick : undefined}
          />
        </div>
      </div>

      {/* Robot List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Robots</h2>
          <div className="space-y-4">
            {robots.map((robot: any) => {
              const bellowsData = telemetryData as { bellowsStream?: { metrics?: Array<{ robotId?: string; batteryLevel?: number }> } } | undefined
              const connection = bellowsData?.bellowsStream?.metrics?.find((m: any) => m.robotId === robot.id)
              const batteryLevel = connection?.batteryLevel ?? robot.batteryLevel ?? 0
              
              return (
                <Link
                  key={robot.id}
                  href={`/robot/${robot.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{robot.name}</h3>
                      <p className="text-sm text-gray-500">ID: {robot.id}</p>
                    </div>
                    <div className="text-right flex items-center space-x-4">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(robot.status)}`}>
                          {robot.status}
                        </span>
                        <div className="mt-2 flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                batteryLevel > 50 ? 'bg-green-500' :
                                batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${batteryLevel}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{Math.round(batteryLevel)}%</span>
                        </div>
                      </div>
                      <Link
                        href={`/robot/${robot.id}/stream`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-orange-600 hover:text-orange-800 text-sm"
                      >
                        View Stream →
                      </Link>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FleetDetailPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <FleetDetailPageContent />
    </RouteGuard>
  )
}
