'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  timestamp: string
  batteryLevel: number
}

interface BatteryChartProps {
  data: DataPoint[]
}

export function BatteryChart({ data }: BatteryChartProps) {
  const formattedData = data.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    battery: point.batteryLevel,
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
          label={{ value: 'Battery %', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Battery']}
        />
        <Line
          type="monotone"
          dataKey="battery"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
