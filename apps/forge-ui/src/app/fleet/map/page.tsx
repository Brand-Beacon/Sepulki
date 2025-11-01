'use client'

import { useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/RouteGuard'
import { RobotMap } from '@/components/RobotMap'
import { useQuery } from '@apollo/client/react'
import { FLEETS_QUERY } from '@/lib/graphql/queries'
import { Loader2, MapPin } from 'lucide-react'
import { useState } from 'react'

function AllFleetsMapPageContent() {
  const router = useRouter()
  const [selectedFleetId, setSelectedFleetId] = useState<string | null>(null)

  const { data, loading, error } = useQuery(FLEETS_QUERY, {
    fetchPolicy: 'cache-and-network'
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <span className="ml-3 text-gray-600">Loading all fleets map...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Error loading fleets map</p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  const fleets = (data && typeof data === 'object' && 'fleets' in data) 
    ? (data as { fleets?: any[] }).fleets || []
    : []
  const allRobots = fleets.flatMap((fleet: any) => fleet.robots || [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <MapPin className="w-8 h-8 mr-3 text-orange-600" />
          All Fleets Map
        </h1>
        <p className="text-gray-600 mt-2">Real-time GPS visualization of all robot fleets</p>
      </div>

      {fleets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Fleet
          </label>
          <select
            value={selectedFleetId || ''}
            onChange={(e) => setSelectedFleetId(e.target.value || null)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">All Fleets</option>
            {fleets.map((fleet: any) => (
              <option key={fleet.id} value={fleet.id}>
                {fleet.name} ({fleet.robots?.length || 0} robots)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {selectedFleetId ? (
          <RobotMap
            fleetId={selectedFleetId}
            height="600px"
          />
        ) : (
          <RobotMap
            robots={allRobots}
            height="600px"
          />
        )}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Fleet Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Fleets</p>
            <p className="text-2xl font-bold text-gray-900">{fleets.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Robots</p>
            <p className="text-2xl font-bold text-gray-900">{allRobots.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Robots</p>
            <p className="text-2xl font-bold text-gray-900">
              {allRobots.filter((r: any) => r.status === 'WORKING').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AllFleetsMapPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <AllFleetsMapPageContent />
    </RouteGuard>
  )
}

