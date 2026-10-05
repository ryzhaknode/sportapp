import type { WorkoutTemplateCode } from '@/lib/db/schema'
import { formatDateLocal, parseLocalDate } from '@/lib/utils'

/** Monday=1 … Sunday=0 in JS getDay(); we map Mon/Wed/Fri */
const SCHEDULE: Record<number, WorkoutTemplateCode> = {
  1: 'A',
  3: 'B',
  5: 'C',
}

export const getWorkoutForDate = (date: string): WorkoutTemplateCode | null => {
  const day = parseLocalDate(date).getDay()
  return SCHEDULE[day] ?? null
}

export const getNextWorkoutDate = (fromDate: string): string => {
  let cursor = parseLocalDate(fromDate)
  for (let i = 0; i < 14; i += 1) {
    const dateStr = formatDateLocal(cursor)
    if (getWorkoutForDate(dateStr)) return dateStr
    cursor = new Date(cursor.getTime() + 86_400_000)
  }
  return fromDate
}

export const getNextWorkoutCode = (fromDate: string): WorkoutTemplateCode => {
  const date = getNextWorkoutDate(fromDate)
  return getWorkoutForDate(date) ?? 'A'
}

export const getWeekNumber = (programStartDate: string, date: string): number => {
  const start = parseLocalDate(programStartDate)
  const target = parseLocalDate(date)
  const diffMs = target.getTime() - start.getTime()
  const weekIndex = Math.floor(diffMs / (7 * 86_400_000))
  const week = (weekIndex % 13) + 1
  return week < 1 ? 1 : week
}

export const daysSince = (fromDate: string, toDate: string): number => {
  const a = parseLocalDate(fromDate)
  const b = parseLocalDate(toDate)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export const isMatchWithin48h = (matchDate: string | null, workoutDate: string): boolean => {
  if (!matchDate) return false
  const code = getWorkoutForDate(workoutDate)
  if (code !== 'A' && code !== 'B') return false
  const hours = (parseLocalDate(matchDate).getTime() - parseLocalDate(workoutDate).getTime()) / 3_600_000
  return hours > 0 && hours < 48
}
