import { diffDays, formatDateLocal, parseLocalDate } from '@/lib/utils'

export const CYCLE = ['A', 'rest', 'B', 'rest', 'C', 'rest'] as const

export type CycleDay = (typeof CYCLE)[number]
export type WorkoutType = 'A' | 'B' | 'C'

export const isWorkoutDay = (day: CycleDay): day is WorkoutType => day !== 'rest'

const getCycleIndex = (startDate: string, date: string, cycleOffset: number): number => {
  const days = diffDays(startDate, date)
  if (days < 0) return -1
  return (days + cycleOffset) % CYCLE.length
}

export const getCycleDay = (
  startDate: string,
  date: string,
  cycleOffset = 0,
): CycleDay => {
  const index = getCycleIndex(startDate, date, cycleOffset)
  if (index < 0) return 'rest'
  return CYCLE[index]
}

export const getNextWorkoutDate = (
  startDate: string,
  fromDate: string,
  cycleOffset = 0,
): string => {
  let cursor = parseLocalDate(fromDate)
  for (let i = 0; i < 14; i += 1) {
    const dateStr = formatDateLocal(cursor)
    const day = getCycleDay(startDate, dateStr, cycleOffset)
    if (isWorkoutDay(day)) return dateStr
    cursor = new Date(cursor.getTime() + 86_400_000)
  }
  return fromDate
}

export const getNextWorkoutType = (
  startDate: string,
  fromDate: string,
  cycleOffset = 0,
): WorkoutType => {
  const date = getNextWorkoutDate(startDate, fromDate, cycleOffset)
  const day = getCycleDay(startDate, date, cycleOffset)
  if (isWorkoutDay(day)) return day
  return 'A'
}

export const addDays = (dateStr: string, days: number): string => {
  const date = parseLocalDate(dateStr)
  date.setDate(date.getDate() + days)
  return formatDateLocal(date)
}

export const getMonthRange = (year: number, month: number): { from: string; to: string } => {
  const from = formatDateLocal(new Date(year, month, 1))
  const to = formatDateLocal(new Date(year, month + 1, 0))
  return { from, to }
}

export const getCalendarDays = (year: number, month: number): string[] => {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const days: string[] = []

  for (let i = startPad; i > 0; i -= 1) {
    const d = new Date(year, month, 1 - i)
    days.push(formatDateLocal(d))
  }

  for (let d = 1; d <= last.getDate(); d += 1) {
    days.push(formatDateLocal(new Date(year, month, d)))
  }

  while (days.length % 7 !== 0) {
    const next = new Date(year, month + 1, days.length - startPad - last.getDate() + 1)
    days.push(formatDateLocal(next))
  }

  return days
}
