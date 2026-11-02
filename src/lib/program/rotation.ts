import type { ExerciseSlot } from '@/lib/db/schema'
import { MAX_GAP_DAYS } from '@/lib/progression/evaluate'
import { daysSince } from '@/lib/program/schedule'
import { formatDateLocal, parseLocalDate } from '@/lib/utils'

/**
 * A rotating slot runs every other week, so its own sessions are twice as far
 * apart. Rotation groups in the program are pairs.
 */
export const maxGapDaysFor = (slot: Pick<ExerciseSlot, 'rotationGroup'>): number =>
  slot.rotationGroup ? MAX_GAP_DAYS * 2 : MAX_GAP_DAYS

/** Monday of the calendar week that contains `date`. */
const mondayOf = (date: string): string => {
  const d = parseLocalDate(date)
  return formatDateLocal(new Date(d.getTime() - ((d.getDay() + 6) % 7) * 86_400_000))
}

/**
 * Which variant week `date` falls in: 0 or 1, flipping every Monday–Sunday
 * week counted from the program start. A whole week shares one phase, so A, B
 * and C of that week pick variants that complement each other.
 */
export const getRotationPhase = (programStartDate: string, date: string): 0 | 1 => {
  const weeks = Math.floor(daysSince(mondayOf(programStartDate), mondayOf(date)) / 7)
  return weeks % 2 === 0 ? 0 : 1
}

/**
 * Slots a session of the workout runs in week phase `phase`, in program order:
 * every slot outside a rotation group, and the group members of that phase.
 */
export const selectSessionSlots = <
  T extends { rotationGroup?: string | null; rotationPhase?: number | null },
>(
  slots: T[],
  phase: 0 | 1,
): T[] => slots.filter((slot) => !slot.rotationGroup || slot.rotationPhase === phase)
