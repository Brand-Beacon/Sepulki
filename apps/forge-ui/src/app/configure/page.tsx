'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ConfigureRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to new route
    const searchParams = new URLSearchParams(window.location.search)
    const step = searchParams.get('step') || '2'
    router.replace(`/design/configure?step=${step}`)
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
