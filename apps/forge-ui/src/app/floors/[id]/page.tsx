'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@apollo/client/react'
import { RouteGuard } from '@/components/RouteGuard'
import { FACTORY_FLOOR_QUERY } from '@/lib/graphql/queries'
import { useHasPermission } from '@/hooks/useHasPermission'
import { Permission } from '@sepulki/shared-types'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues
const FactoryFloorMap = dynamic(
  () => import('@/components/FactoryFloorMap').then((mod) => mod.FactoryFloorMap),
  { ssr: false }
)

function FactoryFloorDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const floorId = params.id as string
  const hasManageFleetPermission = useHasPermission(Permission.MANAGE_FLEET)

  const { data, loading, error } = useQuery(FACTORY_FLOOR_QUERY, {
    variables: { id: floorId },
    fetchPolicy: 'cache-and-network',
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <span className="ml-3 text-gray-600">Loading factory floor...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Error loading factory floor</p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
          >
            ← Back to Factory Floors
          </button>
        </div>
      </div>
    )
  }

  const floor = data?.factoryFloor
  const robots = floor?.robots || []

  if (!floor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Factory floor not found</p>
        </div>
      </div>
    )
  }

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
          ← Back to Factory Floors
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{floor.name}</h1>
            {floor.description && (
              <p className="text-gray-600 mt-2">{floor.description}</p>
            )}
            <div className="flex items-center text-sm text-gray-500 mt-2 space-x-4">
              <span>{floor.widthMeters}m × {floor.heightMeters}m</span>
              <span>Scale: {floor.scaleFactor}px/m</span>
              <span>{robots.length} robot{robots.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          {hasManageFleetPermission && (
            <Link
              href={`/floors/${floor.id}/edit`}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Edit Floor
            </Link>
          )}
        </div>
      </div>

      {/* Factory Floor Map */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <FactoryFloorMap
            floorId={floorId}
            height="600px"
            editable={hasManageFleetPermission}
          />
        </div>
      </div>

      {/* Robots List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Robots on Floor</h2>
        </div>
        {robots.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>No robots assigned to this floor.</p>
            {hasManageFleetPermission && (
              <p className="text-sm mt-2">
                <Link href={`/floors/${floor.id}/edit`} className="text-orange-600 hover:text-orange-800 underline">
                  Assign robots to this floor
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {robots.map((robot: any) => (
              <div key={robot.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      href={`/robot/${robot.id}`}
                      className="text-lg font-medium text-gray-900 hover:text-orange-600"
                    >
                      {robot.name}
                    </Link>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(robot.status)}`}>
                      {robot.status}
                    </span>
                    {robot.isMobile !== null && robot.isMobile !== undefined && (
                      <span className="text-xs text-gray-500">
                        {robot.isMobile ? 'Mobile' : 'Stationary'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    {robot.floorPositionX !== null && robot.floorPositionY !== null && (
                      <span>
                        Position: ({robot.floorPositionX.toFixed(2)}m, {robot.floorPositionY.toFixed(2)}m)
                      </span>
                    )}
                    {robot.batteryLevel !== null && robot.batteryLevel !== undefined && (
                      <span>Battery: {Math.round(robot.batteryLevel)}%</span>
                    )}
                    {robot.healthScore !== null && robot.healthScore !== undefined && (
                      <span>Health: {Math.round(robot.healthScore)}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FactoryFloorDetailPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <FactoryFloorDetailPageContent />
    </RouteGuard>
  )
}

