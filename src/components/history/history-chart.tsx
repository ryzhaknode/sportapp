'use client'

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { WorkoutType } from '@/lib/cycle'
import { formatShortDate } from '@/lib/utils'

interface SessionPoint {
  date: string
  type: WorkoutType
  totalReps: number
}

interface HistoryChartProps {
  sessions: SessionPoint[]
}

const COLORS: Record<WorkoutType, string> = {
  A: '#fbbf24',
  B: '#60a5fa',
  C: '#34d399',
}

export const HistoryChart = ({ sessions }: HistoryChartProps) => {
  const [filter, setFilter] = useState<WorkoutType | 'all'>('all')

  const chartData = useMemo(() => {
    const filtered =
      filter === 'all' ? sessions : sessions.filter((s) => s.type === filter)

    const byDate = new Map<string, { date: string; A?: number; B?: number; C?: number }>()

    for (const session of filtered) {
      const existing = byDate.get(session.date) ?? { date: session.date }
      existing[session.type] = session.totalReps
      byDate.set(session.date, existing)
    }

    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        ...row,
        label: formatShortDate(row.date),
      }))
  }, [sessions, filter])

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Ще немає записів. Почни перше тренування!
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">Total reps</CardTitle>
        <div className="flex gap-1">
          {(['all', 'A', 'B', 'C'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                filter === key
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {key === 'all' ? 'Всі' : key}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.3)" />
              <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.3)" width={32} />
              <Tooltip
                contentStyle={{
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              {(filter === 'all' || filter === 'A') && (
                <Line type="monotone" dataKey="A" stroke={COLORS.A} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              )}
              {(filter === 'all' || filter === 'B') && (
                <Line type="monotone" dataKey="B" stroke={COLORS.B} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              )}
              {(filter === 'all' || filter === 'C') && (
                <Line type="monotone" dataKey="C" stroke={COLORS.C} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
