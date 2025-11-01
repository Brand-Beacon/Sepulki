import { useEffect, useState } from 'react'
import { useSubscription } from '@apollo/client/react'
import { ROBOT_STATUS_SUBSCRIPTION } from '@/lib/graphql/subscriptions'

interface RobotStatus {
  id: string
  name: string
  status: string
  batteryLevel?: number
  healthScore?: number
  lastSeen?: Date
  pose?: any
}

export function useRobotStatus(robotId: string) {
  const [robot, setRobot] = useState<RobotStatus | null>(null)
  
  const { data, loading, error } = useSubscription(ROBOT_STATUS_SUBSCRIPTION, {
    variables: { robotId },
    skip: !robotId
  })

  useEffect(() => {
    if (error) {
      console.error('Robot status subscription error:', error)
    }
  }, [error])

  useEffect(() => {
    const dataTyped = (data && typeof data === 'object' && 'robotStatus' in data) 
      ? (data as { robotStatus?: any }) 
      : undefined
    if (dataTyped?.robotStatus) {
      setRobot(dataTyped.robotStatus)
    }
  }, [data])

  return {
    robot,
    loading,
    error
  }
}


