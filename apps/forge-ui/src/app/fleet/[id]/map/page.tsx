'use client'

import { useParams, useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/RouteGuard'
import { RobotMap } from '@/components/RobotMap'
import { useQuery } from '@apollo/client/react'
import { FLEET_QUERY } from '@/lib/graphql/queries'
import { Loader2, MapPin, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function FleetMapPageContent() {
  const params = useParams()
  const router = useRouter()
  const fleetId = params.id as string

  const { data, loading, error } = useQuery(FLEET_QUERY, {
    variables: { id: fleetId },
    fetchPolicy: 'cache-and-network'
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
        />
      </div>

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

