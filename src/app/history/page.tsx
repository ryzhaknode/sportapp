import { HistoryChart } from '@/components/history/history-chart'
import { SessionList } from '@/components/history/session-list'
import { TrainingCalendar } from '@/components/calendar/training-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildCalendarMonth } from '@/lib/calendar-build'
import { getAllSkippedDates } from '@/lib/db/skipped-days'
import { getAllSessions, getLastSessionByType, parseSets } from '@/lib/db/sessions'
import { getSettings } from '@/lib/db/settings'
import type { ExerciseVariant } from '@/lib/workouts'
import type { WorkoutType } from '@/lib/cycle'
import { formatDateLocal } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const today = formatDateLocal(new Date())
  const now = new Date()
  const appSettings = await getSettings()
  const variant = appSettings.currentVariant as ExerciseVariant
  const cycleOffset = appSettings.cycleOffset ?? 0
  const sessions = await getAllSessions(variant)
  const skippedDates = await getAllSkippedDates()

  const sessionsByDate: Record<string, { totalReps: number; type: string; completedAt: string | null }> = {}
  for (const s of sessions) {
    sessionsByDate[s.date] = {
      totalReps: s.totalReps,
      type: s.type,
      completedAt: s.completedAt,
    }
  }

  const sessionsMap = new Map(
    sessions.map((s) => [
      s.date,
      { totalReps: s.totalReps, type: s.type, completedAt: s.completedAt },
    ]),
  )
  const skippedSet = new Set(skippedDates)

  const initialMonth = buildCalendarMonth({
    year: now.getFullYear(),
    month: now.getMonth(),
    startDate: appSettings.startDate,
    cycleOffset,
    today,
    sessions: sessionsMap,
    skippedSet,
  })

  const chartSessions = sessions.map((s) => ({
    date: s.date,
    type: s.type as WorkoutType,
    totalReps: s.totalReps,
  }))

  const listSessions = await Promise.all(
    sessions.map(async (session) => {
      const previous = await getLastSessionByType(
        session.type as WorkoutType,
        variant,
        session.date,
      )
      const delta = previous ? session.totalReps - previous.totalReps : null

      return {
        id: session.id,
        date: session.date,
        type: session.type as WorkoutType,
        totalReps: session.totalReps,
        sets: parseSets(session.sets).map((s) => s.reps),
        delta,
      }
    }),
  )

  return (
    <main className="flex min-w-0 flex-col gap-6 overflow-x-hidden px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">Прогрес</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Календар, графік і історія сесій
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Календар тренувань</CardTitle>
        </CardHeader>
        <CardContent>
          <TrainingCalendar
            initialMonth={initialMonth}
            sessionsByDate={sessionsByDate}
            skippedDates={skippedDates}
          />
        </CardContent>
      </Card>

      <HistoryChart sessions={chartSessions} />
      <SessionList sessions={listSessions} />
    </main>
  )
}
