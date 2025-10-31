'use client'

import { useParams, useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/RouteGuard'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { RobotStreamDisplay } from '@/components/RobotStreamDisplay'

// Dynamically import the stream display component
const RobotStreamDisplayDynamic = dynamic(
  () => Promise.resolve({ default: RobotStreamDisplay }),
  { ssr: false }
)

function KennelPageContent() {
  const params = useParams()
  const router = useRouter()
  const fleetId = params.id as string
  
  // Mock data - will be replaced with GraphQL queries
  const [robots] = useState([
    { id: '1', name: 'DogBot-Alpha', status: 'WORKING', battery: 87.5 },
    { id: '2', name: 'DogBot-Beta', status: 'IDLE', battery: 92.1 },
    { id: '3', name: 'DogBot-Gamma', status: 'WORKING', battery: 76.4 },
    { id: '4', name: 'DogBot-Delta', status: 'CHARGING', battery: 34.8 },
  ])

  const [gridLayout, setGridLayout] = useState<'2x2' | '3x3'>('2x2')
  const [selectedRobots, setSelectedRobots] = useState<string[]>(robots.slice(0, 4).map(r => r.id))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return 'bg-green-500'
      case 'IDLE': return 'bg-blue-500'
      case 'CHARGING': return 'bg-yellow-500'
      case 'OFFLINE': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          ← Back to Fleet
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏠 Kennel Live Streams</h1>
            <p className="text-gray-600 mt-2">Real-time view of all robot dogs in kennel</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={gridLayout}
              onChange={(e) => setGridLayout(e.target.value as '2x2' | '3x3')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="2x2">2x2 Grid</option>
              <option value="3x3">3x3 Grid</option>
            </select>
            <Link
              href={`/fleet/${fleetId}`}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700"
            >
              Fleet Details
            </Link>
          </div>
        </div>
      </div>

      {/* Stream Grid */}
      <div className={`grid gap-4 mb-6 ${
        gridLayout === '2x2' ? 'grid-cols-2' : 'grid-cols-3'
      }`} style={{ height: gridLayout === '2x2' ? '70vh' : '80vh' }}>
        {selectedRobots.map((robotId) => {
          const robot = robots.find(r => r.id === robotId)
          if (!robot) return null

          return (
            <div key={robotId} className="relative bg-black rounded-lg overflow-hidden shadow-lg">
              {/* Stream Display */}
              <div className="absolute inset-0">
                <RobotStreamDisplayDynamic
                  robotId={robot.id}
                  publicAccess={true}
                  className="w-full h-full"
                />
              </div>
              
              {/* Robot Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{robot.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(robot.status)}`}></div>
                      <span className="text-xs">{robot.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-300">Battery</p>
                    <p className="text-sm font-medium">{robot.battery}%</p>
                  </div>
                </div>
              </div>

              {/* Click to view individual stream */}
              <Link
                href={`/robot/${robotId}/stream`}
                className="absolute inset-0 z-10"
                title={`View ${robot.name} stream`}
              />
            </div>
          )
        })}
      </div>

      {/* Robot List */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">All Robots in Kennel</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {robots.map((robot) => (
            <div
              key={robot.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedRobots.includes(robot.id) ? 'border-orange-500 bg-orange-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => {
                if (selectedRobots.includes(robot.id)) {
                  setSelectedRobots(selectedRobots.filter(id => id !== robot.id))
                } else {
                  setSelectedRobots([...selectedRobots, robot.id])
                }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{robot.name}</h3>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(robot.status)}`}></div>
              </div>
              <p className="text-sm text-gray-500">{robot.status}</p>
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        robot.battery > 50 ? 'bg-green-500' :
                        robot.battery > 20 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${robot.battery}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">{robot.battery}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function KennelPage() {
  // For demo purposes, allow public access if in demo mode
  // Check for demo mode via environment variable or URL parameter
  const isDemoMode = typeof window !== 'undefined' && (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    (window as any).__SEPULKI_DEMO_MODE === true
  )
  
  if (isDemoMode) {
    // Public access for demo - render without auth guard
    return <KennelPageContent />
  }
  
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <KennelPageContent />
    </RouteGuard>
  )
}

