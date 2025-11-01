'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { Icon as LeafletIcon } from 'leaflet'
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

interface RobotMarker {
  id: string
  name: string
  status: string
  batteryLevel?: number
  position: [number, number]
  lastSeen?: Date
}

interface LeafletMapProps {
  center: [number, number]
  robots: RobotMarker[]
  fleetCenter?: [number, number]
  height?: string
  className?: string
}

export function LeafletMap({
  center,
  robots,
  fleetCenter,
  height = '500px',
  className = ''
}: LeafletMapProps) {
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
          <Circle
            center={fleetCenter}
            radius={100}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
          />
        )}
        
        {robots.map((robot) => {
          const statusColor = getStatusColor(robot.status)
          const robotIcon = createRobotIcon(statusColor)
          
          return (
            <Marker
              key={robot.id}
              position={robot.position}
              icon={robotIcon}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-gray-900 mb-2">{robot.name}</h3>
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
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
        
        <MapViewUpdater center={center} />
      </MapContainer>
    </div>
  )
}

