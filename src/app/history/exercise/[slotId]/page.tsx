import { notFound } from 'next/navigation'
import { ExerciseE1rmChart } from '@/components/history/exercise-e1rm-chart'
import { getSlotById } from '@/lib/db/program'
import { getExerciseE1rmPoints } from '@/lib/db/workout-sessions'
import { formatWeight } from '@/lib/progression/weight'
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

  const chartPoints = await getExerciseE1rmPoints(slotId)

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
