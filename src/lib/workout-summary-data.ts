import {
  loadTemplateHistory,
  progressionFromHistory,
  type SessionDetail,
} from '@/lib/db/workout-sessions'
import type { SlotHistoryEntry } from '@/lib/progression/history'
import { calcTonnage, formatWeight } from '@/lib/progression/weight'
import { compareExerciseResult } from '@/lib/workout-summary-compare'
import type { WeightType } from '@/lib/program/types'
import { PROGRESSION_LABELS, type ProgressionStatus } from '@/lib/program/types'

export interface ExerciseSummaryRow {
  name: string
  lastDisplay: string
  todayDisplay: string
  resultLabel: string
  resultTone: 'good' | 'neutral' | 'bad'
  nextHint: string
  isPr: boolean
}

export interface WorkoutSummaryData {
  templateCode: string
  durationSec: number
  setCount: number
  tonnage: number
  tonnageDelta: number | null
  progressCount: number
  totalExercises: number
  rows: ExerciseSummaryRow[]
}

const formatSets = (sets: { weight: number | null; reps: number | null }[], wt: WeightType): string => {
  const w = sets[0]?.weight
  const prefix =
    w != null ? (wt === 'bodyweight_plus' && w === 0 ? 'BW' : `${w} kg`) : '?'
  const reps = sets.map((s) => s.reps ?? '—').join(', ')
  return `${prefix} × ${reps}`
}

/**
 * Done sets from the last earlier session that did this slot. Rotating slots
 * skip sessions of their workout, so this isn't simply the previous session.
 */
const previousDoneSets = (
  entries: SlotHistoryEntry[],
  session: SessionDetail['session'],
): SlotHistoryEntry['sets'] => {
  for (const entry of entries) {
    const earlier =
      entry.date < session.date || (entry.date === session.date && entry.sessionId < session.id)
    if (!earlier) continue
    const done = entry.sets.filter((s) => s.status === 'done')
    if (done.length) return done
  }
  return []
}

export const buildWorkoutSummary = async (
  detail: SessionDetail,
): Promise<WorkoutSummaryData | null> => {
  if (!detail.session.finishedAt) return null
  const history = await loadTemplateHistory(detail.session.workoutTemplateId)

  const started = new Date(detail.session.startedAt).getTime()
  const finished = new Date(detail.session.finishedAt).getTime()
  const durationSec = Math.max(0, Math.floor((finished - started) / 1000))

  let tonnage = 0
  let prevTonnage = 0
  let hasPrev = false
  let progressCount = 0
  const rows: ExerciseSummaryRow[] = []

  for (const ex of detail.exercises) {
    const wt = ex.weightType as WeightType
    const done = ex.sets.filter((s) => s.status === 'done')
    tonnage += calcTonnage(done)

    const prevDone = previousDoneSets(history.get(ex.exerciseSlotId) ?? [], detail.session)
    if (prevDone.length) {
      hasPrev = true
      prevTonnage += calcTonnage(prevDone)
    }

    const { resultLabel, resultTone, isPr, progressed } = compareExerciseResult(done, prevDone)
    if (progressed) progressCount += 1

    const progression = progressionFromHistory(history, ex.slot)

    const status = progression.status as ProgressionStatus
    const nextHint =
      status === 'increase_weight'
        ? `↑ ${formatWeight(progression.suggestedWeight, wt)}`
        : status === 'add_reps'
          ? `${formatWeight(progression.suggestedWeight, wt)}, +reps`
          : PROGRESSION_LABELS[status]

    rows.push({
      name: ex.exerciseName,
      lastDisplay: prevDone.length ? formatSets(prevDone, wt) : '—',
      todayDisplay: done.length ? formatSets(done, wt) : '—',
      resultLabel,
      resultTone,
      nextHint,
      isPr,
    })
  }

  return {
    templateCode: detail.templateCode,
    durationSec,
    setCount: detail.exercises.reduce((n, e) => n + e.sets.filter((s) => s.status === 'done').length, 0),
    tonnage,
    tonnageDelta: hasPrev ? tonnage - prevTonnage : null,
    progressCount,
    totalExercises: detail.exercises.length,
    rows,
  }
}
