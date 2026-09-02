import { getCycleDay, isWorkoutDay, type WorkoutType } from '@/lib/cycle'

export type DayStatus =
  | 'completed'
  | 'rest'
  | 'skipped'
  | 'pending'
  | 'future_workout'
  | 'future_rest'

export interface DayStatusInput {
  date: string
  startDate: string
  cycleOffset: number
  today: string
  hasSession: boolean
  isManuallySkipped: boolean
}

export const getDayStatus = ({
  date,
  startDate,
  cycleOffset,
  today,
  hasSession,
  isManuallySkipped,
}: DayStatusInput): DayStatus => {
  if (hasSession) return 'completed'

  const cycleDay = getCycleDay(startDate, date, cycleOffset)
  const isWorkout = isWorkoutDay(cycleDay)
  const isPast = date < today
  const isToday = date === today
  const isFuture = date > today

  if (isManuallySkipped && isWorkout) return 'skipped'

  if (isWorkout && isPast) return 'skipped'

  if (isWorkout && isToday) return 'pending'

  if (isWorkout && isFuture) return 'future_workout'

  if (!isWorkout && isFuture) return 'future_rest'

  return 'rest'
}

export const DAY_STATUS_COLORS: Record<DayStatus, string> = {
  completed: 'bg-emerald-500',
  rest: 'bg-zinc-600',
  skipped: 'bg-red-500',
  pending: 'bg-amber-500/20 ring-2 ring-amber-500',
  future_workout: 'bg-secondary ring-1 ring-border',
  future_rest: 'bg-transparent',
}

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  completed: 'Виконано',
  rest: 'Відпочинок',
  skipped: 'Пропуск',
  pending: 'Сьогодні — тренування',
  future_workout: 'Заплановано',
  future_rest: 'Відпочинок',
}

export const getScheduledType = (
  startDate: string,
  date: string,
  cycleOffset: number,
): WorkoutType | 'rest' => {
  const day = getCycleDay(startDate, date, cycleOffset)
  return isWorkoutDay(day) ? day : 'rest'
}

export const canMarkSkipped = (
  status: DayStatus,
  date: string,
  today: string,
): boolean => {
  if (date > today) return false
  return status === 'pending' || status === 'skipped' || status === 'future_workout'
}

export const canStartWorkout = (
  status: DayStatus,
  scheduledType: WorkoutType | 'rest',
): boolean => {
  if (status === 'completed') return true
  if (status === 'pending') return true
  if (scheduledType === 'rest' && status === 'rest') return true
  return false
}
