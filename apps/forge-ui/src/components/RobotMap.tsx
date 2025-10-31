'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { Icon, LatLng } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useQuery, useSubscription } from '@apollo/client/react'
import { FLEET_QUERY } from '@/lib/graphql/queries'
import { BELLOWS_STREAM_SUBSCRIPTION } from '@/lib/graphql/subscriptions'
import { MapPin, Battery, Activity, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Leaflet
const MapContainerDynamic = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayerDynamic = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const MarkerDynamic = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const PopupDynamic = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

const CircleDynamic = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
)

interface RobotMapProps {
  fleetId?: string
  robots?: Array<{
    id: string
    name: string
    status: string
    batteryLevel?: number
    pose?: {
      position?: {
        x: number
        y: number
        z: number
      }
    }
    lastSeen?: Date
  }>
  className?: string
  height?: string
}

export function RobotMap({
  fleetId,
  robots = [],
  className = '',
  height = '500px'
}: RobotMapProps) {
  const [robotPositions, setRobotPositions] = useState<Record<string, { lat: number; lng: number }>>({})
  const [fleetCenter, setFleetCenter] = useState<[number, number] | null>(null)

  // Fetch fleet data if fleetId provided
  const { data: fleetData, loading: fleetLoading } = useQuery(FLEET_QUERY, {
    variables: { id: fleetId },
    skip: !fleetId,
    fetchPolicy: 'cache-and-network'
  })

  // Subscribe to real-time telemetry
  const { data: telemetryData } = useSubscription(BELLOWS_STREAM_SUBSCRIPTION, {
    variables: { fleetId: fleetId || fleetData?.fleet?.id },
    skip: !fleetId && !fleetData?.fleet?.id,
  })

  // Get robots from fleet or props
  const fleetRobots = fleetData?.fleet?.robots || robots

  // Convert robot poses to GPS coordinates
  // For now, use fleet locus coordinates as base and add pose offsets
  useEffect(() => {
    if (fleetData?.fleet?.locus?.coordinates) {
      const baseLat = fleetData.fleet.locus.coordinates.latitude
      const baseLng = fleetData.fleet.locus.coordinates.longitude
      
      // Set fleet center
      setFleetCenter([baseLat, baseLng])
      
      // Convert robot poses to GPS coordinates
      const positions: Record<string, { lat: number; lng: number }> = {}
      
      fleetRobots.forEach((robot: any) => {
        if (robot.pose?.position) {
          // Convert local coordinates to GPS offset
          // Simple conversion: 1 meter ≈ 0.000009 degrees latitude
          const offsetLat = robot.pose.position.y * 0.000009
          const offsetLng = robot.pose.position.x * 0.000009 / Math.cos(baseLat * Math.PI / 180)
          
          positions[robot.id] = {
            lat: baseLat + offsetLat,
            lng: baseLng + offsetLng
          }
        } else {
          // Use fleet center with small random offset for visibility
          positions[robot.id] = {
            lat: baseLat + (Math.random() - 0.5) * 0.001,
            lng: baseLng + (Math.random() - 0.5) * 0.001
          }
        }
      })
      
      setRobotPositions(positions)
    } else if (fleetRobots.length > 0) {
      // Fallback: Use default center (San Francisco) if no fleet coordinates
      const defaultCenter: [number, number] = [37.7749, -122.4194]
      setFleetCenter(defaultCenter)
      
      const positions: Record<string, { lat: number; lng: number }> = {}
      fleetRobots.forEach((robot: any, index: number) => {
        positions[robot.id] = {
          lat: defaultCenter[0] + (Math.random() - 0.5) * 0.01,
          lng: defaultCenter[1] + (Math.random() - 0.5) * 0.01
        }
      })
      setRobotPositions(positions)
    }
  }, [fleetData, fleetRobots])

  // Update positions from telemetry stream
  useEffect(() => {
    if (telemetryData?.bellowsStream?.metrics) {
      const updatedPositions = { ...robotPositions }
      
      telemetryData.bellowsStream.metrics.forEach((metric: any) => {
        if (metric.pose?.position) {
          const baseLat = fleetData?.fleet?.locus?.coordinates?.latitude || 37.7749
          const baseLng = fleetData?.fleet?.locus?.coordinates?.longitude || -122.4194
          
          const offsetLat = metric.pose.position.y * 0.000009
          const offsetLng = metric.pose.position.x * 0.000009 / Math.cos(baseLat * Math.PI / 180)
          
          updatedPositions[metric.robotId] = {
            lat: baseLat + offsetLat,
            lng: baseLng + offsetLng
          }
        }
      })
      
      setRobotPositions(updatedPositions)
    }
  }, [telemetryData, fleetData])

  // Calculate map bounds
  const bounds = useMemo(() => {
    const positions = Object.values(robotPositions)
    if (positions.length === 0) return null
    
    const lats = positions.map(p => p.lat)
    const lngs = positions.map(p => p.lng)
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    }
  }, [robotPositions])


  if (typeof window === 'undefined') {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }

  if (!fleetCenter) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">No fleet location data available</p>
      </div>
    )
  }

  // Prepare robot markers
  const robotMarkers = fleetRobots
    .filter((robot: any) => robotPositions[robot.id])
    .map((robot: any) => {
      const position = robotPositions[robot.id]
      const batteryLevel = telemetryData?.bellowsStream?.metrics?.find((m: any) => m.robotId === robot.id)?.batteryLevel || robot.batteryLevel || 0
      
      return {
        id: robot.id,
        name: robot.name,
        status: robot.status,
        batteryLevel,
        position: [position.lat, position.lng] as [number, number],
        lastSeen: robot.lastSeen
      }
    })

  const fleetCenterCoords = fleetData?.fleet?.locus?.coordinates
    ? [fleetData.fleet.locus.coordinates.latitude, fleetData.fleet.locus.coordinates.longitude] as [number, number]
    : undefined

  return (
    <div className={`rounded-lg overflow-hidden border ${className}`} style={{ height }}>
      <LeafletMap
        center={fleetCenter}
        robots={robotMarkers}
        fleetCenter={fleetCenterCoords}
        height={height}
      />
    </div>
  )
}

