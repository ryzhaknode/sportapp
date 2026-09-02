import Link from 'next/link'
import { AlertTriangle, Smartphone } from 'lucide-react'
import { TrainingCalendar } from '@/components/calendar/training-calendar'
import { CalendarLegend } from '@/components/calendar/calendar-legend'
import { RestDayView } from '@/components/dashboard/rest-day-view'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { TodayCard } from '@/components/dashboard/today-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildCalendarMonth } from '@/lib/calendar-build'
import { getCycleDay, getNextWorkoutDate, isWorkoutDay } from '@/lib/cycle'
import { shouldSuggestMaxTest } from '@/lib/db/max-tests'
import { getAllSkippedDates } from '@/lib/db/skipped-days'
import { getAllSessions, getSessionByDate, getLatestSessionsByType, parseSets } from '@/lib/db/sessions'
import { getSettings } from '@/lib/db/settings'
import type { ExerciseVariant } from '@/lib/workouts'
import { EXERCISE_VARIANTS } from '@/lib/workouts'
import { getMobileUrl } from '@/lib/mobile-url'
import { formatDateLocal, formatShortDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const today = formatDateLocal(new Date())
  const now = new Date()
  const appSettings = await getSettings()
  const variant = appSettings.currentVariant as ExerciseVariant
  const cycleOffset = appSettings.cycleOffset ?? 0
  const cycleDay = getCycleDay(appSettings.startDate, today, cycleOffset)
  const todaySession = isWorkoutDay(cycleDay)
    ? await getSessionByDate(today)
    : null
  const latest = await getLatestSessionsByType(variant)
  const suggestMaxTest = await shouldSuggestMaxTest(variant)

  const allSessions = await getAllSessions(variant)
  const skippedDates = await getAllSkippedDates()

  const sessionsByDate: Record<string, { totalReps: number; type: string; completedAt: string | null }> = {}
  for (const s of allSessions) {
    sessionsByDate[s.date] = {
      totalReps: s.totalReps,
      type: s.type,
      completedAt: s.completedAt,
    }
  }

  const sessionsMap = new Map(
    allSessions.map((s) => [
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

  const stats = (['A', 'B', 'C'] as const).map((type) => {
    const session = latest[type]
    return {
      type,
      totalReps: session?.totalReps ?? null,
      sets: session ? parseSets(session.sets).map((s) => s.reps) : null,
      date: session ? formatShortDate(session.date) : null,
    }
  })

  const nextWorkoutDate = getNextWorkoutDate(appSettings.startDate, today, cycleOffset)
  const nextWorkoutDay = getCycleDay(appSettings.startDate, nextWorkoutDate, cycleOffset)
  const mobileUrl = getMobileUrl()

  return (
    <main className="flex flex-col gap-6 px-4 py-6">
      <Link
        href={mobileUrl ?? '/settings'}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
      >
        <Smartphone className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
        <span className="truncate">
          {mobileUrl ? `Мобільний доступ: ${mobileUrl}` : 'Налаштувати мобільний доступ'}
        </span>
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Push-up Tracker</p>
        <h1 className="text-2xl font-bold">Сьогодні</h1>
        <p className="text-sm text-muted-foreground">
          {EXERCISE_VARIANTS[variant]}
        </p>
      </header>

      {suggestMaxTest && (
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 transition-colors hover:bg-amber-500/15"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Минуло 6+ тижнів від останнього max test. Час перевірити максимум.</span>
        </Link>
      )}

      {isWorkoutDay(cycleDay) ? (
        <TodayCard
          date={today}
          type={cycleDay}
          completed={!!todaySession?.completedAt}
          totalReps={todaySession?.totalReps}
        />
      ) : (
        <RestDayView
          date={today}
          nextWorkoutDate={formatShortDate(nextWorkoutDate)}
          nextWorkoutType={isWorkoutDay(nextWorkoutDay) ? nextWorkoutDay : 'A'}
        />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Календар</CardTitle>
        </CardHeader>
        <CardContent>
          <TrainingCalendar
            initialMonth={initialMonth}
            sessionsByDate={sessionsByDate}
            skippedDates={skippedDates}
            compact
          />
          <div className="mt-4">
            <CalendarLegend />
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Останні total reps</h2>
        <StatsCards stats={stats} />
      </section>
    </main>
  )
}
