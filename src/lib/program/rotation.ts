import type { ExerciseSlot } from '@/lib/db/schema'
import { MAX_GAP_DAYS } from '@/lib/progression/evaluate'

/**
 * A rotating slot runs every other A-B-C cycle, so its own sessions are twice
 * as far apart. Rotation groups in the program are pairs.
 */
export const maxGapDaysFor = (slot: Pick<ExerciseSlot, 'rotationGroup'>): number =>
  slot.rotationGroup ? MAX_GAP_DAYS * 2 : MAX_GAP_DAYS

/**
 * Which variant a cycle runs: 0 or 1, flipping every A-B-C cycle. A, B and C
 * of one cycle share the phase, so they pick variants that complement each other.
 */
export const getRotationPhase = (cycleIndex: number): 0 | 1 => (cycleIndex % 2 === 0 ? 0 : 1)

/**
 * Slots a session of the workout runs in rotation phase `phase`, in program
 * order: every slot outside a rotation group, and the group members of that phase.
 */
export const selectSessionSlots = <
  T extends { rotationGroup?: string | null; rotationPhase?: number | null },
>(
  slots: T[],
  phase: 0 | 1,
): T[] => slots.filter((slot) => !slot.rotationGroup || slot.rotationPhase === phase)
