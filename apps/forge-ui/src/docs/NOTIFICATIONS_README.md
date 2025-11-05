# Sepulki Real-Time Notification System

Production-ready toast notification system with real-time WebSocket integration for the Sepulki Forge platform.

## Features

✅ **Toast Notifications** with react-hot-toast
✅ **Sepulki Theme** (Orange accent colors)
✅ **Multiple Types**: success, error, warning, info, critical
✅ **Promise-based** notifications for async operations
✅ **Real-time WebSocket** integration via GraphQL subscriptions
✅ **User Preferences** with localStorage persistence
✅ **Sound Effects** support (optional)
✅ **Queue Management** for multiple toasts
✅ **TypeScript** fully typed
✅ **Auto-dismiss** with configurable duration
✅ **Custom positioning** and styling

## Quick Start

### 1. The ToastProvider is already integrated in the root layout
No additional setup needed - notifications work globally!

### 2. Use notifications in any component

```tsx
import { useNotification } from '@/hooks/useNotification';

function MyComponent() {
  const notify = useNotification();

  return (
    <button onClick={() => notify.success('Hello!')}>
      Show Notification
    </button>
  );
}
```

## File Structure

```
apps/forge-ui/src/
├── components/
│   ├── ToastProvider.tsx              # Toast provider with Sepulki theme
│   ├── NotificationSettings.tsx       # User preferences UI
│   └── NotificationDemo.tsx           # Demo component for testing
├── hooks/
│   ├── useNotification.ts             # Main notification hook
│   ├── useNotificationPreferences.ts  # Preferences management
│   └── useRealtimeNotifications.ts    # WebSocket integration
├── types/
│   └── notification.ts                # TypeScript definitions
├── lib/
│   └── notifications/
│       └── utils.ts                   # Helper utilities
└── docs/
    ├── NOTIFICATIONS_README.md        # This file
    ├── notifications-usage.md         # Detailed usage guide
    └── notification-integration-examples.md  # Integration examples
```

## Usage Examples

### Basic Notifications

```tsx
const notify = useNotification();

// Success
notify.success('Task completed!');

// Error
notify.error('Something went wrong');

// Warning
notify.warning('Battery low');

// Info
notify.info('New feature available');

// Critical (no auto-dismiss)
notify.critical('EMERGENCY: System failure');
```

### Promise-based Notifications

```tsx
await notify.promise(
  saveData(),
  {
    loading: 'Saving...',
    success: 'Saved successfully!',
    error: 'Failed to save',
  }
);
```

### Real-time Monitoring

```tsx
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

function FleetMonitor({ fleetId }: { fleetId: string }) {
  useRealtimeNotifications({
    fleetId,
    enableRobotStatus: true,
    enableTaskUpdates: true,
  });

  return <div>Monitoring...</div>;
}
```

## Configuration

### User Preferences UI

Add the settings component to your settings page:

```tsx
import { NotificationSettings } from '@/components/NotificationSettings';

export default function SettingsPage() {
  return <NotificationSettings />;
}
```

Users can configure:
- Enable/disable notifications
- Sound effects on/off
- Which notification types to show
- Default duration (1-10 seconds)

### Programmatic Preferences

```tsx
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const { preferences, updatePreferences } = useNotificationPreferences();

// Disable all notifications
updatePreferences({ enabled: false });

// Change default duration
updatePreferences({ defaultDuration: 6000 });
```

## Real-time Events

The system automatically listens to GraphQL subscriptions and shows notifications for:

### Robot Status Changes
- Robot goes offline
- Error states
- Low battery warnings
- Maintenance required

### Task Updates
- Task completion
- Task failures
- Critical task starts

### Fleet Events
- Emergency situations
- Status changes
- Robot additions/removals

### Custom Event Handlers

```tsx
useRealtimeNotifications({
  fleetId: 'fleet-123',
  onRobotStatus: (event) => {
    // Custom handling
    console.log('Robot event:', event);
  },
  onTaskUpdate: (event) => {
    // Refresh data
    refetch();
  },
});
```

## Integration Checklist

✅ ToastProvider added to root layout (`/apps/forge-ui/src/app/layout.tsx`)
✅ TypeScript types defined (`/apps/forge-ui/src/types/notification.ts`)
✅ Main notification hook (`/apps/forge-ui/src/hooks/useNotification.ts`)
✅ Preferences hook (`/apps/forge-ui/src/hooks/useNotificationPreferences.ts`)
✅ Real-time hook (`/apps/forge-ui/src/hooks/useRealtimeNotifications.ts`)
✅ Utility functions (`/apps/forge-ui/src/lib/notifications/utils.ts`)
✅ Settings component (`/apps/forge-ui/src/components/NotificationSettings.tsx`)
✅ Demo component (`/apps/forge-ui/src/components/NotificationDemo.tsx`)
✅ Documentation (`/apps/forge-ui/src/docs/*.md`)

## Next Steps

### 1. Integrate into Task Creation Form

**File:** `/apps/forge-ui/src/app/tasks/new/page.tsx`

```tsx
import { useNotification } from '@/hooks/useNotification';

function TasksNewPage() {
  const notify = useNotification();

  const handleSubmit = async (data) => {
    await notify.promise(
      createTask(data),
      {
        loading: 'Creating task...',
        success: (result) => `Task "${result.name}" created!`,
        error: 'Failed to create task',
      }
    );
  };
}
```

### 2. Add to Fleet Management

**File:** `/apps/forge-ui/src/app/fleet/page.tsx`

```tsx
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

function FleetPage() {
  useRealtimeNotifications({
    fleetId: 'default-fleet',
    enableRobotStatus: true,
    enableTaskUpdates: true,
    enableFleetEvents: true,
  });

  // Component renders...
}
```

### 3. Add Settings Page

Create `/apps/forge-ui/src/app/settings/page.tsx`:

```tsx
import { NotificationSettings } from '@/components/NotificationSettings';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <NotificationSettings />
    </div>
  );
}
```

### 4. Add Sound Files (Optional)

If you want sound effects, add audio files to `/apps/forge-ui/public/sounds/`:
- `success.mp3`
- `error.mp3`
- `warning.mp3`
- `info.mp3`

Or disable sounds by default in preferences.

## Testing

### Test in Development

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Create a test page with the demo component:
   ```tsx
   import { NotificationDemo } from '@/components/NotificationDemo';

   export default function TestPage() {
     return <NotificationDemo />;
   }
   ```

3. Test all notification types and preferences

### Test Real-time Notifications

1. Navigate to fleet management
2. Trigger robot events (start/stop/error)
3. Verify notifications appear automatically
4. Check that user preferences are respected

## API Reference

See detailed documentation in:
- **Usage Guide:** `/apps/forge-ui/src/docs/notifications-usage.md`
- **Integration Examples:** `/apps/forge-ui/src/docs/notification-integration-examples.md`

## TypeScript Types

```typescript
import type {
  NotificationType,
  NotificationOptions,
  NotificationPreferences,
  PromiseMessages,
  RobotStatusEvent,
  TaskEvent,
  FleetEvent,
} from '@/types/notification';
```

## Troubleshooting

### Notifications not showing
1. Verify ToastProvider is in root layout
2. Check user preferences (notifications might be disabled)
3. Check browser console for errors

### Sounds not playing
1. User interaction required before audio can play
2. Check sound files exist in `/public/sounds/`
3. Verify sound preference is enabled

### Duplicate notifications
1. Use unique IDs: `notify.success('msg', { id: 'unique-id' })`
2. Implement debouncing for frequent events

### Real-time events not triggering
1. Verify GraphQL subscriptions are working
2. Check WebSocket connection
3. Verify fleetId is correct

## Performance

- **Lightweight:** Only 2 dependencies (react-hot-toast + deps)
- **Optimized:** Automatic deduplication and debouncing
- **Lazy Loading:** Hooks only initialize when used
- **Memory Efficient:** Automatic cleanup on unmount

## Browser Support

Works in all modern browsers with:
- ES6+ support
- WebSocket support
- localStorage support
- Audio API support (for sounds, optional)

## Dependencies

- `react-hot-toast` (v2.x) - Toast notification library
- `@apollo/client` (existing) - GraphQL subscriptions
- `graphql-ws` (existing) - WebSocket transport

## License

Part of Sepulki Forge platform

---

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Last Updated:** 2025-01-04
