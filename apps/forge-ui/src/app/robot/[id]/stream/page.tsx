'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { RobotStreamDisplay } from '@/components/RobotStreamDisplay'

// Dynamically import for better performance
const RobotStreamDisplayDynamic = dynamic(
  () => Promise.resolve({ default: RobotStreamDisplay }),
  { ssr: false }
)

function RobotStreamPageContent() {
  const params = useParams()
  const router = useRouter()
  const robotId = params.id as string

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          ← Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Stream</h1>
            <p className="text-gray-600 mt-2">Real-time camera and LiDAR feed</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href={`/robot/${robotId}`}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700"
            >
              Robot Details
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

      <div className="bg-black rounded-lg overflow-hidden shadow-lg" style={{ height: '70vh' }}>
        <RobotStreamDisplayDynamic
          robotId={robotId}
          publicAccess={true}
          className="w-full h-full"
        />
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Stream Information</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• This is a public stream for the kennel demo</p>
          <p>• Stream includes both camera and LiDAR data</p>
          <p>• Connection status is displayed in the top-left corner</p>
          <p>• Click the fullscreen icon to expand the view</p>
        </div>
      </div>
    </div>
  )
}

export default function RobotStreamPage() {
  // Public access for kennel demo - no auth required
  return <RobotStreamPageContent />
}

