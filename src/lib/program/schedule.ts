import type { WorkoutTemplateCode } from '@/lib/db/schema'
import { CYCLE_LENGTH_WEEKS } from '@/lib/program/seed'
import { parseLocalDate } from '@/lib/utils'

/**
 * Workouts go A → B → C → A… whenever they happen: no weekdays, no calendar
 * weeks. One A-B-C round is a cycle; the 13-step program counts cycles.
 */
export const WORKOUT_ORDER: readonly WorkoutTemplateCode[] = ['A', 'B', 'C']

/** The workout after the last completed one (A to begin with). */
export const getNextWorkoutCode = (lastCode: WorkoutTemplateCode | null): WorkoutTemplateCode =>
  lastCode
    ? WORKOUT_ORDER[(WORKOUT_ORDER.indexOf(lastCode) + 1) % WORKOUT_ORDER.length]
    : 'A'

/**
 * 0-based A-B-C cycle a new session of `code` belongs to, given how many A
 * sessions were completed since the program start. A opens a cycle; B and C
 * belong to the cycle of the last A.
 */
export const getCycleIndex = (code: WorkoutTemplateCode, completedA: number): number =>
  code === 'A' ? completedA : Math.max(0, completedA - 1)

/** Position of a cycle within the program: 1–13, then again from 1. */
export const getProgramCycle = (cycleIndex: number): number =>
  (cycleIndex % CYCLE_LENGTH_WEEKS) + 1

export const daysSince = (fromDate: string, toDate: string): number => {
  const a = parseLocalDate(fromDate)
  const b = parseLocalDate(toDate)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** The match is later than `date` but less than 48 hours away. */
export const isMatchWithin48h = (matchDate: string | null, date: string): boolean => {
  if (!matchDate) return false
  const hours = (parseLocalDate(matchDate).getTime() - parseLocalDate(date).getTime()) / 3_600_000
  return hours > 0 && hours < 48
}
