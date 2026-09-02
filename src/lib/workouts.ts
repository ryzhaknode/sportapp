import type { WorkoutType } from '@/lib/cycle'

export type ExerciseVariant = 'standard' | 'elevated_feet' | 'deficit'

export interface WorkoutTemplate {
  type: WorkoutType
  label: string
  description: string
  sets: number
  repRange: [number, number]
  rir: string
  restSeconds: number
  defaultReps: number[]
}

export const EXERCISE_VARIANTS: Record<ExerciseVariant, string> = {
  standard: 'Звичайні віджимання',
  elevated_feet: 'Ноги на підвищенні',
  deficit: 'Deficit push-ups',
}

export const WORKOUT_TEMPLATES: Record<WorkoutType, WorkoutTemplate> = {
  A: {
    type: 'A',
    label: 'Стимул',
    description: 'Важке тренування',
    sets: 4,
    repRange: [14, 16],
    rir: '1–2',
    restSeconds: 150,
    defaultReps: [15, 15, 14, 14],
  },
  B: {
    type: 'B',
    label: 'Обсяг',
    description: 'Накопичення обсягу',
    sets: 5,
    repRange: [11, 13],
    rir: '2–3',
    restSeconds: 105,
    defaultReps: [12, 12, 12, 11, 11],
  },
  C: {
    type: 'C',
    label: 'Відновлення',
    description: 'Легкий стимул',
    sets: 3,
    repRange: [10, 12],
    rir: '3–4',
    restSeconds: 105,
    defaultReps: [10, 10, 10],
  },
}

export const WORKOUT_COLORS: Record<WorkoutType, string> = {
  A: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  B: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  C: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
}

export const WORKOUT_ACCENT: Record<WorkoutType, string> = {
  A: 'text-amber-400',
  B: 'text-blue-400',
  C: 'text-emerald-400',
}

export const DELOAD_TEMPLATE = {
  sets: 3,
  defaultReps: [12, 12, 12],
  rir: '~4',
  restSeconds: 120,
}

export const calcTotalReps = (reps: number[]): number =>
  reps.reduce((sum, n) => sum + n, 0)

export const isAtUpperBound = (type: WorkoutType, reps: number[]): boolean => {
  const template = WORKOUT_TEMPLATES[type]
  const upper = template.repRange[1]
  return reps.length === template.sets && reps.every((r) => r >= upper)
}

export const formatSetsDisplay = (reps: number[]): string => reps.join(' / ')
