'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, ImageOverlay, useMapEvents } from 'react-leaflet'
import { Icon as LeafletIcon, LatLng, LatLngBounds, point } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useQuery, useMutation } from '@apollo/client/react'
import { FACTORY_FLOOR_QUERY } from '@/lib/graphql/queries'
import { UPDATE_ROBOT_FLOOR_POSITION_MUTATION, ASSIGN_ROBOT_TO_FLOOR_MUTATION } from '@/lib/graphql/mutations'
import Link from 'next/link'

interface FactoryFloorMapProps {
  floorId: string
  height?: string
  editable?: boolean
  onLocationUpdate?: (robotId: string, position: { positionX: number; positionY: number; positionTheta?: number }) => void
}

function MapViewUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])
  
  return null
}

function DraggableRobotMarker({
  robot,
  position,
  onDragEnd,
  draggable,
  isMobile
}: {
  robot: any
  position: [number, number]
  onDragEnd: (position: { x: number; y: number }) => void
  draggable: boolean
  isMobile: boolean
}) {
  const markerRef = useRef<any>(null)
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(position)

  useEffect(() => {
    setCurrentPosition(position)
  }, [position])

  const handleDragEnd = () => {
    if (markerRef.current) {
      const marker = markerRef.current
      const latlng = marker.getLatLng()
      // Convert from Leaflet coordinates back to floor coordinates
      // Position is in local floor coordinates (meters)
      onDragEnd({ x: latlng.lat, y: latlng.lng })
    }
  }

  // Create robot icon
  const robotIcon = useMemo(() => {
    const color = isMobile ? '#3b82f6' : '#f97316' // Blue for mobile, orange for stationary
    return new LeafletIcon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
          <text x="16" y="20" font-size="14" font-weight="bold" fill="white" text-anchor="middle">R</text>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    })
  }, [isMobile])

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

  return (
    <Marker
      ref={markerRef}
      position={currentPosition}
      icon={robotIcon}
      draggable={draggable && isMobile}
      eventHandlers={{
        dragend: handleDragEnd
      }}
    >
      <Popup maxWidth={300} className="robot-popup">
        <div className="p-2 min-w-[200px]">
          <h3 className="font-bold text-gray-900 mb-2">{robot.name}</h3>
          {draggable && isMobile && (
            <p className="text-xs text-gray-500 mb-2">Drag to move location</p>
          )}
          {!isMobile && (
            <p className="text-xs text-gray-500 mb-2">Stationary robot - click to manage tasks</p>
          )}
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium" style={{ color: statusColor }}>
                {robot.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="text-gray-700">
                {isMobile ? 'Mobile' : 'Stationary'}
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
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

export function FactoryFloorMap({
  floorId,
  height = '500px',
  editable = false,
  onLocationUpdate
}: FactoryFloorMapProps) {
  const { data, loading, error } = useQuery(FACTORY_FLOOR_QUERY, {
    variables: { id: floorId },
    fetchPolicy: 'cache-and-network'
  })

  const [updateRobotPosition] = useMutation(UPDATE_ROBOT_FLOOR_POSITION_MUTATION, {
    refetchQueries: [{ query: FACTORY_FLOOR_QUERY, variables: { id: floorId } }],
    awaitRefetchQueries: true,
  })

  const floor = data?.factoryFloor
  const robots = floor?.robots || []

  // Calculate bounds for blueprint image overlay
  // For factory floors, we'll use a custom coordinate system where
  // the floor coordinates (meters) map directly to Leaflet lat/lng
  // This allows us to position robots in floor coordinate space
  const imageBounds = useMemo(() => {
    if (!floor || !floor.blueprintUrl) return null
    
    const widthMeters = floor.widthMeters
    const heightMeters = floor.heightMeters
    // Map floor coordinates to Leaflet coordinates
    // Origin (0,0) in floor space = (0, 0) in Leaflet
    // Top-right in floor space = (heightMeters, widthMeters) in Leaflet
    // Leaflet expects bounds as [[south, west], [north, east]]
    const bounds = new LatLngBounds(
      [0, 0], // bottom-left (origin in floor coordinates)
      [heightMeters, widthMeters] // top-right (floor dimensions)
    )
    return bounds
  }, [floor])

  // Center of the map (middle of the floor in floor coordinates)
  const mapCenter = useMemo(() => {
    if (!floor) return [0, 0] as [number, number]
    // Center is at half the height and half the width
    return [floor.heightMeters / 2, floor.widthMeters / 2] as [number, number]
  }, [floor])

  const handleRobotDragEnd = async (robotId: string, position: { x: number; y: number }) => {
    if (!editable) return

    try {
      // Position from Leaflet: x = lng, y = lat
      // In our floor coordinate system: lng = positionX, lat = positionY
      await updateRobotPosition({
        variables: {
          robotId,
          position: {
            positionX: position.x, // lng in Leaflet = X in floor coordinates
            positionY: position.y, // lat in Leaflet = Y in floor coordinates
            positionTheta: 0,
          }
        }
      })

      if (onLocationUpdate) {
        onLocationUpdate(robotId, {
          positionX: position.x,
          positionY: position.y,
        })
      }
    } catch (error) {
      console.error('Failed to update robot position:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (error || !floor) {
    return (
      <div className="flex items-center justify-center bg-red-50" style={{ height }}>
        <p className="text-red-800">Error loading factory floor: {error?.message || 'Floor not found'}</p>
      </div>
    )
  }

  if (!floor.blueprintUrl) {
    return (
      <div className="flex items-center justify-center bg-gray-50" style={{ height }}>
        <p className="text-gray-600">No blueprint uploaded for this floor</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={1}
        minZoom={0}
        maxZoom={10}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        crs={undefined} // Use default CRS - we're using floor coordinates directly
      >
        {/* Blueprint image overlay */}
        {imageBounds && floor.blueprintUrl && (
          <ImageOverlay
            url={floor.blueprintUrl}
            bounds={imageBounds}
            opacity={0.8}
          />
        )}

        {/* Robot markers */}
        {robots.map((robot: any) => {
          if (robot.floorPositionX === null || robot.floorPositionY === null) {
            return null
          }

          // Floor coordinates are stored as (positionX, positionY) in meters
          // Map to Leaflet coordinates: Y becomes lat, X becomes lng
          // This matches our image bounds where floor (0,0) maps to Leaflet (0,0)
          const position: [number, number] = [robot.floorPositionY, robot.floorPositionX]
          const isMobile = robot.isMobile !== null ? robot.isMobile : true

          return (
            <DraggableRobotMarker
              key={robot.id}
              robot={robot}
              position={position}
              onDragEnd={(pos) => handleRobotDragEnd(robot.id, pos)}
              draggable={editable}
              isMobile={isMobile}
            />
          )
        })}

        <MapViewUpdater center={mapCenter} />
      </MapContainer>
    </div>
  )
}

