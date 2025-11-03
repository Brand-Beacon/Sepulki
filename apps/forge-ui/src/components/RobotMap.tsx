'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { Icon, LatLng } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useQuery, useSubscription, useMutation } from '@apollo/client/react'
import { FLEET_QUERY, FLEETS_QUERY } from '@/lib/graphql/queries'
import { UPDATE_FLEET_LOCATION_MUTATION, UPDATE_ROBOT_LOCATION_MUTATION } from '@/lib/graphql/mutations'
import { BELLOWS_STREAM_SUBSCRIPTION } from '@/lib/graphql/subscriptions'
import { MapPin, Battery, Activity, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { LeafletMap } from './LeafletMap'

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
    robots?: Array<any>
  }>
  robots?: Array<{
    id: string
    name: string
    status: string
    batteryLevel?: number
    fleetId?: string
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
  editable?: boolean
  onLocationUpdate?: (type: 'fleet' | 'robot', id: string, coordinates: { latitude: number; longitude: number }) => void
  onFleetClick?: (fleetId: string, coordinates: { latitude: number; longitude: number }) => void
  onRobotClick?: (robotId: string, coordinates: { latitude: number; longitude: number }) => Promise<void> | void
}

export function RobotMap({
  fleetId,
  fleets,
  robots = [],
  className = '',
  height = '500px',
  editable = false,
  onLocationUpdate,
  onFleetClick,
  onRobotClick
}: RobotMapProps) {
  const [robotPositions, setRobotPositions] = useState<Record<string, { lat: number; lng: number }>>({})
  const [fleetCenter, setFleetCenter] = useState<[number, number] | null>(null)
  // Track pending location updates to keep markers at target position until refetch completes
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, { lat: number; lng: number }>>(new Map())

  // Fetch fleet data if fleetId provided
  const { data: fleetData, loading: fleetLoading } = useQuery(FLEET_QUERY, {
    variables: { id: fleetId },
    skip: !fleetId,
    fetchPolicy: 'cache-and-network'
  })

  // Subscribe to real-time telemetry
    const fleet = (fleetData && typeof fleetData === 'object' && 'fleet' in fleetData) 
      ? (fleetData as { fleet?: { id?: string; robots?: any[]; locus?: { coordinates?: { latitude?: number; longitude?: number; altitude?: number } } } }).fleet 
      : undefined
  const { data: telemetryData } = useSubscription(BELLOWS_STREAM_SUBSCRIPTION, {
    variables: { fleetId: fleetId || fleet?.id },
    skip: !fleetId && !fleet?.id,
  })

  // Get robots from fleet or props
  const fleetRobots = fleet?.robots || robots

  // Create a map of fleetId -> locus coordinates for multi-fleet view
  const fleetLocationMap = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>()
    if (fleets) {
      fleets.forEach((f: any) => {
        if (f.locus?.coordinates?.latitude != null && f.locus?.coordinates?.longitude != null) {
          map.set(f.id, {
            lat: f.locus.coordinates.latitude,
            lng: f.locus.coordinates.longitude
          })
        }
      })
    } else if (fleet?.locus?.coordinates?.latitude != null && fleet?.locus?.coordinates?.longitude != null) {
      map.set(fleet.id, {
        lat: fleet.locus.coordinates.latitude,
        lng: fleet.locus.coordinates.longitude
      })
    }
    return map
  }, [fleets, fleet])
  
  // Add a key to track when fleets/fleet data changes to force recalculation
  const fleetDataKey = useMemo(() => {
    // Create a key from fleet locations and robot poses to detect changes
    const fleetKeys = fleets && Array.isArray(fleets) ? fleets.map((f: any) => 
      `${f.id}:${f.locus?.coordinates?.latitude},${f.locus?.coordinates?.longitude}`
    ).join('|') : ''
    const fleetKey = fleet ? 
      `${fleet.id}:${fleet.locus?.coordinates?.latitude},${fleet.locus?.coordinates?.longitude}` : ''
    const robotKeys = fleetRobots.map((r: any) => 
      `${r.id}:${r.pose?.position?.x},${r.pose?.position?.y}`
    ).join('|')
    return `${fleetKeys}|${fleetKey}|${robotKeys}`
  }, [fleets, fleet, fleetRobots])

  // Convert robot poses to GPS coordinates
  // For now, use fleet locus coordinates as base and add pose offsets
  useEffect(() => {
    // Case 1: Single fleet with locus coordinates
    if (fleet?.locus?.coordinates?.latitude != null && fleet?.locus?.coordinates?.longitude != null) {
      const baseLat = fleet.locus.coordinates.latitude
      const baseLng = fleet.locus.coordinates.longitude
      
      // Validate fleet coordinates are valid numbers
      if (!isNaN(baseLat) && !isNaN(baseLng) && isFinite(baseLat) && isFinite(baseLng)) {
        // Set fleet center
        setFleetCenter([baseLat, baseLng])
        
        // Convert robot poses to GPS coordinates
        const positions: Record<string, { lat: number; lng: number }> = {}
        
        fleetRobots.forEach((robot: any) => {
          // Robot pose should now have GPS coordinates (latitude, longitude) from GraphQL
          // Check if pose has valid GPS coordinates
          const hasValidPose = robot.pose?.position && 
            typeof robot.pose.position.latitude === 'number' && 
            typeof robot.pose.position.longitude === 'number' &&
            !isNaN(robot.pose.position.latitude) &&
            !isNaN(robot.pose.position.longitude)
          
          if (hasValidPose) {
            // Use GPS coordinates directly from GraphQL
            const lat = robot.pose.position.latitude
            const lng = robot.pose.position.longitude
            
            // Only set position if coordinates are valid numbers
            if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
              positions[robot.id] = { lat, lng }
            } else {
              // Use fleet center with small random offset for visibility
              positions[robot.id] = {
                lat: baseLat + (Math.random() - 0.5) * 0.001,
                lng: baseLng + (Math.random() - 0.5) * 0.001
              }
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
      } else {
        // Invalid fleet coordinates - skip setting positions
        console.warn('Invalid fleet coordinates:', baseLat, baseLng)
      }
    } 
    // Case 2: Multiple fleets - calculate center from all fleet locations
    else if (fleets && fleets.length > 0 && fleetLocationMap.size > 0) {
      const locations = Array.from(fleetLocationMap.values())
      if (locations.length > 0) {
        // Calculate average center of all fleet locations
        const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length
        const avgLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length
        
        // Validate calculated center coordinates
        if (!isNaN(avgLat) && !isNaN(avgLng) && isFinite(avgLat) && isFinite(avgLng)) {
          setFleetCenter([avgLat, avgLng])
          
          // Map each robot to its fleet's location
          const positions: Record<string, { lat: number; lng: number }> = {}
          fleetRobots.forEach((robot: any) => {
            // Find robot's fleet location
            const robotFleet = fleets.find((f: any) => f.robots?.some((r: any) => r.id === robot.id))
            const fleetLoc = robotFleet ? fleetLocationMap.get(robotFleet.id) : null
            
            if (fleetLoc) {
              // Robot pose should now have GPS coordinates (latitude, longitude) from GraphQL
              // Check if pose has valid GPS coordinates
              const hasValidPose = robot.pose?.position && 
                typeof robot.pose.position.latitude === 'number' && 
                typeof robot.pose.position.longitude === 'number' &&
                !isNaN(robot.pose.position.latitude) &&
                !isNaN(robot.pose.position.longitude)
              
              if (hasValidPose) {
                // Use GPS coordinates directly from GraphQL
                const lat = robot.pose.position.latitude
                const lng = robot.pose.position.longitude
                
                // Only set position if coordinates are valid numbers
                if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
                  positions[robot.id] = { lat, lng }
                } else {
                  // Use fleet location with small random offset for visibility
                  positions[robot.id] = {
                    lat: fleetLoc.lat + (Math.random() - 0.5) * 0.001,
                    lng: fleetLoc.lng + (Math.random() - 0.5) * 0.001
                  }
                }
              } else {
                // Use fleet location with small random offset for visibility
                positions[robot.id] = {
                  lat: fleetLoc.lat + (Math.random() - 0.5) * 0.001,
                  lng: fleetLoc.lng + (Math.random() - 0.5) * 0.001
                }
              }
            } else {
              // Fallback to average center if fleet not found
              positions[robot.id] = {
                lat: avgLat + (Math.random() - 0.5) * 0.01,
                lng: avgLng + (Math.random() - 0.5) * 0.01
              }
            }
          })
          setRobotPositions(positions)
          
          // Clear pending fleet updates if the fleet position in the data matches the pending position
          setPendingUpdates(prev => {
            const next = new Map(prev)
            prev.forEach((pendingPos, key) => {
              if (key.startsWith('fleet-')) {
                const fleetId = key.replace('fleet-', '')
                const fleet = fleets.find((f: any) => f.id === fleetId)
                if (fleet?.locus?.coordinates?.latitude != null && fleet?.locus?.coordinates?.longitude != null) {
                  const actualLat = fleet.locus.coordinates.latitude
                  const actualLng = fleet.locus.coordinates.longitude
                  // If actual position matches pending position (within small tolerance), clear it
                  const latDiff = Math.abs(actualLat - pendingPos.lat)
                  const lngDiff = Math.abs(actualLng - pendingPos.lng)
                  if (latDiff < 0.0001 && lngDiff < 0.0001) {
                    next.delete(key)
                  }
                }
              }
            })
            return next
          })
        } else {
          // Invalid calculated center - skip setting positions
          console.warn('Invalid calculated fleet center:', avgLat, avgLng)
        }
      }
    } 
    // Case 3: Fallback if no fleet coordinates available
    else if (fleetRobots.length > 0) {
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
      
      // Clear pending updates for robots that now have positions matching their target
      // Check if any pending robot updates have been reflected in the recalculated positions
      setPendingUpdates(prev => {
        const next = new Map(prev)
        prev.forEach((pendingPos, key) => {
          if (key.startsWith('robot-')) {
            const robotId = key.replace('robot-', '')
            const calculatedPos = positions[robotId]
            // Clear pending update if calculated position matches target (within small tolerance)
            if (calculatedPos) {
              const latDiff = Math.abs(calculatedPos.lat - pendingPos.lat)
              const lngDiff = Math.abs(calculatedPos.lng - pendingPos.lng)
              // If position matches within ~10 meters, clear pending update
              if (latDiff < 0.0001 && lngDiff < 0.0001) {
                next.delete(key)
              }
            }
          }
        })
        return next
      })
    }
  }, [fleetData, fleetRobots, fleets, fleetLocationMap, fleet, fleetDataKey])

  // Update positions from telemetry stream
  useEffect(() => {
    const bellowsData = telemetryData as { bellowsStream?: { metrics?: any[] } } | undefined
    if (bellowsData?.bellowsStream?.metrics) {
      const updatedPositions = { ...robotPositions }
      
      bellowsData.bellowsStream.metrics.forEach((metric: any) => {
        // Telemetry should have GPS coordinates (latitude, longitude) from GraphQL
        // Check if pose has valid GPS coordinates
        const hasValidPose = metric.pose?.position && 
          typeof metric.pose.position.latitude === 'number' && 
          typeof metric.pose.position.longitude === 'number' &&
          !isNaN(metric.pose.position.latitude) &&
          !isNaN(metric.pose.position.longitude)
        
        if (hasValidPose) {
          // Use GPS coordinates directly
          const lat = metric.pose.position.latitude
          const lng = metric.pose.position.longitude
          
          // Only update position if coordinates are valid numbers
          if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
            updatedPositions[metric.robotId] = { lat, lng }
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

  // Mutations for location updates - MUST be called before any conditional returns
  const [updateFleetLocation] = useMutation(UPDATE_FLEET_LOCATION_MUTATION, {
    refetchQueries: [
      ...(fleetId ? [{ query: FLEET_QUERY, variables: { id: fleetId } }] : []),
      // Always refetch FLEETS_QUERY to update multi-fleet view
      { query: FLEETS_QUERY }
    ],
    awaitRefetchQueries: true, // Wait for refetch to complete before updating
    onError: (error) => {
      console.error('Failed to update fleet location:', error)
    }
  })

  const [updateRobotLocation] = useMutation(UPDATE_ROBOT_LOCATION_MUTATION, {
    refetchQueries: [
      ...(fleetId ? [{ query: FLEET_QUERY, variables: { id: fleetId } }] : []),
      // Always refetch FLEETS_QUERY to update multi-fleet view
      { query: FLEETS_QUERY }
    ],
    awaitRefetchQueries: true, // Wait for refetch to complete before updating
    onError: (error) => {
      console.error('Failed to update robot location:', error)
    }
  })

  // Enrich fleets with pending positions for multi-fleet mode
  // MUST be called before any conditional returns
  const fleetsWithPendingUpdates = useMemo(() => {
    if (!fleets || fleets.length === 0) return fleets
    
    return fleets.map((f: any) => {
      const pendingPos = pendingUpdates.get(`fleet-${f.id}`)
      if (pendingPos) {
        return {
          ...f,
          __pendingPosition: pendingPos
        }
      }
      return f
    })
  }, [fleets, pendingUpdates])

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
  // Use pending updates to override positions until refetch completes
  const robotMarkers = fleetRobots
    .filter((robot: any) => {
      // Check if robot has a valid position (from pending update or calculated position)
      const pendingPos = pendingUpdates.get(`robot-${robot.id}`)
      const calculatedPos = robotPositions[robot.id]
      const position = pendingPos || calculatedPos
      
      // Only include robots with valid numeric coordinates
      return position && 
        typeof position.lat === 'number' && 
        typeof position.lng === 'number' &&
        !isNaN(position.lat) && 
        !isNaN(position.lng) &&
        isFinite(position.lat) && 
        isFinite(position.lng)
    })
    .map((robot: any) => {
      // Check if there's a pending update for this robot
      const pendingPos = pendingUpdates.get(`robot-${robot.id}`)
      const position = pendingPos || robotPositions[robot.id]
      
      const bellowsData = telemetryData as { bellowsStream?: { metrics?: Array<{ robotId?: string; batteryLevel?: number }> } } | undefined
      const batteryLevel = bellowsData?.bellowsStream?.metrics?.find((m: any) => m.robotId === robot.id)?.batteryLevel || robot.batteryLevel || 0
      
      // Double-check position is valid before returning
      const lat = position.lat
      const lng = position.lng
      
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        // Skip this robot - should have been filtered out, but check anyway
        return null
      }
      
      return {
        id: robot.id,
        name: robot.name,
        status: robot.status,
        batteryLevel,
        position: [lat, lng] as [number, number],
        lastSeen: robot.lastSeen
      }
    })
    .filter((marker: any) => marker !== null) // Remove any null markers

  // Check if there's a pending fleet location update
  const pendingFleetPos = fleetId ? pendingUpdates.get(`fleet-${fleetId}`) : null
  let fleetCenterCoords: [number, number] | undefined = undefined
  
  if (pendingFleetPos) {
    // Validate pending position
    if (!isNaN(pendingFleetPos.lat) && !isNaN(pendingFleetPos.lng) && 
        isFinite(pendingFleetPos.lat) && isFinite(pendingFleetPos.lng)) {
      fleetCenterCoords = [pendingFleetPos.lat, pendingFleetPos.lng]
    }
  } else if (fleet?.locus?.coordinates?.latitude != null && fleet?.locus?.coordinates?.longitude != null) {
    const lat = fleet.locus.coordinates.latitude
    const lng = fleet.locus.coordinates.longitude
    // Validate fleet coordinates
    if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
      fleetCenterCoords = [lat, lng]
    }
  }

  // Handle location update (from drag-and-drop or modal)
  const handleLocationUpdate = async (type: 'fleet' | 'robot', id: string, coordinates: { latitude: number; longitude: number; altitude?: number }) => {
    try {
      const coordInput: { latitude: number; longitude: number; altitude?: number } = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      }
      
      // Include altitude if provided
      if (coordinates.altitude !== undefined) {
        coordInput.altitude = coordinates.altitude
      }

      // Store pending update to keep marker at target position
      const pendingKey = type === 'fleet' ? `fleet-${id}` : `robot-${id}`
      setPendingUpdates(prev => {
        const next = new Map(prev)
        next.set(pendingKey, { lat: coordinates.latitude, lng: coordinates.longitude })
        return next
      })
      
      if (type === 'fleet') {
        const result = await updateFleetLocation({
          variables: {
            fleetId: id,
            coordinates: coordInput
          }
        })
        
        // Force recalculation by updating fleet center state (for single-fleet mode)
        if (fleetId && result.data?.updateFleetLocation?.locus?.coordinates) {
          const newCoords = result.data.updateFleetLocation.locus.coordinates
          setFleetCenter([newCoords.latitude, newCoords.longitude])
        }
        
        // For multi-fleet mode, keep pending update until the refetched fleets array reflects the change
        // The pending update will be cleared when the fleets array updates with the new position
        // Check if the position in the refetched data matches the pending position
        if (fleets && fleets.length > 0) {
          // Don't clear immediately - let the useEffect clear it when fleets array updates
          // The refetch should update the fleets array, and when it does, the pending update
          // will be cleared by comparing the fleet's actual position with the pending position
        } else if (fleetId && result.data?.updateFleetLocation?.locus?.coordinates) {
          // Single-fleet mode: clear immediately after confirming data is updated
          setPendingUpdates(prev => {
            const next = new Map(prev)
            next.delete(pendingKey)
            return next
          })
        }
      } else if (type === 'robot') {
        await updateRobotLocation({
          variables: {
            robotId: id,
            coordinates: coordInput
          }
        })
        
      // Don't clear pending update immediately - let useEffect verify the position was updated
      // The pending update will keep the marker at the target position until the refetch
      // updates the data and the useEffect recalculates robotPositions
      }
      
      // Call custom callback if provided
      if (onLocationUpdate) {
        onLocationUpdate(type, id, coordinates)
      }
    } catch (error) {
      console.error('Location update error:', error)
      // Clear pending update on error
      const pendingKey = type === 'fleet' ? `fleet-${id}` : `robot-${id}`
      setPendingUpdates(prev => {
        const next = new Map(prev)
        next.delete(pendingKey)
        return next
      })
    }
  }

  // Handle fleet click to open modal
  const handleFleetClickInternal = (fleetId: string, coordinates: { latitude: number; longitude: number }) => {
    if (onFleetClick) {
      onFleetClick(fleetId, coordinates)
    }
  }

  // Handle robot click to open modal
  const handleRobotClickInternal = (robotId: string, coordinates: { latitude: number; longitude: number }) => {
    if (onRobotClick) {
      onRobotClick(robotId, coordinates)
    }
  }

  return (
    <div className={`rounded-lg overflow-hidden border ${className}`} style={{ height }}>
      <LeafletMap
        center={fleetCenter || [0, 0]}
        robots={robotMarkers}
        fleetCenter={fleetCenterCoords}
        fleetId={fleetId}
        fleets={fleetsWithPendingUpdates}
        height={height}
        draggable={editable}
        onLocationUpdate={handleLocationUpdate}
        onFleetClick={onFleetClick ? handleFleetClickInternal : undefined}
        onRobotClick={onRobotClick ? handleRobotClickInternal : undefined}
      />
    </div>
  )
}

