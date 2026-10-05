'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface ChartPoint {
  week: string
  e1rm: number
}

interface ExerciseE1rmChartProps {
  data: ChartPoint[]
}

export const ExerciseE1rmChart = ({ data }: ExerciseE1rmChartProps) => {
  if (data.length === 0) return null

  return (
    <div className="h-56 w-full rounded-xl border border-border bg-card p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="week" stroke="#a1a1aa" fontSize={11} />
          <YAxis stroke="#a1a1aa" fontSize={11} width={36} />
          <Tooltip contentStyle={{ background: '#111113', border: '1px solid #27272a' }} />
          <Line type="monotone" dataKey="e1rm" stroke="#fbbf24" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
