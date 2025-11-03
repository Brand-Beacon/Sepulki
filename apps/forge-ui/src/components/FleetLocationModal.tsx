'use client'

import { LocationModal } from './LocationModal'

interface FleetLocationModalProps {
  isOpen: boolean
  onClose: () => void
  fleetId: string
  fleetName: string
  currentLocation?: { latitude: number; longitude: number }
  onLocationUpdate: (coordinates: { latitude: number; longitude: number }) => void
}

// Wrapper component for backward compatibility
export function FleetLocationModal(props: FleetLocationModalProps) {
  return (
    <LocationModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      entityId={props.fleetId}
      entityName={props.fleetName}
      entityType="fleet"
      currentLocation={props.currentLocation}
      onLocationUpdate={props.onLocationUpdate}
    />
  )
}
