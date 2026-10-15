import { getTemplateByCode } from '@/lib/db/program'
import {
  getPreviousCompletedSession,
  getProgressionForSlot,
  loadSessionDetail,
} from '@/lib/db/workout-sessions'
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

export const buildWorkoutSummary = async (sessionId: number): Promise<WorkoutSummaryData | null> => {
  const detail = await loadSessionDetail(sessionId)
  if (!detail || !detail.session.finishedAt) return null

  const prevSession = await getPreviousCompletedSession(
    detail.session.workoutTemplateId,
    sessionId,
  )
  const prevDetail =
    prevSession && prevSession.id !== sessionId
      ? await loadSessionDetail(prevSession.id)
      : null

  const started = new Date(detail.session.startedAt).getTime()
  const finished = new Date(detail.session.finishedAt).getTime()
  const durationSec = Math.max(0, Math.floor((finished - started) / 1000))

  let tonnage = 0
  let prevTonnage = 0
  let progressCount = 0
  const rows: ExerciseSummaryRow[] = []

  for (const ex of detail.exercises) {
    const wt = ex.weightType as WeightType
    const done = ex.sets.filter((s) => s.status === 'done')
    tonnage += calcTonnage(done)

    const prevEx = prevDetail?.exercises.find((p) => p.exerciseSlotId === ex.exerciseSlotId)
    const prevDone = prevEx?.sets.filter((s) => s.status === 'done') ?? []
    if (prevDone.length) prevTonnage += calcTonnage(prevDone)

    const { resultLabel, resultTone, isPr, progressed } = compareExerciseResult(done, prevDone)
    if (progressed) progressCount += 1

    const progression = await getProgressionForSlot(
      ex.exerciseSlotId,
      detail.session.workoutTemplateId,
    )

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

  const template = await getTemplateByCode(detail.templateCode)

  return {
    templateCode: detail.templateCode,
    durationSec,
    setCount: detail.exercises.reduce((n, e) => n + e.sets.filter((s) => s.status === 'done').length, 0),
    tonnage,
    tonnageDelta: prevDetail ? tonnage - prevTonnage : null,
    progressCount,
    totalExercises: template?.slots.length ?? detail.exercises.length,
    rows,
  }
}
