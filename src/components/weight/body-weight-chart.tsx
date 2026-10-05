'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BodyWeightChartPoint } from '@/lib/db/body-weight'

interface BodyWeightChartProps {
  data: BodyWeightChartPoint[]
}

export const BodyWeightChart = ({ data }: BodyWeightChartProps) => {
  if (data.length === 0) return null

  const minY = Math.floor(Math.min(...data.map((d) => d.weightKg)) - 1)
  const maxY = Math.ceil(Math.max(...data.map((d) => d.weightKg)) + 1)

  return (
    <div className="h-56 w-full rounded-xl border border-border bg-card p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="label" stroke="#a1a1aa" fontSize={11} />
          <YAxis domain={[minY, maxY]} stroke="#a1a1aa" fontSize={11} width={36} />
          <Tooltip
            formatter={(value) => [`${value} кг`, 'Вага']}
            contentStyle={{ background: '#111113', border: '1px solid #27272a' }}
          />
          <Line
            type="monotone"
            dataKey="weightKg"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
