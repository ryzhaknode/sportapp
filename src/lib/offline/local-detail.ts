import type { ExerciseLogRow, SessionDetail } from '@/lib/db/workout-sessions'
import type { LocalWorkoutRecord } from '@/lib/offline/types'
import type { WorkoutSession } from '@/lib/db/schema'

export const localRecordToSessionDetail = (record: LocalWorkoutRecord): SessionDetail => {
  const session = {
    id: 0,
    workoutTemplateId: record.templateId,
    date: record.date,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    weekNumber: record.weekNumber,
    mode: record.mode,
    status: record.status === 'in_progress' ? 'in_progress' : 'completed',
    note: record.note,
  } satisfies WorkoutSession

  const exercises: ExerciseLogRow[] = record.exercises.map((ex) => ({
    id: ex.localLogId,
    exerciseSlotId: ex.exerciseSlotId,
    sortOrder: ex.sortOrder,
    status: ex.status,
    skipReason: ex.skipReason,
    suggestedWeight: ex.suggestedWeight,
    suggestedStatus: ex.suggestedStatus,
    exerciseName: ex.exerciseName,
    weightType: ex.weightType,
    slot: ex.slot,
    effectiveSets: ex.effectiveSets,
    repMin: ex.repMin,
    repMax: ex.repMax,
    rirMin: ex.rirMin,
    rirMax: ex.rirMax,
    restSec: ex.restSec,
    lastTimeDisplay: ex.lastTimeDisplay,
    progressionHint: ex.progressionHint,
    sets: ex.sets.map((s) => ({
      id: s.localSetId,
      setIndex: s.setIndex,
      weight: s.weight,
      reps: s.reps,
      rir: s.rir,
      status: s.status,
      isExtra: s.isExtra,
      skipReason: s.skipReason,
      completedAt: s.completedAt,
    })),
  }))

  return {
    session,
    templateCode: record.templateCode,
    exercises,
    restTimer: record.restTimer,
  }
}
