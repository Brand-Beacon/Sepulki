# Notification System Usage Guide

Complete guide for using Sepulki's real-time notification system.

## Quick Start

### 1. Basic Usage

```tsx
'use client';

import { useNotification } from '@/hooks/useNotification';

export function MyComponent() {
  const notify = useNotification();

  const handleSave = async () => {
    try {
      await saveData();
      notify.success('Data saved successfully!');
    } catch (error) {
      notify.error('Failed to save data');
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### 2. Promise-based Notifications

```tsx
const handleSubmit = async () => {
  await notify.promise(
    submitForm(),
    {
      loading: 'Submitting...',
      success: 'Form submitted!',
      error: 'Failed to submit form',
    }
  );
};
```

### 3. Real-time Notifications

```tsx
'use client';

import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export function FleetMonitor({ fleetId }: { fleetId: string }) {
  useRealtimeNotifications({
    fleetId,
    enableRobotStatus: true,
    enableTaskUpdates: true,
    onRobotStatus: (event) => {
      console.log('Robot event:', event);
    },
  });

  return <div>Monitoring fleet...</div>;
}
```

## Notification Types

### Success
```tsx
notify.success('Task completed successfully!');
notify.success('Robot deployed', { duration: 5000 });
```

### Error
```tsx
notify.error('Connection failed');
notify.error('Authentication required', { duration: 6000 });
```

### Warning
```tsx
notify.warning('Battery low on Robot-123');
notify.warning('Maintenance required', { sound: false });
```

### Info
```tsx
notify.info('System update available');
notify.info('Fleet status: All online', { icon: '🤖' });
```

### Critical (No Auto-dismiss)
```tsx
notify.critical('EMERGENCY: Robot collision detected!');
```

## Custom Options

```tsx
notify.success('Custom notification', {
  duration: 8000,           // Duration in ms
  sound: false,              // Disable sound
  icon: '🎉',               // Custom icon
  id: 'unique-id',          // Unique ID for deduplication
});
```

## User Preferences

### Check Preferences
```tsx
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const { preferences, isEnabled } = useNotificationPreferences();

if (preferences.sound) {
  // Sound is enabled
}
```

### Update Preferences
```tsx
const { updatePreferences } = useNotificationPreferences();

// Toggle sound
updatePreferences({ sound: false });

// Disable all notifications
updatePreferences({ enabled: false });

// Change default duration
updatePreferences({ defaultDuration: 6000 });
```

### Settings Component
```tsx
import { NotificationSettings } from '@/components/NotificationSettings';

export function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <NotificationSettings />
    </div>
  );
}
```

## Real-time Integration

### Monitor Fleet
```tsx
useRealtimeNotifications({
  fleetId: 'fleet-abc',
  enableRobotStatus: true,
  enableTaskUpdates: true,
  enableFleetEvents: true,
});
```

### Custom Event Handlers
```tsx
useRealtimeNotifications({
  fleetId: 'fleet-abc',
  onRobotStatus: (event) => {
    if (event.status === 'error') {
      // Custom error handling
      logError(event);
    }
  },
  onTaskUpdate: (event) => {
    if (event.status === 'completed') {
      // Task completed logic
      refreshData();
    }
  },
  onFleetEvent: (event) => {
    if (event.severity === 'critical') {
      // Critical event handling
      alertAdmins(event);
    }
  },
});
```

## Advanced Examples

### Form Submission with Loading State
```tsx
const handleSubmit = async (data: FormData) => {
  await notify.promise(
    api.submitTask(data),
    {
      loading: 'Creating task...',
      success: (result) => `Task "${result.name}" created!`,
      error: (err) => `Failed: ${err.message}`,
    }
  );
};
```

### Batch Operations
```tsx
const handleBatchDelete = async (ids: string[]) => {
  await notify.promise(
    Promise.all(ids.map(id => deleteItem(id))),
    {
      loading: `Deleting ${ids.length} items...`,
      success: 'All items deleted successfully',
      error: 'Some items failed to delete',
    }
  );
};
```

### Conditional Notifications
```tsx
const { isEnabled } = useNotificationPreferences();

if (isEnabled) {
  notify.success('Operation completed');
} else {
  // Silent mode - just log
  console.log('Operation completed');
}
```

### Dismiss Specific Toast
```tsx
const toastId = notify.info('Processing...');

// Later...
notify.dismiss(toastId);

// Or dismiss all
notify.dismiss();
```

## Utility Functions

### Format Errors
```tsx
import { formatErrorMessage, parseApolloError } from '@/lib/notifications/utils';

try {
  await mutation();
} catch (error) {
  const { message, code } = parseApolloError(error);
  notify.error(message);
}
```

### Debounce Notifications
```tsx
import { createNotificationDebouncer } from '@/lib/notifications/utils';

const debounce = createNotificationDebouncer(2000);

// Only notify once every 2 seconds
debounce('robot-status', () => {
  notify.warning('Robot status changed');
});
```

## Best Practices

1. **Use Promise Notifications for Async Operations**
   ```tsx
   // Good
   await notify.promise(saveData(), { ... });

   // Avoid
   try {
     await saveData();
     notify.success('Saved');
   } catch {
     notify.error('Failed');
   }
   ```

2. **Provide Meaningful Messages**
   ```tsx
   // Good
   notify.success('Robot "Spot-01" deployed to warehouse zone A');

   // Avoid
   notify.success('Success');
   ```

3. **Use Appropriate Types**
   - `success`: Completed actions
   - `error`: Failures and errors
   - `warning`: Important alerts, low priority issues
   - `info`: General information
   - `critical`: Emergencies requiring immediate attention

4. **Respect User Preferences**
   - The system automatically checks preferences
   - Users can disable notifications
   - Always provide alternative feedback (UI updates, logs)

5. **Avoid Notification Spam**
   - Use debouncing for frequent events
   - Provide unique IDs to prevent duplicates
   - Use promise notifications to replace loading states

## TypeScript Types

```tsx
import type {
  NotificationType,
  NotificationOptions,
  NotificationPreferences,
  PromiseMessages,
} from '@/types/notification';
```

## Testing

```tsx
import { render } from '@testing-library/react';
import { NotificationProvider } from '@/components/ToastProvider';

// Wrap components in tests
const { getByText } = render(
  <NotificationProvider>
    <YourComponent />
  </NotificationProvider>
);
```

## Troubleshooting

### Notifications Not Appearing
1. Check if `ToastProvider` is added to root layout
2. Verify user hasn't disabled notifications in preferences
3. Check browser console for errors

### Sounds Not Playing
1. User interaction required before sounds can play
2. Check audio files exist in `/public/sounds/`
3. Verify sound preference is enabled

### Duplicate Notifications
1. Use unique IDs: `notify.success('msg', { id: 'unique-id' })`
2. Implement debouncing for frequent events
3. Check subscription handling in real-time hooks

## Performance Tips

1. **Lazy Load Hooks**
   ```tsx
   // Only in components that need notifications
   const notify = useNotification();
   ```

2. **Debounce High-Frequency Events**
   ```tsx
   const debounce = createNotificationDebouncer(1000);
   ```

3. **Use Unique IDs**
   ```tsx
   notify.info('Message', { id: 'robot-status-123' });
   ```

4. **Clean Up Subscriptions**
   ```tsx
   // useRealtimeNotifications handles cleanup automatically
   ```
