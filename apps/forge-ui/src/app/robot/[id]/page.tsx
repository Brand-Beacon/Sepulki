'use client'

import { useParams, useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/RouteGuard'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useState } from 'react'

function RobotDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const { smith } = useAuth()
  const robotId = params.id as string
  
  // Mock data - will be replaced with GraphQL queries
  const [robot] = useState({
    id: robotId,
    name: 'DevBot-Alpha',
    status: 'WORKING',
    battery: 87.5,
    healthScore: 95,
    fleet: 'Dev Fleet Alpha',
    fleetId: '1',
    currentTask: 'Assembly Testing',
    lastSeen: new Date().toISOString()
  })

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
            <p className="text-gray-600 mt-2">Fleet: {robot.fleet}</p>
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
                        robot.battery > 50 ? 'bg-green-500' :
                        robot.battery > 20 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${robot.battery}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{robot.battery}%</span>
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

          {/* Current Task */}
          {robot.currentTask && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Current Task</h2>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="font-medium text-gray-900">{robot.currentTask}</p>
                <p className="text-sm text-gray-600 mt-2">In Progress</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
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
                <span className="text-sm text-gray-500">Fleet</span>
                <p className="text-sm font-medium text-gray-900">{robot.fleet}</p>
              </div>
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

