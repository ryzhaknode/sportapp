import { PageMain } from '@/components/layout/page-main'
import { HomeWorkoutSection } from '@/components/home/home-workout-section'
import { StaleSessionBanner } from '@/components/home/stale-session-banner'
import { getSettings } from '@/lib/db/settings'
import { getTemplateCodeForSession } from '@/lib/db/session-template-code'
import {
  getCycleState,
  getCyclePosition,
  getHomeExercisePreviews,
  getInProgressSession,
  getTodayCompletedSessionForCode,
  isSessionStale,
} from '@/lib/db/workout-sessions'
import type { SessionMode, WorkoutTemplateCode } from '@/lib/db/schema'
import { getNextWorkoutCode, isMatchWithin48h, WORKOUT_ORDER } from '@/lib/program/schedule'
import { getWeekContext } from '@/lib/program/week-cycle'
import { formatDisplayDate, todayInAppTz } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const isWorkoutCode = (v: string | undefined): v is WorkoutTemplateCode =>
  v === 'A' || v === 'B' || v === 'C'

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams
  const today = todayInAppTz()
  const settings = await getSettings()
  const cycleState = await getCycleState(settings.programStartDate)
  const nextCode = getNextWorkoutCode(cycleState.lastCode)
  const cycles = Object.fromEntries(
    WORKOUT_ORDER.map((code) => {
      const { weekNumber } = getCyclePosition(cycleState, code)
      const { mode } = getWeekContext(weekNumber, settings.tournamentWeekEnabled)
      return [code, { number: weekNumber, mode }]
    }),
  ) as Record<WorkoutTemplateCode, { number: number; mode: SessionMode }>

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

  const matchWarning =
    settings.matchDate &&
    (nextCode === 'A' || nextCode === 'B') &&
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
          Наступне — {nextCode} (з ногами), а до матчу менше ніж 48 год — можливо, варто перенести.
        </div>
      )}

      {inProgress && isSessionStale(inProgress) && (
        <StaleSessionBanner sessionId={inProgress.id} />
      )}

      {!(inProgress && isSessionStale(inProgress)) && (
        <HomeWorkoutSection
          nextCode={nextCode}
          cycles={cycles}
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
