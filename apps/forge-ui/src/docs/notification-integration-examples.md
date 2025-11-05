# Notification Integration Examples

Real-world examples of integrating the notification system into Sepulki components.

## Task Creation Form Integration

**File: `/apps/forge-ui/src/app/tasks/new/page.tsx`**

```tsx
'use client'

import { RouteGuard } from '@/components/RouteGuard'
import { useAuth } from '@/components/AuthProvider'
import { useNotification } from '@/hooks/useNotification'  // Add this
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function TasksNewPageContent() {
  const { smith } = useAuth()
  const router = useRouter()
  const notify = useNotification()  // Add this
  const searchParams = useSearchParams()
  const robotId = searchParams.get('robotId')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'NORMAL' as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW',
    scheduledAt: ''
  })

  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      notify.error('Task name is required')  // Replace error state with notification
      return
    }

    setCreating(true)

    try {
      // Use promise notification for better UX
      await notify.promise(
        dispatchTask({ ...formData, robotId }),
        {
          loading: 'Creating task...',
          success: (result) => `Task "${result.name}" created successfully!`,
          error: (err) => `Failed to create task: ${err.message}`,
        }
      )

      router.push('/tasks')
    } catch (err) {
      // Error already shown by promise notification
      console.error('Task creation failed:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* ... rest of component */}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        {/* ... form fields */}

        {/* Remove error display div - notifications handle this now */}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || !formData.name.trim()}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

## Fleet Management Integration

**File: `/apps/forge-ui/src/app/fleet/page.tsx`**

```tsx
'use client'

import { useNotification } from '@/hooks/useNotification'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useState, useEffect } from 'react'

function FleetManagementPage() {
  const notify = useNotification()
  const [fleetId, setFleetId] = useState<string>('default-fleet')

  // Enable real-time notifications for fleet monitoring
  useRealtimeNotifications({
    fleetId,
    enableRobotStatus: true,
    enableTaskUpdates: true,
    enableFleetEvents: true,
    onRobotStatus: (event) => {
      // Custom handling for specific scenarios
      if (event.status === 'error' && event.message?.includes('collision')) {
        // Log critical errors separately
        console.error('COLLISION DETECTED:', event)
      }
    },
    onTaskUpdate: (event) => {
      // Refresh task list when updates occur
      if (event.status === 'completed' || event.status === 'failed') {
        refreshTaskList()
      }
    },
  })

  const handleEmergencyStop = async (robotId: string) => {
    await notify.promise(
      emergencyStopRobot(robotId),
      {
        loading: 'Sending emergency stop...',
        success: 'Robot stopped successfully',
        error: 'Failed to stop robot',
      }
    )
  }

  const handleDeployRobot = async (robotId: string, locationId: string) => {
    await notify.promise(
      deployRobot(robotId, locationId),
      {
        loading: 'Deploying robot...',
        success: (result) => `Robot deployed to ${result.location}`,
        error: 'Deployment failed',
      }
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Fleet Management</h1>
      {/* Fleet UI components */}
    </div>
  )
}
```

## Robot Operations Component

**File: `/apps/forge-ui/src/components/RobotOperations.tsx`**

```tsx
'use client'

import { useNotification } from '@/hooks/useNotification'
import { formatErrorMessage } from '@/lib/notifications/utils'

interface RobotOperationsProps {
  robotId: string
  robotName: string
}

export function RobotOperations({ robotId, robotName }: RobotOperationsProps) {
  const notify = useNotification()

  const operations = [
    {
      label: 'Start',
      icon: '▶️',
      action: async () => {
        await notify.promise(
          startRobot(robotId),
          {
            loading: `Starting ${robotName}...`,
            success: `${robotName} started successfully`,
            error: (err) => `Failed to start: ${formatErrorMessage(err)}`,
          }
        )
      },
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      label: 'Pause',
      icon: '⏸️',
      action: async () => {
        await notify.promise(
          pauseRobot(robotId),
          {
            loading: `Pausing ${robotName}...`,
            success: `${robotName} paused`,
            error: 'Failed to pause robot',
          }
        )
      },
      color: 'bg-yellow-600 hover:bg-yellow-700',
    },
    {
      label: 'Stop',
      icon: '⏹️',
      action: async () => {
        await notify.promise(
          stopRobot(robotId),
          {
            loading: `Stopping ${robotName}...`,
            success: `${robotName} stopped`,
            error: 'Failed to stop robot',
          }
        )
      },
      color: 'bg-red-600 hover:bg-red-700',
    },
    {
      label: 'Maintenance',
      icon: '🔧',
      action: async () => {
        try {
          await setMaintenanceMode(robotId, true)
          notify.success(`${robotName} set to maintenance mode`, {
            duration: 5000,
          })
        } catch (error) {
          notify.error('Failed to set maintenance mode')
        }
      },
      color: 'bg-blue-600 hover:bg-blue-700',
    },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {operations.map((op) => (
        <button
          key={op.label}
          onClick={op.action}
          className={`px-4 py-2 text-white rounded-lg font-medium ${op.color} flex items-center space-x-2`}
        >
          <span>{op.icon}</span>
          <span>{op.label}</span>
        </button>
      ))}
    </div>
  )
}
```

## Batch Operations

**File: `/apps/forge-ui/src/components/BatchRobotOperations.tsx`**

```tsx
'use client'

import { useNotification } from '@/hooks/useNotification'
import { useState } from 'react'

interface BatchRobotOperationsProps {
  selectedRobots: string[]
}

export function BatchRobotOperations({ selectedRobots }: BatchRobotOperationsProps) {
  const notify = useNotification()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleBatchStart = async () => {
    if (selectedRobots.length === 0) {
      notify.warning('No robots selected')
      return
    }

    setIsProcessing(true)
    try {
      await notify.promise(
        Promise.all(selectedRobots.map(id => startRobot(id))),
        {
          loading: `Starting ${selectedRobots.length} robots...`,
          success: `Successfully started ${selectedRobots.length} robots`,
          error: 'Some robots failed to start',
        }
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchStop = async () => {
    if (selectedRobots.length === 0) {
      notify.warning('No robots selected')
      return
    }

    setIsProcessing(true)
    try {
      const results = await Promise.allSettled(
        selectedRobots.map(id => stopRobot(id))
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (failed === 0) {
        notify.success(`All ${successful} robots stopped successfully`)
      } else {
        notify.warning(
          `${successful} robots stopped, ${failed} failed`,
          { duration: 6000 }
        )
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={handleBatchStart}
        disabled={isProcessing || selectedRobots.length === 0}
        className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
      >
        Start All ({selectedRobots.length})
      </button>
      <button
        onClick={handleBatchStop}
        disabled={isProcessing || selectedRobots.length === 0}
        className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
      >
        Stop All ({selectedRobots.length})
      </button>
    </div>
  )
}
```

## Settings Page Integration

**File: `/apps/forge-ui/src/app/settings/page.tsx`**

```tsx
'use client'

import { NotificationSettings } from '@/components/NotificationSettings'
import { NotificationDemo } from '@/components/NotificationDemo'

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-8">
        {/* Notification Settings */}
        <section className="bg-white rounded-lg shadow p-6">
          <NotificationSettings />
        </section>

        {/* Demo Section (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Notifications</h2>
            <NotificationDemo />
          </section>
        )}
      </div>
    </div>
  )
}
```

## Apollo GraphQL Error Handling

**File: `/apps/forge-ui/src/lib/apollo/errorHandling.ts`**

```tsx
import { onError } from '@apollo/client/link/error'
import { parseApolloError, isAuthError } from '@/lib/notifications/utils'

export const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  // This runs globally for all GraphQL errors
  // Individual components can still handle errors locally

  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        extensions
      )
    })
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`)
  }
})

// Use in component
import { useMutation } from '@apollo/client'
import { useNotification } from '@/hooks/useNotification'
import { parseApolloError } from '@/lib/notifications/utils'

function MyComponent() {
  const notify = useNotification()
  const [createTask] = useMutation(CREATE_TASK_MUTATION)

  const handleCreate = async (input: TaskInput) => {
    try {
      const result = await createTask({ variables: { input } })
      notify.success('Task created successfully')
      return result
    } catch (error) {
      const { message } = parseApolloError(error)
      notify.error(message)
      throw error
    }
  }
}
```

## Fleet Dashboard with Real-time Updates

**File: `/apps/forge-ui/src/app/dashboard/page.tsx`**

```tsx
'use client'

import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useNotification } from '@/hooks/useNotification'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { useState } from 'react'

export default function DashboardPage() {
  const notify = useNotification()
  const { preferences } = useNotificationPreferences()
  const [fleetId] = useState('default-fleet')
  const [criticalCount, setCriticalCount] = useState(0)

  // Monitor fleet with custom handlers
  const { isConnected } = useRealtimeNotifications({
    fleetId,
    enableRobotStatus: true,
    enableTaskUpdates: true,
    enableFleetEvents: true,
    onRobotStatus: (event) => {
      // Track critical robot events
      if (event.status === 'error') {
        setCriticalCount(prev => prev + 1)
      }
    },
    onFleetEvent: (event) => {
      // Handle emergency events
      if (event.eventType === 'emergency') {
        // Show critical notification + update UI
        notify.critical(`EMERGENCY: ${event.message}`)
        // Trigger emergency protocols
        handleEmergency(event)
      }
    },
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Fleet Dashboard</h1>

        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>

          {/* Notifications Status */}
          {preferences.enabled ? (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Notifications: ON
            </span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
              Notifications: OFF
            </span>
          )}
        </div>
      </div>

      {/* Critical Alerts Badge */}
      {criticalCount > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-xl">⚠️</span>
            <span className="text-red-800 font-medium">
              {criticalCount} critical event{criticalCount > 1 ? 's' : ''} detected
            </span>
          </div>
          <button
            onClick={() => setCriticalCount(0)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Dashboard content */}
    </div>
  )
}
```

## Best Practices Summary

1. **Use Promise Notifications**: Simplifies async operations and provides automatic loading states
2. **Parse Errors**: Use utility functions to format Apollo/GraphQL errors
3. **Custom Handlers**: Use real-time hook callbacks for complex scenarios
4. **Debounce Frequent Events**: Prevent notification spam
5. **Provide Context**: Include robot names, task IDs in messages
6. **Respect User Preferences**: System automatically checks preferences
7. **Handle Edge Cases**: Check for empty selections, connection states
8. **Cleanup**: Hooks handle cleanup automatically, but clean up manual subscriptions
