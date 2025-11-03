'use client'

import { useQuery, useMutation } from '@apollo/client/react'
import { useAuth } from '@/components/AuthProvider'
import { useHasPermission } from '@/hooks/useHasPermission'
import { Permission } from '@sepulki/shared-types'
import { RouteGuard } from '@/components/RouteGuard'
import Link from 'next/link'
import { FACTORY_FLOORS_QUERY, FACTORY_FLOOR_QUERY } from '@/lib/graphql/queries'
import { DELETE_FACTORY_FLOOR_MUTATION } from '@/lib/graphql/mutations'
import { useState } from 'react'

function FactoryFloorsPageContent() {
  const { smith, loading: authLoading } = useAuth()
  const hasManageFleetPermission = useHasPermission(Permission.MANAGE_FLEET)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, loading, error, refetch } = useQuery(FACTORY_FLOORS_QUERY, {
    variables: { limit: 100, offset: 0 },
    skip: authLoading,
    fetchPolicy: 'cache-and-network',
  })

  const [deleteFactoryFloor] = useMutation(DELETE_FACTORY_FLOOR_MUTATION, {
    refetchQueries: [{ query: FACTORY_FLOORS_QUERY, variables: { limit: 100, offset: 0 } }],
    awaitRefetchQueries: true,
    onError: (error) => {
      setDeleteError(error.message)
      setTimeout(() => setDeleteError(null), 5000)
    },
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete factory floor "${name}"? This will unassign all robots from this floor.`)) {
      return
    }

    try {
      await deleteFactoryFloor({ variables: { id } })
      setDeleteError(null)
    } catch (err) {
      // Error handled in onError callback
    }
  }

  if (loading || authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading factory floors: {error.message}</p>
        </div>
      </div>
    )
  }

  const factoryFloors = data?.factoryFloors || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Factory Floors</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage factory floor blueprints and robot assignments
            </p>
          </div>
          {hasManageFleetPermission && (
            <Link
              href="/floors/new"
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              + Create Floor
            </Link>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{deleteError}</p>
        </div>
      )}

      {factoryFloors.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-600 mb-4">No factory floors found.</p>
          {hasManageFleetPermission && (
            <Link
              href="/floors/new"
              className="text-orange-600 hover:text-orange-800 underline"
            >
              Create your first factory floor
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {factoryFloors.map((floor: any) => (
            <div
              key={floor.id}
              className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
            >
              {floor.blueprintUrl && (
                <div className="h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={floor.blueprintUrl}
                    alt={floor.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide broken images
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/floors/${floor.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-orange-600"
                  >
                    {floor.name}
                  </Link>
                </div>
                {floor.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{floor.description}</p>
                )}
                <div className="flex items-center text-xs text-gray-500 mb-3 space-x-4">
                  <span>{floor.widthMeters}m × {floor.heightMeters}m</span>
                  <span>{floor.robots?.length || 0} robots</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <Link
                    href={`/floors/${floor.id}`}
                    className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                  >
                    View Details →
                  </Link>
                  {hasManageFleetPermission && (
                    <button
                      onClick={() => handleDelete(floor.id, floor.name)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FactoryFloorsPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <FactoryFloorsPageContent />
    </RouteGuard>
  )
}

