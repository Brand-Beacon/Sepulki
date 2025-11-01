'use client'

import { useEffect, useState } from 'react'
import { File, MapPin, Navigation } from 'lucide-react'

interface RoutePreviewProps {
  file: File | null
}

interface ParsedRoute {
  waypoints?: Array<{
    lat?: number
    lng?: number
    x?: number
    y?: number
    sequence?: number
  }>
  points?: Array<{
    lat?: number
    lng?: number
  }>
}

export function RoutePreview({ file }: RoutePreviewProps) {
  const [parsedRoute, setParsedRoute] = useState<ParsedRoute | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setParsedRoute(null)
      setError(null)
      return
    }

    const parseFile = async () => {
      try {
        const text = await file.text()
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

        if (ext === '.json') {
          const data = JSON.parse(text)
          setParsedRoute(data)
          setError(null)
        } else if (ext === '.gpx') {
          // Basic GPX parsing - extract waypoints
          const parser = new DOMParser()
          const xml = parser.parseFromString(text, 'text/xml')
          const waypoints = Array.from(xml.querySelectorAll('wpt, trkpt')).map((pt, idx) => {
            const lat = parseFloat(pt.getAttribute('lat') || '0')
            const lng = parseFloat(pt.getAttribute('lon') || '0')
            return { lat, lng, sequence: idx + 1 }
          })
          setParsedRoute({ waypoints })
          setError(null)
        } else {
          // For YAML, just show raw content preview
          setParsedRoute({ waypoints: [] })
          setError(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file')
        setParsedRoute(null)
      }
    }

    parseFile()
  }, [file])

  if (!file) return null

  const waypoints: Array<{
    lat?: number
    lng?: number
    x?: number
    y?: number
    sequence?: number
  }> = parsedRoute?.waypoints || parsedRoute?.points || []

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center space-x-2 mb-4">
        <File className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-bold text-gray-900">File Preview</h3>
      </div>

      {error ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            {error} - File will be uploaded but may need manual review.
          </p>
        </div>
      ) : waypoints.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Navigation className="w-4 h-4" />
            <span>{waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''} found</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {waypoints.slice(0, 10).map((wp, idx) => (
              <div key={idx} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Waypoint {wp.sequence || idx + 1}
                  </p>
                  <p className="text-xs text-gray-500">
                    {wp.lat !== undefined && wp.lng !== undefined
                      ? `Lat: ${wp.lat.toFixed(6)}, Lng: ${wp.lng.toFixed(6)}`
                      : wp.x !== undefined && wp.y !== undefined
                      ? `X: ${wp.x.toFixed(2)}, Y: ${wp.y.toFixed(2)}`
                      : 'Position data'}
                  </p>
                </div>
              </div>
            ))}
            {waypoints.length > 10 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                +{waypoints.length - 10} more waypoints
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            File ready for upload. Preview not available for this file type.
          </p>
        </div>
      )}
    </div>
  )
}

