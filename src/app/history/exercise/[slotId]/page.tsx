import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { ExerciseE1rmChart } from '@/components/history/exercise-e1rm-chart'
import { getDb } from '@/lib/db'
import { exerciseLogs, setLogs, workoutSessions } from '@/lib/db/schema'
import { getSlotById } from '@/lib/db/program'
import { estimateE1rm, formatWeight } from '@/lib/progression/weight'
import type { WeightType } from '@/lib/program/types'

export const dynamic = 'force-dynamic'

export default async function ExerciseHistoryPage({
  params,
}: PageProps<'/history/exercise/[slotId]'>) {
  const { slotId: slotIdStr } = await params
  const slotId = Number(slotIdStr)
  if (!Number.isFinite(slotId)) notFound()

  const slot = await getSlotById(slotId)
  if (!slot) notFound()

  const db = getDb()
  const logs = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.exerciseSlotId, slotId))

  const chartPoints: { week: string; e1rm: number }[] = []

  for (const log of logs) {
    const sess = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, log.sessionId))
      .limit(1)
    if (sess[0]?.status !== 'completed') continue

    const sets = await db
      .select()
      .from(setLogs)
      .where(eq(setLogs.exerciseLogId, log.id))
      .orderBy(asc(setLogs.setIndex))

    const done = sets.filter((s) => s.status === 'done')
    if (!done.length) continue

    const best = Math.max(...done.map((s) => estimateE1rm(s.weight ?? 0, s.reps ?? 0)))
    chartPoints.push({
      week: `T${sess[0].weekNumber}`,
      e1rm: Math.round(best * 10) / 10,
    })
  }

  const wt = slot.exercise.weightType as WeightType
  const target =
    slot.twelveWeekTargetMin != null
      ? `${formatWeight(slot.twelveWeekTargetMin, wt)} – ${slot.twelveWeekTargetMax != null ? formatWeight(slot.twelveWeekTargetMax, wt) : '?'} × ${slot.targetReps ?? 6}`
      : null

  const currentWeight = slot.startWeight

  return (
    <main className="flex flex-col gap-6 px-4 py-6 pb-24">
      <header>
        <h1 className="text-xl font-bold">{slot.exercise.name}</h1>
        {target && (
          <p className="mt-1 text-sm text-muted-foreground">
            Ціль 12 тижнів: {target}
            {currentWeight != null && (
              <> · зараз старт {formatWeight(currentWeight, wt)}</>
            )}
          </p>
        )}
      </header>

      {chartPoints.length > 0 ? (
        <ExerciseE1rmChart data={chartPoints} />
      ) : (
        <p className="text-sm text-muted-foreground">Недостатньо даних для графіка.</p>
      )}
    </main>
  )
}
