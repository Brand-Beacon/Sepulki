'use client'

import { useParams, useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/RouteGuard'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useQuery, useSubscription } from '@apollo/client/react'
import { ROBOT_QUERY, ROBOT_TELEMETRY_QUERY } from '@/lib/graphql/queries'
import { ROBOT_STATUS_SUBSCRIPTION } from '@/lib/graphql/subscriptions'
import { BatteryChart } from '@/components/charts/BatteryChart'
import { HealthGauge } from '@/components/charts/HealthGauge'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { TaskProgress } from '@/components/charts/TaskProgress'

type TimeRange = '1h' | '6h' | '24h' | '7d'

function RobotDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const { smith } = useAuth()
  const robotId = params.id as string
  const [timeRange, setTimeRange] = useState<TimeRange>('1h')

  // Query robot details
  const { data: robotData, loading: robotLoading, error: robotError } = useQuery(ROBOT_QUERY, {
    variables: { id: robotId },
    pollInterval: 5000, // Poll every 5 seconds as fallback
  })

  // Query telemetry data
  const { data: telemetryData, loading: telemetryLoading } = useQuery(ROBOT_TELEMETRY_QUERY, {
    variables: {
      robotId,
      timeRange,
      limit: 100
    },
    pollInterval: 5000,
  })

  // Subscribe to real-time robot status updates
  const { data: subscriptionData } = useSubscription(ROBOT_STATUS_SUBSCRIPTION, {
    variables: { robotId },
  })

  // Merge subscription data with query data
  const robot = subscriptionData?.robotStatus || robotData?.robot
  const telemetry = telemetryData?.robotTelemetry || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return 'text-green-600 bg-green-100'
      case 'IDLE': return 'text-blue-600 bg-blue-100'
      case 'CHARGING': return 'text-yellow-600 bg-yellow-100'
      case 'MAINTENANCE': return 'text-orange-600 bg-orange-100'
      case 'OFFLINE': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTaskProgress = () => {
    if (!robot?.currentIngot) return 0
    // Calculate progress based on ingot status
    const statusMap: Record<string, number> = {
      'PENDING': 10,
      'BUILDING': 50,
      'TESTING': 75,
      'READY': 100,
      'DEPLOYED': 100,
      'FAILED': 0,
    }
    return statusMap[robot.currentIngot.status] || 0
  }

  if (robotLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading robot details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (robotError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Robot</h2>
          <p className="text-red-700">{robotError.message}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-red-600 hover:text-red-800 font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!robot) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-900 mb-2">Robot Not Found</h2>
          <p className="text-yellow-700">The robot with ID "{robotId}" could not be found.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-yellow-600 hover:text-yellow-800 font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          ← Back to Fleet
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{robot.name}</h1>
            <p className="text-gray-600 mt-2">Robot ID: {robot.id}</p>
          </div>
          <div className="flex space-x-4">
            <Link
              href={`/robot/${robotId}/stream`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              View Stream
            </Link>
            <Link
              href={`/tasks/upload?robotId=${robotId}`}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700"
            >
              Upload Program
            </Link>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Time Range:</span>
        {(['1h', '6h', '24h', '7d'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Status Overview */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Status Overview</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Status</p>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(robot.status)}`}>
                  {robot.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Battery Level</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        robot.batteryLevel > 50 ? 'bg-green-500' :
                        robot.batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${robot.batteryLevel}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{robot.batteryLevel}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Health Score</p>
                <p className="text-2xl font-bold text-gray-900">{robot.healthScore}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Last Seen</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(robot.lastSeen).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Battery History Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Battery History</h2>
            {telemetryLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : telemetry.length > 0 ? (
              <BatteryChart data={telemetry} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No telemetry data available for this time range
              </div>
            )}
          </div>

          {/* Performance Metrics Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h2>
            {telemetryLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : telemetry.length > 0 && telemetry[0].performance ? (
              <PerformanceChart data={telemetry} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No performance data available for this time range
              </div>
            )}
          </div>

          {/* Current Task */}
          {robot.currentIngot && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Current Task</h2>
              <TaskProgress
                taskName={`Build v${robot.currentIngot.version}`}
                progress={getTaskProgress()}
                status={robot.currentIngot.status}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Health Score Gauge */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Health Score</h2>
            <HealthGauge healthScore={robot.healthScore} />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/robot/${robotId}/stream`}
                className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 text-center"
              >
                View Live Stream
              </Link>
              <Link
                href={`/tasks/upload?robotId=${robotId}`}
                className="block w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 text-center"
              >
                Upload Program
              </Link>
              <Link
                href={`/tasks/new?robotId=${robotId}`}
                className="block w-full bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 text-center"
              >
                Create Task
              </Link>
            </div>
          </div>

          {/* Robot Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Robot Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Robot ID</span>
                <p className="text-sm font-mono text-gray-900">{robot.id}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Sepulka ID</span>
                <p className="text-sm font-mono text-gray-900">{robot.sepulkaId || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Fleet ID</span>
                <p className="text-sm font-mono text-gray-900">{robot.fleetId}</p>
              </div>
              {robot.pose && (
                <>
                  <div>
                    <span className="text-sm text-gray-500">Position</span>
                    <p className="text-xs font-mono text-gray-900">
                      Lat: {robot.pose.position?.latitude?.toFixed(6)}<br />
                      Lng: {robot.pose.position?.longitude?.toFixed(6)}<br />
                      Alt: {robot.pose.position?.altitude?.toFixed(2)}m
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Orientation</span>
                    <p className="text-xs font-mono text-gray-900">{robot.pose.orientation?.toFixed(2)}°</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RobotDetailPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <RobotDetailPageContent />
    </RouteGuard>
  )
}
