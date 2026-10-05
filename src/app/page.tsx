import { PageMain } from '@/components/layout/page-main'
import { HomeWorkoutSection } from '@/components/home/home-workout-section'
import { StaleSessionBanner } from '@/components/home/stale-session-banner'
import { getSettings } from '@/lib/db/settings'
import { getTemplateCodeForSession } from '@/lib/db/session-template-code'
import {
  getHomeExercisePreviews,
  getInProgressSession,
  getTodayCompletedSessionForCode,
  isSessionStale,
} from '@/lib/db/workout-sessions'
import type { WorkoutTemplateCode } from '@/lib/db/schema'
import {
  getNextWorkoutCode,
  getNextWorkoutDate,
  getWeekNumber,
  getWorkoutForDate,
  isMatchWithin48h,
} from '@/lib/program/schedule'
import { getWeekContext } from '@/lib/program/week-cycle'
import { formatDateLocal, formatDisplayDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const isWorkoutCode = (v: string | undefined): v is WorkoutTemplateCode =>
  v === 'A' || v === 'B' || v === 'C'

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams
  const today = formatDateLocal(new Date())
  const settings = await getSettings()
  const nextDate = getNextWorkoutDate(today)
  const nextCode = getWorkoutForDate(nextDate) ?? getNextWorkoutCode(today)
  const weekNumber = getWeekNumber(settings.programStartDate, today)
  const weekContext = getWeekContext(weekNumber, settings.tournamentWeekEnabled)
  const scheduledToday = getWorkoutForDate(today)

  const [previewA, previewB, previewC, completedA, completedB, completedC, inProgress] =
    await Promise.all([
      getHomeExercisePreviews('A'),
      getHomeExercisePreviews('B'),
      getHomeExercisePreviews('C'),
      getTodayCompletedSessionForCode('A'),
      getTodayCompletedSessionForCode('B'),
      getTodayCompletedSessionForCode('C'),
      getInProgressSession(),
    ])

  const continueSessionCode = inProgress
    ? await getTemplateCodeForSession(inProgress.id)
    : null

  const matchCode = scheduledToday ?? nextCode
  const matchWarning =
    settings.matchDate &&
    (matchCode === 'A' || matchCode === 'B') &&
    isMatchWithin48h(settings.matchDate, today)

  const workoutParam = params?.workout
  const workoutStr = Array.isArray(workoutParam) ? workoutParam[0] : workoutParam
  const initialFromUrl = isWorkoutCode(workoutStr) ? workoutStr : undefined

  return (
    <PageMain>
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Трекер гіпертрофії</p>
        <h1 className="text-[1.625rem] font-bold leading-tight">Головна</h1>
        <p className="text-sm text-muted-foreground">{formatDisplayDate(today)}</p>
      </header>

      {matchWarning && (
        <div
          className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          Сьогодні {matchCode} (з ногами) менше ніж за 48 год до матчу — можливо, варто перенести.
        </div>
      )}

      {scheduledToday == null && !inProgress && (
        <p className="rounded-xl border border-border bg-card/50 px-3 py-2 text-center text-sm text-muted-foreground">
          Сьогодні за планом відпочинок. Наступне: {nextCode} — {formatDisplayDate(nextDate)}. Можеш
          обрати будь-яке тренування нижче.
        </p>
      )}

      {inProgress && isSessionStale(inProgress) && (
        <StaleSessionBanner sessionId={inProgress.id} />
      )}

      {!(inProgress && isSessionStale(inProgress)) && (
        <HomeWorkoutSection
          scheduledToday={scheduledToday}
          weekNumber={weekNumber}
          mode={weekContext.mode}
          previews={{ A: previewA, B: previewB, C: previewC }}
          completedSessionId={{
            A: completedA?.id ?? null,
            B: completedB?.id ?? null,
            C: completedC?.id ?? null,
          }}
          continueSessionId={
            inProgress && !isSessionStale(inProgress) ? inProgress.id : null
          }
          continueSessionCode={continueSessionCode}
          initialCode={initialFromUrl}
        />
      )}
    </PageMain>
  )
}
