import { estimateE1rm, totalReps } from '@/lib/progression/weight'

interface SetResult {
  weight: number | null
  reps: number | null
}

export interface ExerciseComparison {
  resultLabel: string
  resultTone: 'good' | 'neutral' | 'bad'
  isPr: boolean
  /** More reps than last time or a new e1RM PR — counted once per exercise. */
  progressed: boolean
}

const bestE1rm = (sets: SetResult[]): number =>
  Math.max(0, ...sets.map((s) => estimateE1rm(s.weight ?? 0, s.reps ?? 0)))

export const compareExerciseResult = (
  done: SetResult[],
  prevDone: SetResult[],
): ExerciseComparison => {
  const todayTotal = totalReps(done.map((s) => s.reps ?? 0))
  const prevTotal = totalReps(prevDone.map((s) => s.reps ?? 0))

  let resultTone: ExerciseComparison['resultTone'] = 'neutral'
  let resultLabel = 'Без змін'
  if (todayTotal > prevTotal && prevDone.length) {
    resultTone = 'good'
    resultLabel = `+${todayTotal - prevTotal} повторів`
  } else if (todayTotal < prevTotal && prevDone.length) {
    resultTone = 'bad'
    resultLabel = `${todayTotal - prevTotal} повторів`
  } else if (done.length && !prevDone.length) {
    resultLabel = 'Перший запис'
  }

  const todayBest = bestE1rm(done)
  const isPr = todayBest > 0 && (!prevDone.length || todayBest > bestE1rm(prevDone))

  return { resultLabel, resultTone, isPr, progressed: resultTone === 'good' || isPr }
}
