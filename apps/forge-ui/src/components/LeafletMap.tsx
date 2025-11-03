'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline, useMapEvents } from 'react-leaflet'
import { Icon as LeafletIcon, LatLng } from 'leaflet'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet
if (typeof window !== 'undefined') {
  const DefaultIcon = new LeafletIcon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
  
  // Fix marker icon issue
  if (typeof window !== 'undefined' && (window as any).L) {
    (window as any).L.Icon.Default.prototype._getIconUrl = function(name: string) {
      if (name === 'icon-default' || name === 'shadow') {
        return 'https://unpkg.com/leaflet@1.7.1/dist/images/' + (name === 'icon-default' ? 'marker-icon.png' : 'marker-shadow.png')
      }
      return ''
    }
  }
}

// Component to handle map view updates
function MapViewUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])
  
  return null
}

// Component for draggable fleet center marker
function DraggableFleetMarker({
  position,
  fleetId,
  onDragEnd,
  draggable,
  onClick
}: {
  position: [number, number]
  fleetId?: string
  onDragEnd: (latlng: LatLng) => void
  draggable: boolean
  onClick?: () => void
}) {
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(position)

  useEffect(() => {
    setCurrentPosition(position)
  }, [position])

  // Create fleet center icon (flag icon)
  const fleetIcon = useMemo(() => {
    return new LeafletIcon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 5 L20 35 M20 5 L35 15 L20 25 Z" fill="#3b82f6" stroke="white" stroke-width="2"/>
        </svg>
      `)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    })
  }, [])

  const markerRef = useRef<any>(null)

  const handleDragEnd = () => {
    if (markerRef.current) {
      const marker = markerRef.current
      const latlng = marker.getLatLng()
      onDragEnd(latlng)
    }
  }

  return (
    <Marker
      ref={markerRef}
      position={currentPosition}
      icon={fleetIcon}
      draggable={draggable}
      eventHandlers={{
        dragend: handleDragEnd,
        click: onClick
      }}
    >
      <Popup>
        <div className="p-2">
          <p className="font-medium text-gray-900">Fleet Center</p>
          {draggable && (
            <p className="text-xs text-gray-500 mt-1">Drag to move location</p>
          )}
          {onClick && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="mt-2 text-sm text-orange-600 hover:text-orange-800 underline"
            >
              Update Location
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

// Component for animated robot marker during movement
function AnimatedRobotMarker({
  robot,
  movement,
  onComplete
}: {
  robot: RobotMarker
  movement: MovementState
  onComplete: () => void
}) {
  const [position, setPosition] = useState<[number, number]>(movement.start)
  const markerRef = useRef<any>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / movement.duration, 1)

      // Interpolate position
      const lat = movement.start[0] + (movement.target[0] - movement.start[0]) * progress
      const lng = movement.start[1] + (movement.target[1] - movement.start[1]) * progress

      const newPosition: [number, number] = [lat, lng]
      setPosition(newPosition)
      
      // Update marker position in Leaflet
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        onComplete()
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [movement, onComplete])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return '#10b981'
      case 'IDLE': return '#3b82f6'
      case 'CHARGING': return '#f59e0b'
      case 'MAINTENANCE': return '#f97316'
      case 'ERROR': return '#ef4444'
      case 'OFFLINE': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const robotIcon = useMemo(() => {
    const statusColor = getStatusColor(robot.status)
    return new LeafletIcon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="${statusColor}" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="16" r="8" fill="white"/>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    })
  }, [robot.status])

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={robotIcon}
      opacity={0.8}
    />
  )
}

interface RobotMarker {
  id: string
  name: string
  status: string
  batteryLevel?: number
  position: [number, number]
  lastSeen?: Date
}

interface MovementState {
  target: [number, number]
  start: [number, number]
  progress: number
  duration: number
  startTime: number
}

interface LeafletMapProps {
  center: [number, number]
  robots: RobotMarker[]
  fleetCenter?: [number, number]
  fleetId?: string
  fleets?: Array<{
    id: string
    name: string
    locus?: {
      coordinates?: {
        latitude?: number
        longitude?: number
        altitude?: number
      }
    }
  }>
  height?: string
  className?: string
  draggable?: boolean
  onLocationUpdate?: (type: 'fleet' | 'robot', id: string, coordinates: { latitude: number; longitude: number }) => void
  onFleetClick?: (fleetId: string, coordinates: { latitude: number; longitude: number }) => void
  onRobotClick?: (robotId: string, coordinates: { latitude: number; longitude: number }) => Promise<void> | void
}

export function LeafletMap({
  center,
  robots,
  fleetCenter,
  fleetId,
  fleets,
  height = '500px',
  className = '',
  draggable = false,
  onLocationUpdate,
  onFleetClick,
  onRobotClick
}: LeafletMapProps) {
  // State for active movements (fleet or robot animations)
  const [activeMovements, setActiveMovements] = useState<Map<string, MovementState>>(new Map())
  const [targetFlags, setTargetFlags] = useState<Map<string, [number, number]>>(new Map())

  // Helper to calculate distance in meters between two lat/lng points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000 // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Handle fleet location update
  const handleFleetDragEnd = (latlng: LatLng) => {
    if (!fleetId || !onLocationUpdate) return

    const newCoords = { latitude: latlng.lat, longitude: latlng.lng }
    
    // Calculate animation duration (5 m/s for fleet)
    const distance = fleetCenter 
      ? calculateDistance(fleetCenter[0], fleetCenter[1], latlng.lat, latlng.lng)
      : 0
    const duration = Math.max(2000, Math.min(10000, distance / 5 * 1000)) // 5 m/s, 2-10 seconds

    // Add movement animation
    setActiveMovements(prev => {
      const next = new Map(prev)
      next.set(`fleet-${fleetId}`, {
        target: [latlng.lat, latlng.lng],
        start: fleetCenter || [latlng.lat, latlng.lng],
        progress: 0,
        duration,
        startTime: Date.now()
      })
      return next
    })

    // Set target flag
    setTargetFlags(prev => {
      const next = new Map(prev)
      next.set(`fleet-${fleetId}`, [latlng.lat, latlng.lng])
      return next
    })

    // Call update callback
    onLocationUpdate('fleet', fleetId, newCoords)
  }

  // Handle robot location update
  const handleRobotDragEnd = (robotId: string, latlng: LatLng) => {
    if (!onLocationUpdate) return

    const robot = robots.find(r => r.id === robotId)
    if (!robot) return

    const newCoords = { latitude: latlng.lat, longitude: latlng.lng }
    
    // Calculate animation duration (2 m/s for robot)
    const distance = calculateDistance(robot.position[0], robot.position[1], latlng.lat, latlng.lng)
    const duration = Math.max(2000, Math.min(10000, distance / 2 * 1000)) // 2 m/s, 2-10 seconds

    // Add movement animation
    setActiveMovements(prev => {
      const next = new Map(prev)
      next.set(`robot-${robotId}`, {
        target: [latlng.lat, latlng.lng],
        start: robot.position,
        progress: 0,
        duration,
        startTime: Date.now()
      })
      return next
    })

    // Set target flag
    setTargetFlags(prev => {
      const next = new Map(prev)
      next.set(`robot-${robotId}`, [latlng.lat, latlng.lng])
      return next
    })

    // Call update callback
    onLocationUpdate('robot', robotId, newCoords)
  }

  // Complete movement animation
  const handleMovementComplete = (entityId: string) => {
    setActiveMovements(prev => {
      const next = new Map(prev)
      next.delete(entityId)
      return next
    })
    setTargetFlags(prev => {
      const next = new Map(prev)
      next.delete(entityId)
      return next
    })
  }

  // Create target flag icon
  const targetFlagIcon = useMemo(() => {
    return new LeafletIcon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="2"/>
          <path d="M16 8 L16 24 M16 8 L24 14 L16 20 Z" fill="white"/>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    })
  }, [])
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return '#10b981' // green
      case 'IDLE': return '#3b82f6' // blue
      case 'CHARGING': return '#f59e0b' // yellow
      case 'MAINTENANCE': return '#f97316' // orange
      case 'ERROR': return '#ef4444' // red
      case 'OFFLINE': return '#6b7280' // gray
      default: return '#6b7280'
    }
  }

  const getBatteryColor = (level?: number) => {
    if (!level) return '#6b7280'
    if (level > 50) return '#10b981'
    if (level > 20) return '#f59e0b'
    return '#ef4444'
  }

  // Create custom robot icon
  const createRobotIcon = (statusColor: string) => {
    return new LeafletIcon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="${statusColor}" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="16" r="8" fill="white"/>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    })
  }

  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={center}
        zoom={fleetCenter ? 16 : 13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {fleetCenter && (
          <>
          <Circle
            center={fleetCenter}
            radius={100}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
          />
            <DraggableFleetMarker
              position={fleetCenter}
              fleetId={fleetId}
              onDragEnd={handleFleetDragEnd}
              draggable={draggable}
              onClick={onFleetClick && fleetId ? () => {
                onFleetClick(fleetId, { latitude: fleetCenter[0], longitude: fleetCenter[1] })
              } : undefined}
            />
          </>
        )}

        {/* Render fleet markers for multi-fleet view */}
        {fleets && fleets.length > 0 && fleets.map((fleet: any) => {
          const fleetCoords = fleet.locus?.coordinates
          if (!fleetCoords || fleetCoords.latitude == null || fleetCoords.longitude == null) {
            return null
          }

          const position: [number, number] = [fleetCoords.latitude, fleetCoords.longitude]
          
          // Create fleet center icon (flag icon)
          const fleetIcon = useMemo(() => {
            return new LeafletIcon({
              iconUrl: `data:image/svg+xml;base64,${btoa(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 5 L20 35 M20 5 L35 15 L20 25 Z" fill="#3b82f6" stroke="white" stroke-width="2"/>
                </svg>
              `)}`,
              iconSize: [40, 40],
              iconAnchor: [20, 40],
              popupAnchor: [0, -40]
            })
          }, [])

          return (
            <Marker
              key={`fleet-${fleet.id}`}
              position={position}
              icon={fleetIcon}
              eventHandlers={{
                click: onFleetClick ? () => {
                  onFleetClick(fleet.id, { latitude: position[0], longitude: position[1] })
                } : undefined
              }}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-medium text-gray-900">{fleet.name}</p>
                  {onFleetClick && (
                    <button
                      onClick={() => {
                        onFleetClick(fleet.id, { latitude: position[0], longitude: position[1] })
                      }}
                      className="mt-2 text-sm text-orange-600 hover:text-orange-800 underline"
                    >
                      Update Location
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Render target flags */}
        {Array.from(targetFlags.entries()).map(([entityId, position]) => (
          <Marker
            key={`flag-${entityId}`}
            position={position}
            icon={targetFlagIcon}
          >
            <Popup>
              <div className="p-2">
                <p className="font-medium text-gray-900">Target Location</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render movement lines */}
        {Array.from(activeMovements.entries()).map(([entityId, movement]) => {
          const [startLat, startLng] = movement.start
          const [targetLat, targetLng] = movement.target
          return (
            <Polyline
              key={`line-${entityId}`}
              positions={[[startLat, startLng], [targetLat, targetLng]]}
              pathOptions={{ color: '#3b82f6', weight: 2, opacity: 0.6, dashArray: '10, 5' }}
            />
          )
        })}
        
        {robots.map((robot) => {
          // Check if this robot is animating
          const movement = activeMovements.get(`robot-${robot.id}`)
          const isAnimating = !!movement
          
          // If animating, don't render the static marker (animated one is rendered separately)
          if (isAnimating) {
            return null
          }
          
          const statusColor = getStatusColor(robot.status)
          const robotIcon = createRobotIcon(statusColor)
          
          return (
            <DraggableRobotMarker
              key={robot.id}
              robot={robot}
              position={robot.position}
              icon={robotIcon}
              draggable={draggable && !isAnimating}
              onDragEnd={(latlng) => handleRobotDragEnd(robot.id, latlng)}
              onLocationUpdate={onRobotClick ? async (coordinates) => {
                await onRobotClick(robot.id, coordinates)
              } : undefined}
            />
          )
        })}
        
        {/* Animated markers component - handles animation via useEffect */}
        {Array.from(activeMovements.entries()).map(([entityId, movement]) => {
          if (entityId.startsWith('robot-')) {
            const robotId = entityId.replace('robot-', '')
            const robot = robots.find(r => r.id === robotId)
            if (!robot) return null
            
            return (
              <AnimatedRobotMarker
                key={`anim-${entityId}`}
                robot={robot}
                movement={movement}
                onComplete={() => handleMovementComplete(entityId)}
              />
            )
          }
          return null
        })}
      </MapContainer>
    </div>
  )
}

// Component for location update form (inline in popup)
function LocationUpdateForm({
  currentLocation,
  onLocationUpdate,
  onCancel
}: {
  currentLocation?: { latitude: number; longitude: number }
  onLocationUpdate: (coordinates: { latitude: number; longitude: number }) => void
  onCancel: () => void
}) {
  const [inputType, setInputType] = useState<'address' | 'coordinates'>('address')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const geocodeAddress = async (addr: string): Promise<{ latitude: number; longitude: number }> => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Sepulki Fleet Management System'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to geocode address')
    }
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      throw new Error('Address not found')
    }
    
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon)
    }
  }

  const parseCoordinates = (input: string): { latitude: number; longitude: number } | null => {
    const trimmed = input.trim()
    const parts = trimmed.split(/[,\s]+/)
    
    if (parts.length !== 2) {
      return null
    }
    
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    
    if (isNaN(lat) || isNaN(lng)) {
      return null
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null
    }
    
    return { latitude: lat, longitude: lng }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    setError(null)

    try {
      let result: { latitude: number; longitude: number }

      if (inputType === 'address') {
        if (!address.trim()) {
          setError('Please enter an address')
          setLoading(false)
          return
        }
        
        result = await geocodeAddress(address)
      } else {
        if (!coordinates.trim()) {
          setError('Please enter coordinates')
          setLoading(false)
          return
        }
        
        const parsed = parseCoordinates(coordinates)
        if (!parsed) {
          setError('Invalid format. Use: latitude, longitude (e.g., 42.9634, -85.6681)')
          setLoading(false)
          return
        }
        
        result = parsed
      }

      await onLocationUpdate(result)
      
      // Reset form
      setAddress('')
      setCoordinates('')
      setError(null)
      onCancel()
    } catch (err: any) {
      setError(err.message || 'Failed to update location')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2 pt-2 border-t">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700">Update Location</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCancel()
          }}
          className="text-xs text-gray-500 hover:text-gray-700"
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        {/* Input type toggle */}
        <div className="flex space-x-2 mb-2 text-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setInputType('address')
              setError(null)
            }}
            className={`px-2 py-1 rounded ${
              inputType === 'address'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={loading}
          >
            Address
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setInputType('coordinates')
              setError(null)
            }}
            className={`px-2 py-1 rounded ${
              inputType === 'coordinates'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={loading}
          >
            Coords
          </button>
        </div>

        {/* Input field */}
        {inputType === 'address' ? (
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value)
              setError(null)
            }}
            placeholder="e.g., Grand Rapids, MI"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            disabled={loading}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <input
            type="text"
            value={coordinates}
            onChange={(e) => {
              setCoordinates(e.target.value)
              setError(null)
            }}
            placeholder="e.g., 42.9634, -85.6681"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            disabled={loading}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {error && (
          <div className="mb-2 text-xs text-red-600 bg-red-50 p-1 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (inputType === 'address' ? !address.trim() : !coordinates.trim())}
          className="w-full px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Update'}
        </button>
      </form>
    </div>
  )
}

// Component for draggable robot marker
function DraggableRobotMarker({
  robot,
  position,
  icon,
  draggable,
  onDragEnd,
  onLocationUpdate
}: {
  robot: RobotMarker
  position: [number, number]
  icon: LeafletIcon
  draggable: boolean
  onDragEnd: (latlng: LatLng) => void
  onLocationUpdate?: (coordinates: { latitude: number; longitude: number }) => void
}) {
  const markerRef = useRef<any>(null)
  const [showLocationForm, setShowLocationForm] = useState(false)
  
  const handleDragEnd = () => {
    if (markerRef.current) {
      const marker = markerRef.current
      const latlng = marker.getLatLng()
      onDragEnd(latlng)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return '#10b981'
      case 'IDLE': return '#3b82f6'
      case 'CHARGING': return '#f59e0b'
      case 'MAINTENANCE': return '#f97316'
      case 'ERROR': return '#ef4444'
      case 'OFFLINE': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getBatteryColor = (level?: number) => {
    if (!level) return '#6b7280'
    if (level > 50) return '#10b981'
    if (level > 20) return '#f59e0b'
    return '#ef4444'
  }

  const statusColor = getStatusColor(robot.status)
  const currentLocation = { latitude: position[0], longitude: position[1] }

  const handleLocationUpdate = async (coordinates: { latitude: number; longitude: number }) => {
    if (onLocationUpdate) {
      await onLocationUpdate(coordinates)
      setShowLocationForm(false)
    }
  }

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      draggable={draggable}
      eventHandlers={{
        dragend: handleDragEnd
      }}
    >
      <Popup maxWidth={300} className="robot-popup">
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-gray-900 mb-2">{robot.name}</h3>
          {draggable && (
            <p className="text-xs text-gray-500 mb-2">Drag to move location</p>
          )}
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium`} style={{ color: statusColor }}>
                        {robot.status}
                      </span>
                    </div>
                    {robot.batteryLevel !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Battery:</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${robot.batteryLevel}%`,
                                backgroundColor: getBatteryColor(robot.batteryLevel)
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{Math.round(robot.batteryLevel)}%</span>
                        </div>
                      </div>
                    )}
                    {robot.lastSeen && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Last Seen:</span>
                        <span className="text-xs text-gray-500">
                          {new Date(robot.lastSeen).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 mt-2 border-t space-x-2">
                      <Link
                        href={`/robot/${robot.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        View Details →
                      </Link>
                      <Link
                        href={`/robot/${robot.id}/stream`}
                        className="text-orange-600 hover:text-orange-800 text-xs"
                      >
                        View Stream →
                      </Link>
                    </div>

                    {/* Location Update Form */}
                    {onLocationUpdate && (
                      <div className="pt-2 mt-2 border-t">
                        {!showLocationForm ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowLocationForm(true)
                            }}
                            className="text-xs text-orange-600 hover:text-orange-800 underline"
                          >
                            Update Location
                          </button>
                        ) : (
                          <LocationUpdateForm
                            currentLocation={currentLocation}
                            onLocationUpdate={handleLocationUpdate}
                            onCancel={() => setShowLocationForm(false)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
  )
}

