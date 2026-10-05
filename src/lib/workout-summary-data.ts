import { getTemplateByCode } from '@/lib/db/program'
import { loadSessionDetail, getPreviousCompletedSession } from '@/lib/db/workout-sessions'
import { evaluateProgression } from '@/lib/progression/evaluate'
import { calcTonnage, estimateE1rm, formatWeight, totalReps } from '@/lib/progression/weight'
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

    const todayTotal = totalReps(done.map((s) => s.reps ?? 0))
    const prevTotal = totalReps(prevDone.map((s) => s.reps ?? 0))

    let resultTone: ExerciseSummaryRow['resultTone'] = 'neutral'
    let resultLabel = 'Без змін'
    if (todayTotal > prevTotal && prevDone.length) {
      resultTone = 'good'
      resultLabel = `+${todayTotal - prevTotal} повторів`
      progressCount += 1
    } else if (todayTotal < prevTotal && prevDone.length) {
      resultTone = 'bad'
      resultLabel = `${todayTotal - prevTotal} повторів`
    } else if (done.length && !prevDone.length) {
      resultLabel = 'Перший запис'
    }

    const progression = evaluateProgression({
      slot: ex.slot,
      lastLog:
        done.length > 0
          ? {
              weight: done[0].weight ?? 0,
              sets: done.map((s) => ({
                weight: s.weight ?? 0,
                reps: s.reps ?? 0,
                rir: s.rir ?? 0,
                status: 'done' as const,
              })),
            }
          : null,
      prevLog: null,
      stallCount: 0,
      daysSinceLastSession: 0,
      targetSets: ex.effectiveSets,
    })

    const status = progression.status as ProgressionStatus
    const nextHint =
      status === 'increase_weight'
        ? `↑ ${formatWeight(progression.suggestedWeight, wt)}`
        : status === 'add_reps'
          ? `${formatWeight(progression.suggestedWeight, wt)}, +reps`
          : PROGRESSION_LABELS[status]

    const bestE1rm = Math.max(
      0,
      ...done.map((s) => estimateE1rm(s.weight ?? 0, s.reps ?? 0)),
    )
    const isPr = bestE1rm > 0 && (!prevDone.length || bestE1rm > Math.max(...prevDone.map((s) => estimateE1rm(s.weight ?? 0, s.reps ?? 0))))

    if (isPr) progressCount += 1

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
