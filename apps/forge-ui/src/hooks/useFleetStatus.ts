import { useEffect, useState } from 'react'
import { useSubscription } from '@apollo/client/react'
import { BELLOWS_STREAM_SUBSCRIPTION } from '@/lib/graphql/subscriptions'

interface FleetMetrics {
  timestamp: Date
  robotId: string
  batteryLevel?: number
  healthScore?: number
  pose?: any
}

interface FleetEvent {
  timestamp: Date
  type: string
  robotId: string
  message: string
}

interface FleetStatus {
  fleetId: string
  metrics: FleetMetrics[]
  events: FleetEvent[]
  realTime: boolean
}

export function useFleetStatus(fleetId: string) {
  const [status, setStatus] = useState<FleetStatus | null>(null)
  
  const { data, loading, error } = useSubscription(BELLOWS_STREAM_SUBSCRIPTION, {
    variables: { fleetId },
    skip: !fleetId,
    onError: (err) => {
      console.error('Fleet status subscription error:', err)
    }
  })

  useEffect(() => {
    const bellowsData = data as { bellowsStream?: any } | undefined
    if (bellowsData?.bellowsStream) {
      setStatus(bellowsData.bellowsStream)
    }
  }, [data])

  return {
    status,
    loading,
    error
  }
}

