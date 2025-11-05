'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PerformanceData {
  timestamp: string
  performance: {
    speed: number
    efficiency: number
    uptime: number
  }
}

interface PerformanceChartProps {
  data: PerformanceData[]
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const formattedData = data.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    speed: point.performance.speed,
    efficiency: point.performance.efficiency,
    uptime: point.performance.uptime,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="speed"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Speed"
        />
        <Line
          type="monotone"
          dataKey="efficiency"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          name="Efficiency"
        />
        <Line
          type="monotone"
          dataKey="uptime"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          name="Uptime"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
