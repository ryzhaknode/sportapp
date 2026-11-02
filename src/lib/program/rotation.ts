import type { ExerciseSlot } from '@/lib/db/schema'
import { MAX_GAP_DAYS } from '@/lib/progression/evaluate'
import type { SlotHistory } from '@/lib/progression/history'

/**
 * A rotating slot runs every other session of its workout, so its own sessions
 * are twice as far apart. Rotation groups in the program are pairs.
 */
export const maxGapDaysFor = (slot: Pick<ExerciseSlot, 'rotationGroup'>): number =>
  slot.rotationGroup ? MAX_GAP_DAYS * 2 : MAX_GAP_DAYS

/** Latest completed session where the slot was actually done (not skipped). */
const lastDone = (history: SlotHistory, slotId: number) =>
  (history.get(slotId) ?? []).find((e) => e.logStatus !== 'skipped') ?? null

/**
 * Slots a new session of the workout runs, in program order: every slot outside
 * a rotation group, and one slot per group — the one after the member done most
 * recently, or the first member before any of them was done. A skipped
 * exercise doesn't count as done, so it comes up again next time.
 */
export const selectSessionSlots = <T extends Pick<ExerciseSlot, 'id' | 'rotationGroup'>>(
  slots: T[],
  history: SlotHistory,
): T[] => {
  const groups = new Map<string, T[]>()
  for (const slot of slots) {
    if (!slot.rotationGroup) continue
    const members = groups.get(slot.rotationGroup)
    if (members) members.push(slot)
    else groups.set(slot.rotationGroup, [slot])
  }

  const dueIds = new Set<number>()
  for (const members of groups.values()) {
    let latestIndex = -1
    let latest: { date: string; sessionId: number } | null = null
    for (const [i, slot] of members.entries()) {
      const entry = lastDone(history, slot.id)
      if (!entry) continue
      if (
        !latest ||
        entry.date > latest.date ||
        (entry.date === latest.date && entry.sessionId > latest.sessionId)
      ) {
        latest = entry
        latestIndex = i
      }
    }
    dueIds.add(members[(latestIndex + 1) % members.length].id)
  }

  return slots.filter((slot) => !slot.rotationGroup || dueIds.has(slot.id))
}
