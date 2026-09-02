import Link from 'next/link'
import { WorkoutSession } from '@/components/workout/workout-session'
import { Card, CardContent } from '@/components/ui/card'
import {
  getCycleDay,
  getNextWorkoutType,
  isWorkoutDay,
} from '@/lib/cycle'
import {
  getInitialReps,
  getLastSessionByType,
  getSessionByDate,
  parseSets,
} from '@/lib/db/sessions'
import { getSettings } from '@/lib/db/settings'
import {
  DELOAD_TEMPLATE,
  WORKOUT_TEMPLATES,
  type ExerciseVariant,
} from '@/lib/workouts'
import { formatDateLocal } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface WorkoutPageProps {
  searchParams: Promise<{ deload?: string; skipRest?: string }>
}

export default async function WorkoutPage({ searchParams }: WorkoutPageProps) {
  const params = await searchParams
  const isDeload = params.deload === '1'
  const skipRest = params.skipRest === '1'
  const today = formatDateLocal(new Date())
  const appSettings = await getSettings()
  const variant = appSettings.currentVariant as ExerciseVariant
  const cycleOffset = appSettings.cycleOffset ?? 0
  const cycleDay = getCycleDay(appSettings.startDate, today, cycleOffset)

  const isRestToday = !isWorkoutDay(cycleDay)

  if (isRestToday && !skipRest) {
    return (
      <main className="flex flex-col items-center gap-6 px-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <span className="text-2xl" aria-hidden="true">🌙</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Сьогодні відпочинок</h1>
          <p className="mt-2 text-muted-foreground">
            Можеш відпочити або пропустити rest day і тренуватись.
          </p>
        </div>
        <Link
          href="/workout?skipRest=1"
          className="inline-flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-foreground px-5 text-sm font-medium text-background hover:opacity-90"
        >
          Пропустити відпочинок і тренуватись
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          На головну
        </Link>
      </main>
    )
  }

  const type = skipRest && isRestToday
    ? getNextWorkoutType(appSettings.startDate, today, cycleOffset)
    : (cycleDay as 'A' | 'B' | 'C')

  const template = WORKOUT_TEMPLATES[type]
  const existing = await getSessionByDate(today)
  const previous = await getLastSessionByType(type, variant, today)

  let initialReps: number[]
  if (existing) {
    initialReps = parseSets(existing.sets).map((s) => s.reps)
  } else if (isDeload) {
    initialReps = [...DELOAD_TEMPLATE.defaultReps]
  } else {
    initialReps = await getInitialReps(type, variant)
  }

  const effectiveTemplate = isDeload
    ? {
        ...template,
        sets: DELOAD_TEMPLATE.sets,
        restSeconds: DELOAD_TEMPLATE.restSeconds,
        rir: DELOAD_TEMPLATE.rir,
      }
    : template

  return (
    <main className="px-4 py-6">
      {skipRest && isRestToday && !existing && (
        <Card className="mb-4 border-blue-500/20">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Пропущено відпочинок — тренування {type}. Після збереження цикл зміститься на 1 день.
          </CardContent>
        </Card>
      )}

      {!existing && !isDeload && !skipRest && (
        <div className="mb-4">
          <Link
            href="/workout?deload=1"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Deload: полегшена сесія 3×12
          </Link>
        </div>
      )}

      {isDeload && (
        <Card className="mb-4 border-amber-500/20">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Deload режим — тримаємо RIR ~4, без форсування прогресії.
          </CardContent>
        </Card>
      )}

      <WorkoutSession
        date={today}
        type={type}
        variant={variant}
        template={effectiveTemplate}
        initialReps={initialReps}
        previousReps={previous ? parseSets(previous.sets).map((s) => s.reps) : null}
        previousTotal={previous?.totalReps ?? null}
        existingCompleted={!!existing?.completedAt}
        isDeload={isDeload}
        skipRest={skipRest && isRestToday && !existing?.completedAt}
      />
    </main>
  )
}
