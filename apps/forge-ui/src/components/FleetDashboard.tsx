'use client'

import { useQuery, useSubscription } from '@apollo/client/react'
import { FLEETS_QUERY } from '@/lib/graphql/queries'
import { BELLOWS_STREAM_SUBSCRIPTION, ROBOT_STATUS_SUBSCRIPTION } from '@/lib/graphql/subscriptions'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Loader2, Wifi, WifiOff, Battery, Activity } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useHasPermission } from '@/hooks/useHasPermission'
import { Permission } from '@sepulki/shared-types'

// Dynamic import to avoid SSR issues
const RobotMap = dynamic(
  () => import('@/components/RobotMap').then((mod) => mod.RobotMap),
  { ssr: false }
)

interface FleetDashboardProps {
  className?: string
}

export function FleetDashboard({ className = '' }: FleetDashboardProps) {
  const hasManageFleetPermission = useHasPermission(Permission.MANAGE_FLEET)
  
  const { data: fleetsData, loading: fleetsLoading, error: fleetsError } = useQuery(FLEETS_QUERY, {
    pollInterval: 5000, // Poll every 5 seconds as fallback
    fetchPolicy: 'cache-first', // Use cache-first to avoid flickering on each poll
    notifyOnNetworkStatusChange: false // Don't trigger loading state on background refetches
  })

  // Get fleets with proper type guard
  const fleets = (fleetsData && typeof fleetsData === 'object' && 'fleets' in fleetsData) 
    ? (fleetsData as { fleets?: any[] }).fleets || []
    : []
  const firstFleetId = fleets.length > 0 ? fleets[0]?.id : undefined

  // Subscribe to fleet telemetry (real-time updates)
  const { data: telemetryData } = useSubscription(BELLOWS_STREAM_SUBSCRIPTION, {
    variables: { fleetId: firstFleetId },
    skip: !firstFleetId,
  })

  const [robotStatuses, setRobotStatuses] = useState<Record<string, any>>({})

  // Subscribe to individual robot status updates
  useEffect(() => {
    if (fleets.length > 0) {
      // For now, just update from telemetry stream
      // In production, would subscribe to each robot individually
      const bellowsData = telemetryData as { bellowsStream?: { metrics?: any[] } } | undefined
      if (bellowsData?.bellowsStream?.metrics) {
        setRobotStatuses((prev) => {
          // Merge with previous state to avoid unnecessary re-renders
          const statuses: Record<string, any> = { ...prev }
        bellowsData.bellowsStream.metrics.forEach((metric: any) => {
          statuses[metric.robotId] = {
            batteryLevel: metric.batteryLevel,
            healthScore: metric.healthScore,
            lastSeen: metric.timestamp,
          }
        })
          return statuses
        })
      }
    }
  }, [telemetryData, fleets.length]) // Only depend on fleets.length, not fleetsData to avoid re-renders on every poll

  // Memoize calculations to prevent unnecessary recalculations on every render
  // IMPORTANT: All hooks must be called before any conditional returns
  const allRobots = useMemo(() => fleets.flatMap((fleet: any) => fleet.robots || []), [fleets])
  
  // Calculate statistics (memoized)
  const stats = useMemo(() => {
    const activeFleets = fleets.filter((f: any) => f.status === 'ACTIVE').length
    const workingRobots = allRobots.filter((r: any) => r.status === 'WORKING').length
    const avgBattery = allRobots.length > 0
      ? Math.round(allRobots.reduce((sum: number, r: any) => sum + (r.batteryLevel || 0), 0) / allRobots.length)
      : 0
    const activeTasks = fleets.filter((f: any) => f.activeTask).length
    return { activeFleets, workingRobots, avgBattery, activeTasks }
  }, [fleets, allRobots])

  if (fleetsLoading) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        <span className="ml-3 text-gray-600">Loading fleet data...</span>
      </div>
    )
  }

  if (fleetsError) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-800 font-medium">Error loading fleet data</p>
        <p className="text-sm text-red-600 mt-1">{fleetsError.message}</p>
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

  const getConnectionStatus = (robotId: string) => {
    const status = robotStatuses[robotId]
    if (!status) return { connected: false, text: 'Unknown' }
    
    const lastSeen = status.lastSeen ? new Date(status.lastSeen) : null
    const now = new Date()
    const timeDiff = lastSeen ? now.getTime() - lastSeen.getTime() : Infinity
    const connected = timeDiff < 10000 // Connected if last seen within 10 seconds
    
    return {
      connected,
      text: connected ? 'Live' : 'Offline',
      lastSeen
    }
  }

  return (
    <div className={className}>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="text-2xl mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Fleets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeFleets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="text-2xl mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Working Robots</p>
              <p className="text-2xl font-bold text-gray-900">{stats.workingRobots}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Battery className="w-6 h-6 mr-3 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Battery</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgBattery}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Activity className="w-6 h-6 mr-3 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-500">Active Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet List and Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Fleets</h2>
              <Link
                href="/fleet/map"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View Map →
              </Link>
            </div>
            <div className="space-y-4">
              {fleets.map((fleet: any) => (
                <Link
                  key={fleet.id}
                  href={`/fleet/${fleet.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{fleet.name}</h3>
                      <p className="text-sm text-gray-500">{fleet.locus?.name || 'No location'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(fleet.status)}`}>
                        {fleet.status}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {fleet.robots?.length || 0} robots
                      </p>
                    </div>
                  </div>
                  {fleet.activeTask && (
                    <div className="mt-2 text-sm text-blue-600">
                      Current: {fleet.activeTask.name}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Robot Status */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Robots</h2>
            <div className="space-y-4">
              {allRobots.map((robot: any) => {
                const connection = getConnectionStatus(robot.id)
                const batteryLevel = robotStatuses[robot.id]?.batteryLevel ?? robot.batteryLevel ?? 0
                
                return (
                  <Link
                    key={robot.id}
                    href={`/robot/${robot.id}`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{robot.name}</h3>
                        <p className="text-sm text-gray-500">{robot.fleetId}</p>
                      </div>
                      <div className="text-right flex items-center space-x-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            {connection.connected ? (
                              <Wifi className="w-4 h-4 text-green-500" />
                            ) : (
                              <WifiOff className="w-4 h-4 text-gray-400" />
                            )}
                            <span className={`text-xs ${connection.connected ? 'text-green-600' : 'text-gray-500'}`}>
                              {connection.text}
                            </span>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(robot.status)}`}>
                            {robot.status}
                          </span>
                          <div className="mt-1 flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
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
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Stream →
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

      {/* Map View */}
      {fleets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Fleet Map</h2>
              <Link
                href="/fleet/map"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View Full Map →
              </Link>
            </div>
              <RobotMap
              fleets={fleets}
              robots={allRobots}
                height="400px"
              editable={hasManageFleetPermission}
              />
          </div>
        </div>
      )}
    </div>
  )
}

