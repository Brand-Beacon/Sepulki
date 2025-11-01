'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ReviewRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Try to get design ID from localStorage or use 'new' as fallback
    const designId = localStorage.getItem('currentDesignId') || 'new'
    router.replace(`/design/${designId}/review`)
  }, [router])

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
