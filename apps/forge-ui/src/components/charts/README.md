# Robot Monitoring Chart Components

Reusable React components for visualizing robot telemetry data using Recharts.

## Components

### BatteryChart
Line chart displaying battery level history over time.

**Usage:**
```tsx
import { BatteryChart } from '@/components/charts/BatteryChart'

<BatteryChart
  data={[
    { timestamp: '2024-01-01T10:00:00Z', batteryLevel: 85.5 },
    { timestamp: '2024-01-01T10:05:00Z', batteryLevel: 84.2 },
  ]}
/>
```

**Props:**
- `data: DataPoint[]` - Array of battery data points
  - `timestamp: string` - ISO 8601 timestamp
  - `batteryLevel: number` - Battery percentage (0-100)

**Features:**
- Automatic time formatting
- Fixed Y-axis range (0-100%)
- Green stroke color
- No animation dots for performance
- Responsive container

---

### HealthGauge
Radial gauge chart showing robot health score.

**Usage:**
```tsx
import { HealthGauge } from '@/components/charts/HealthGauge'

<HealthGauge healthScore={87.5} />
```

**Props:**
- `healthScore: number` - Health percentage (0-100)

**Features:**
- Color-coded by health level:
  - ≥80%: Green (excellent)
  - 60-79%: Blue (good)
  - 40-59%: Orange (fair)
  - <40%: Red (poor)
- Centered percentage display
- Semi-circular gauge (180° arc)
- Background track

---

### PerformanceChart
Multi-line chart showing speed, efficiency, and uptime metrics.

**Usage:**
```tsx
import { PerformanceChart } from '@/components/charts/PerformanceChart'

<PerformanceChart
  data={[
    {
      timestamp: '2024-01-01T10:00:00Z',
      performance: {
        speed: 85,
        efficiency: 92,
        uptime: 98
      }
    }
  ]}
/>
```

**Props:**
- `data: PerformanceData[]` - Array of performance data points
  - `timestamp: string` - ISO 8601 timestamp
  - `performance.speed: number` - Speed percentage
  - `performance.efficiency: number` - Efficiency percentage
  - `performance.uptime: number` - Uptime percentage

**Features:**
- Three color-coded lines:
  - Speed: Blue
  - Efficiency: Green
  - Uptime: Orange
- Interactive legend
- Automatic time formatting
- Y-axis range: 0-100%

---

### TaskProgress
Progress bar with status indicator for task tracking.

**Usage:**
```tsx
import { TaskProgress } from '@/components/charts/TaskProgress'

<TaskProgress
  taskName="Assembly Task #42"
  progress={67}
  status="IN_PROGRESS"
/>
```

**Props:**
- `taskName: string` - Display name of the task
- `progress: number` - Completion percentage (0-100)
- `status: string` - Task status
  - `'COMPLETED'` - Green
  - `'IN_PROGRESS'` - Blue
  - `'PENDING'` - Yellow
  - `'FAILED'` - Red

**Features:**
- Animated progress bar
- Color-coded by status
- Displays task name and percentage
- Status label below bar

---

## Common Features

All chart components include:
- **Responsive Design**: Adapt to container width
- **TypeScript Support**: Fully typed props
- **Performance Optimized**: Minimal re-renders
- **Accessibility**: Proper ARIA labels and semantic HTML
- **Consistent Styling**: Matches Sepulki design system

## Dependencies

- `recharts` v2.x - Chart rendering library
- `react` v18.x - React framework

## Examples

### Complete Robot Dashboard
```tsx
import { BatteryChart } from '@/components/charts/BatteryChart'
import { HealthGauge } from '@/components/charts/HealthGauge'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { TaskProgress } from '@/components/charts/TaskProgress'

function RobotDashboard({ robot, telemetry }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg">
        <h2>Battery History</h2>
        <BatteryChart data={telemetry} />
      </div>

      <div className="bg-white p-6 rounded-lg">
        <h2>Health Score</h2>
        <HealthGauge healthScore={robot.healthScore} />
      </div>

      <div className="col-span-2 bg-white p-6 rounded-lg">
        <h2>Performance Metrics</h2>
        <PerformanceChart data={telemetry} />
      </div>

      {robot.currentTask && (
        <div className="col-span-2 bg-white p-6 rounded-lg">
          <h2>Current Task</h2>
          <TaskProgress
            taskName={robot.currentTask.name}
            progress={robot.currentTask.progress}
            status={robot.currentTask.status}
          />
        </div>
      )}
    </div>
  )
}
```

### With Time Range Selector
```tsx
function RobotMetrics() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h')

  const { data } = useQuery(ROBOT_TELEMETRY_QUERY, {
    variables: { robotId: '123', timeRange }
  })

  return (
    <div>
      <div className="mb-4">
        {['1h', '6h', '24h', '7d'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={timeRange === range ? 'active' : ''}
          >
            {range}
          </button>
        ))}
      </div>

      <BatteryChart data={data?.robotTelemetry || []} />
    </div>
  )
}
```

### With Loading States
```tsx
function MetricsCard({ data, loading }) {
  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        No data available
      </div>
    )
  }

  return <PerformanceChart data={data} />
}
```

## Customization

### Styling
All components use Tailwind CSS classes and can be customized via:
- Container classes (wrap component in styled div)
- Recharts theme props
- CSS modules or styled-components

### Data Formatting
Charts automatically format:
- Timestamps → Localized time strings
- Numbers → Fixed decimal precision
- Percentages → With % symbol

### Color Schemes
Default colors match the Sepulki design system:
- Primary: Blue (#3b82f6)
- Success: Green (#10b981)
- Warning: Orange (#f59e0b)
- Error: Red (#ef4444)

## Browser Support

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Notes

- Charts use canvas rendering for better performance with large datasets
- Limit data points to 100-200 for optimal performance
- Use `pollInterval` with caution (recommended: 5000ms minimum)
- Consider implementing data pagination for historical views

## TypeScript Types

See `/src/types/telemetry.ts` for complete type definitions.

## Contributing

When adding new chart components:
1. Create component in `/src/components/charts/`
2. Add TypeScript interface for props
3. Export from component file
4. Add usage example to this README
5. Update `/src/types/telemetry.ts` if needed
