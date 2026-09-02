import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WorkoutType } from '@/lib/cycle'
import { WORKOUT_COLORS, formatSetsDisplay } from '@/lib/workouts'
import { formatDisplayDate } from '@/lib/utils'

interface SessionItem {
  id: number
  date: string
  type: WorkoutType
  totalReps: number
  sets: number[]
  delta: number | null
}

interface SessionListProps {
  sessions: SessionItem[]
}

export const SessionList = ({ sessions }: SessionListProps) => {
  if (sessions.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Історія сесій</h2>
      {sessions.map((session) => (
        <Card key={session.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge className={WORKOUT_COLORS[session.type]}>{session.type}</Badge>
                <span className="truncate text-sm text-muted-foreground">
                  {formatDisplayDate(session.date)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatSetsDisplay(session.sets)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xl font-bold tabular-nums">{session.totalReps}</span>
              {session.delta !== null && session.delta !== 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    session.delta > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {session.delta > 0 ? (
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  )}
                  {session.delta > 0 ? '+' : ''}
                  {session.delta}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
