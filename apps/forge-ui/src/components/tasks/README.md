# Task Components

## Overview

Complete task creation workflow with form validation, GraphQL integration, and mobile responsiveness.

## Components

### TaskCreateForm
Main form component with validation and fleet/robot selection.

**Props:**
```typescript
interface TaskCreateFormProps {
  onSubmit: (fleetId: string, taskInput: TaskInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}
```

**Usage:**
```tsx
import { TaskCreateForm } from '@/components/tasks/TaskCreateForm';

<TaskCreateForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  isSubmitting={false}
  error={null}
/>
```

### TaskCreateModal
Modal wrapper with state management and success animations.

**Props:**
```typescript
interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (taskId: string) => void;
}
```

**Usage:**
```tsx
import { TaskCreateModal } from '@/components/tasks/TaskCreateModal';

const [isOpen, setIsOpen] = useState(false);

<TaskCreateModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSuccess={(taskId) => console.log('Created:', taskId)}
/>
```

## Features

- ✅ Fleet/robot selection with availability checking
- ✅ Real-time form validation
- ✅ Task type selection (7 types)
- ✅ Priority levels (4 levels)
- ✅ Optional scheduling
- ✅ Mobile responsive
- ✅ Keyboard shortcuts (ESC to close)
- ✅ Loading states
- ✅ Error handling
- ✅ Success animations

## Validation Rules

- **Task Name**: Required, minimum 3 characters
- **Fleet Selection**: Required
- **Task Type**: Required
- **Priority**: Defaults to NORMAL
- **Description**: Optional
- **Schedule**: Optional

## GraphQL Integration

The components use the following GraphQL operations:

```typescript
import { dispatchTask, getFleets, getRobots } from '@/lib/graphql';

// Create task
const response = await dispatchTask('fleet-id', {
  name: 'Task Name',
  type: 'PATROL',
  priority: 'NORMAL'
});

// Get fleets
const fleets = await getFleets();

// Get robots
const robots = await getRobots('fleet-id', 'IDLE');
```

## Types

```typescript
import {
  TaskType,
  TaskPriority,
  TaskInput,
  Task,
  Fleet,
  Robot
} from '@/types/task';
```

## Testing

```bash
npm test -- TaskCreateForm.test.tsx
```

## Mobile Responsive

- Mobile (< 640px): Single column layout
- Tablet (640px - 1024px): Optimized spacing
- Desktop (> 1024px): Full width with sidebar

## Accessibility

- ARIA labels on all fields
- Keyboard navigation support
- Focus management
- Screen reader friendly
- WCAG AA compliant

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari iOS 14+

## Examples

### Basic Task
```tsx
// User fills form:
{
  name: "Warehouse Patrol",
  fleet: "Main Fleet",
  type: "PATROL",
  priority: "NORMAL"
}
```

### Scheduled Task
```tsx
// User fills form:
{
  name: "Nightly Inspection",
  fleet: "Inspection Fleet",
  type: "INSPECTION",
  priority: "HIGH",
  scheduledAt: "2024-11-05T22:00:00"
}
```

## Error Handling

The components handle:
- Network errors
- Validation errors
- GraphQL errors
- No fleets available
- No robots available

## Performance

- Lazy modal rendering
- Debounced validation
- Cached fleet data
- Optimistic updates

## Documentation

For detailed documentation, see:
- [Task Creation Workflow](/docs/task-creation-workflow.md)
- [Implementation Summary](/docs/TASK_CREATION_SUMMARY.md)
