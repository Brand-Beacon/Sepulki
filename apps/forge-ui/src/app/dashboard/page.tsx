'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect old /dashboard route to /fleet
export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/fleet')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Fleet Dashboard...</p>
      </div>
    </div>
  )
}
