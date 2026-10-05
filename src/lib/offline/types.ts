import type { Exercise, ExerciseSlot, SessionMode, SkipReason, WorkoutTemplateCode } from '@/lib/db/schema'
import type { ProgressionStatus, WeightType } from '@/lib/program/types'

export interface LastSetPrefill {
  weight: number
  reps: number
  rir: number
}

export interface SnapshotSlot {
  slot: ExerciseSlot
  exercise: Exercise
  suggestedWeight: number | null
  suggestedStatus: ProgressionStatus
  hint: string
  lastTimeDisplay: string | null
  lastSets: LastSetPrefill[] | null
}

export interface ProgramSnapshot {
  cachedAt: string
  programStartDate: string
  tournamentWeekEnabled: boolean
  timerSoundEnabled: boolean
  timerVibrationEnabled: boolean
  templates: Record<
    WorkoutTemplateCode,
    {
      templateId: number
      slots: SnapshotSlot[]
    }
  >
}

export interface LocalSetLog {
  localSetId: string
  setIndex: number
  weight: number | null
  reps: number | null
  rir: number | null
  status: 'pending' | 'done' | 'skipped'
  isExtra: boolean
  skipReason: SkipReason | null
  completedAt: string | null
}

export interface LocalExerciseLog {
  localLogId: string
  exerciseSlotId: number
  sortOrder: number
  status: 'pending' | 'done' | 'partial' | 'skipped'
  skipReason: SkipReason | null
  suggestedWeight: number | null
  suggestedStatus: string | null
  exerciseName: string
  weightType: WeightType
  slot: ExerciseSlot
  effectiveSets: number
  repMin: number
  repMax: number
  rirMin: number
  rirMax: number
  restSec: number
  lastTimeDisplay: string | null
  progressionHint: string | null
  sets: LocalSetLog[]
}

export type LocalSessionStatus = 'in_progress' | 'completed' | 'synced'

export interface LocalWorkoutRecord {
  localId: string
  templateCode: WorkoutTemplateCode
  templateId: number
  bodyWeightKg: number
  date: string
  weekNumber: number
  mode: SessionMode
  startedAt: string
  finishedAt: string | null
  status: LocalSessionStatus
  serverSessionId: number | null
  syncError: string | null
  note: string | null
  restTimer: { endsAt: string; label: string | null } | null
  exercises: LocalExerciseLog[]
}

export interface SyncSessionPayload {
  localId: string
  templateCode: WorkoutTemplateCode
  bodyWeightKg: number
  date: string
  startedAt: string
  finishedAt: string
  note?: string
  exercises: Array<{
    exerciseSlotId: number
    sortOrder: number
    status: LocalExerciseLog['status']
    skipReason: SkipReason | null
    suggestedWeight: number | null
    suggestedStatus: string | null
    sets: Array<{
      setIndex: number
      weight: number | null
      reps: number | null
      rir: number | null
      status: LocalSetLog['status']
      isExtra: boolean
      skipReason: SkipReason | null
      completedAt: string | null
    }>
  }>
}

export type SyncResult =
  | { ok: true; serverSessionId: number; alreadySynced?: boolean }
  | {
      ok: false
      code: 'DUPLICATE_DAY' | 'INVALID' | 'NOT_FINISHED'
      message: string
      existingSessionId?: number
    }
