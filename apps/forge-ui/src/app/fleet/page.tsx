'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { RouteGuard } from '@/components/RouteGuard'
import { FleetDashboard } from '@/components/FleetDashboard'
import Link from 'next/link'

function FleetPageContent() {
  const { smith } = useAuth()
  const searchParams = useSearchParams()
  const deploySepulkaId = searchParams.get('deploy')

  useEffect(() => {
    // If there's a deployment pending from configure page, show notification
    if (deploySepulkaId) {
      // Could show a toast or modal here
      console.log('Deployment pending for sepulka:', deploySepulkaId)
    }
  }, [deploySepulkaId])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              ⚒️ Fleet Dashboard
              {smith && (
                <span className="ml-4 text-lg font-normal text-gray-600">
                  Welcome, {smith.name}
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-2">Monitor and manage your robot fleets in real-time</p>
          </div>
        </div>
        {deploySepulkaId && (
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-800 font-medium">🚀 Ready to Deploy</p>
                <p className="text-sm text-orange-600">Select a fleet below to deploy your robot design</p>
              </div>
              <Link
                href={`/design/${deploySepulkaId}/review`}
                className="text-orange-600 hover:text-orange-800 text-sm font-medium"
              >
                Continue Deployment →
              </Link>
            </div>
          </div>
        )}
      </div>

      <FleetDashboard />
    </div>
  )
}

export default function FleetPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      }>
        <FleetPageContent />
      </Suspense>
    </RouteGuard>
  );
}
