import type { SessionMode, WorkoutTemplateCode } from '@/lib/db/schema'

export type WeightType = 'barbell' | 'dumbbell_per_hand' | 'bodyweight_plus' | 'cable'

export interface SeedExercise {
  key: string
  name: string
  muscleGroup: string
  weightType: WeightType
}

export interface SeedSlot {
  exerciseKey: string
  sets: number
  repMin: number
  repMax: number
  rirMin: number
  rirMax: number
  restSec: number
  startWeight: number | null
  increment: number
  extraSetInPhase?: boolean
  twelveWeekTargetMin?: number
  twelveWeekTargetMax?: number
}

export interface SeedWorkout {
  code: WorkoutTemplateCode
  slots: SeedSlot[]
}

export interface WeekContext {
  weekNumber: number
  mode: SessionMode
  extraSetPhase: boolean
}

export type ProgressionStatus =
  | 'first'
  | 'increase_weight'
  | 'add_reps'
  | 'repeat'
  | 'decrease_weight'

export const PROGRESSION_LABELS: Record<ProgressionStatus, string> = {
  first: 'Перше виконання',
  increase_weight: '↑ Додати вагу',
  add_reps: '+ Додати повтори',
  repeat: '= Повторити',
  decrease_weight: '↓ Знизити вагу',
}

export const PROGRESSION_BADGE_CLASS: Record<ProgressionStatus, string> = {
  first: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  increase_weight: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  add_reps: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  repeat: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  decrease_weight: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

export const WORKOUT_CODE_COLORS: Record<WorkoutTemplateCode, string> = {
  A: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  B: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  C: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
}
