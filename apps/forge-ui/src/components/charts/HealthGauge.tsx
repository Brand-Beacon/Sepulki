'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'

interface HealthGaugeProps {
  healthScore: number
}

export function HealthGauge({ healthScore }: HealthGaugeProps) {
  const data = [{ name: 'Health', value: healthScore, fill: getHealthColor(healthScore) }]

  function getHealthColor(score: number): string {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#3b82f6'
    if (score >= 40) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={250}>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900">{healthScore}%</div>
          <div className="text-sm text-gray-500">Health Score</div>
        </div>
      </div>
    </div>
  )
}
