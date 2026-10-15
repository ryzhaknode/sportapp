import type { ExerciseSlot } from '@/lib/db/schema'
import type { ProgressionStatus } from '@/lib/program/types'
import { daysSince } from '@/lib/program/schedule'
import { decreaseWeight, roundToIncrement, totalReps } from '@/lib/progression/weight'

export interface CompletedSetLog {
  weight: number
  reps: number
  rir: number
  status: 'done'
}

export interface ExerciseLogSnapshot {
  weight: number
  sets: CompletedSetLog[]
}

export interface ProgressionInput {
  slot: Pick<
    ExerciseSlot,
    'repMin' | 'repMax' | 'rirMin' | 'rirMax' | 'startWeight' | 'increment'
  >
  lastLog: ExerciseLogSnapshot | null
  prevLog: ExerciseLogSnapshot | null
  stallCount: number
  daysSinceLastSession: number | null
  targetSets: number
}

export interface ProgressionResult {
  status: ProgressionStatus
  suggestedWeight: number | null
  suggestedRepTarget: number
  stallCount: number
  hint: string
}

const bestRepsPerSet = (log: ExerciseLogSnapshot): number =>
  Math.max(...log.sets.map((s) => s.reps))

export const evaluateProgression = (input: ProgressionInput): ProgressionResult => {
  const { slot, lastLog, prevLog, targetSets } = input
  let stallCount = input.stallCount

  const startWeight = slot.startWeight ?? 0

  if (lastLog === null) {
    return {
      status: 'first',
      suggestedWeight: slot.startWeight,
      suggestedRepTarget: slot.repMin,
      stallCount: 0,
      hint: 'Стартова вага з програми',
    }
  }

  if (input.daysSinceLastSession !== null && input.daysSinceLastSession > 14) {
    return {
      status: 'repeat',
      suggestedWeight: lastLog.weight,
      suggestedRepTarget: bestRepsPerSet(lastLog) + 1,
      stallCount: 0,
      hint: 'Перерва понад 14 днів — повторити без підвищення ваги',
    }
  }

  const doneSets = lastLog.sets
  if (doneSets.length < targetSets) {
    return {
      status: 'repeat',
      suggestedWeight: lastLog.weight,
      suggestedRepTarget: bestRepsPerSet(lastLog) + 1,
      stallCount,
      hint: 'Неповне виконання — повторити',
    }
  }

  const allTopWithRir = doneSets.every(
    (s) => s.reps >= slot.repMax && s.rir >= slot.rirMin,
  )

  const atRepMaxLowRir = doneSets.every((s) => s.reps >= slot.repMax)

  if (atRepMaxLowRir && !allTopWithRir) {
    return {
      status: 'repeat',
      suggestedWeight: lastLog.weight,
      suggestedRepTarget: slot.repMax,
      stallCount: 0,
      hint: 'Верх діапазону, але запас нижче цілі',
    }
  }

  if (allTopWithRir) {
    const next = roundToIncrement(lastLog.weight + slot.increment, slot.increment)
    return {
      status: 'increase_weight',
      suggestedWeight: next,
      suggestedRepTarget: slot.repMin,
      stallCount: 0,
      hint: `Усі підходи ${slot.repMax}+ з запасом ≥${slot.rirMin}`,
    }
  }

  // Compare only the sets both sessions have, so a week with an extra set
  // doesn't make the following normal week look like a stall (or vice versa).
  const commonSets = prevLog !== null ? Math.min(doneSets.length, prevLog.sets.length) : 0
  const lastTotal = totalReps(doneSets.slice(0, commonSets).map((s) => s.reps))
  const prevTotal =
    prevLog !== null ? totalReps(prevLog.sets.slice(0, commonSets).map((s) => s.reps)) : null

  if (prevLog !== null && lastLog.weight === prevLog.weight && prevTotal !== null && lastTotal <= prevTotal) {
    stallCount += 1
  } else {
    stallCount = 0
  }

  if (stallCount >= 2) {
    const next = decreaseWeight(lastLog.weight || startWeight, slot.increment)
    return {
      status: 'decrease_weight',
      suggestedWeight: next,
      suggestedRepTarget: slot.repMin,
      stallCount: 0,
      hint: 'Застій 2 тренування поспіль',
    }
  }

  return {
    status: 'add_reps',
    suggestedWeight: lastLog.weight,
    suggestedRepTarget: bestRepsPerSet(lastLog) + 1,
    stallCount,
    hint: 'Та сама вага — додай повтори',
  }
}

export interface ProgressionHistoryEntry {
  date: string
  snapshot: ExerciseLogSnapshot
  /** Planned (non-extra) sets in that session. */
  targetSets: number
}

/**
 * Replays the whole history (newest first) so the stall count is derived from
 * the logged sessions themselves rather than from separately persisted state.
 */
export const evaluateProgressionHistory = (input: {
  slot: ProgressionInput['slot']
  history: ProgressionHistoryEntry[]
  today: string
}): ProgressionResult => {
  const { slot, history, today } = input

  let result = evaluateProgression({
    slot,
    lastLog: null,
    prevLog: null,
    stallCount: 0,
    daysSinceLastSession: null,
    targetSets: 0,
  })

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i]
    const nextDate = i === 0 ? today : history[i - 1].date
    result = evaluateProgression({
      slot,
      lastLog: entry.snapshot,
      prevLog: history[i + 1]?.snapshot ?? null,
      stallCount: result.stallCount,
      daysSinceLastSession: daysSince(entry.date, nextDate),
      targetSets: entry.targetSets,
    })
  }

  return result
}
