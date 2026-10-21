import type { ExerciseSlot, SessionMode } from '@/lib/db/schema'
import type { WeightType } from '@/lib/program/types'
import { countsTowardProgression } from '@/lib/program/week-cycle'
import type { ExerciseLogSnapshot, ProgressionHistoryEntry } from '@/lib/progression/evaluate'
import { formatLastTimeDisplay } from '@/lib/workout-last-display'

export interface HistorySet {
  setIndex: number
  weight: number | null
  reps: number | null
  rir: number | null
  status: string
  isExtra: boolean
}

/** One row of the completed-sessions ⋈ exercise_logs ⋈ set_logs join (newest session first). */
export interface HistoryRow {
  sessionId: number
  date: string
  mode: SessionMode
  logId: number
  slotId: number
  logStatus: string
  suggestedWeight: number | null
  set: HistorySet | null
}

/** A slot's log in one completed session, with its sets ordered by setIndex. */
export interface SlotHistoryEntry {
  sessionId: number
  date: string
  mode: SessionMode
  logStatus: string
  suggestedWeight: number | null
  sets: HistorySet[]
}

/** Completed history per exercise slot, newest session first. */
export type SlotHistory = Map<number, SlotHistoryEntry[]>

export interface LastSetValues {
  weight: number
  reps: number
  rir: number
}

/**
 * Groups the flat join rows by slot, keeping the rows' session order. A session
 * contributes one log per slot (the first one seen), like the per-session
 * `.limit(1)` lookups this replaces.
 */
export const groupHistoryBySlot = (rows: HistoryRow[]): SlotHistory => {
  const bySlot: SlotHistory = new Map()
  const entryByKey = new Map<string, { logId: number; entry: SlotHistoryEntry }>()

  for (const row of rows) {
    const key = `${row.sessionId}:${row.slotId}`
    let found = entryByKey.get(key)
    if (!found) {
      found = {
        logId: row.logId,
        entry: {
          sessionId: row.sessionId,
          date: row.date,
          mode: row.mode,
          logStatus: row.logStatus,
          suggestedWeight: row.suggestedWeight,
          sets: [],
        },
      }
      entryByKey.set(key, found)
      const list = bySlot.get(row.slotId)
      if (list) list.push(found.entry)
      else bySlot.set(row.slotId, [found.entry])
    }
    if (row.logId === found.logId && row.set) found.entry.sets.push(row.set)
  }

  for (const { entry } of entryByKey.values()) {
    entry.sets.sort((a, b) => a.setIndex - b.setIndex)
  }
  return bySlot
}

const buildLogSnapshot = (
  weight: number,
  sets: { weight: number | null; reps: number | null; rir: number | null; status: string }[],
): ExerciseLogSnapshot | null => {
  const done = sets.filter(
    (s) => s.status === 'done' && s.reps != null && s.rir != null && s.weight != null,
  )
  if (done.length === 0) return null
  const w = weight ?? done[0].weight!
  return {
    weight: w,
    sets: done.map((s) => ({
      weight: s.weight!,
      reps: s.reps!,
      rir: s.rir!,
      status: 'done' as const,
    })),
  }
}

/** History that feeds weight progression: normal-week, non-skipped logs only. */
export const toProgressionHistory = (
  entries: SlotHistoryEntry[],
  slot: Pick<ExerciseSlot, 'startWeight'>,
): ProgressionHistoryEntry[] => {
  const history: ProgressionHistoryEntry[] = []

  for (const entry of entries) {
    if (!countsTowardProgression(entry.mode)) continue
    if (entry.logStatus === 'skipped') continue

    const plannedSets = entry.sets.filter((s) => !s.isExtra)
    const doneSets = plannedSets.filter((s) => s.status === 'done')
    const weight =
      doneSets.find((s) => s.weight != null)?.weight ??
      entry.suggestedWeight ??
      slot.startWeight ??
      0

    const snap = buildLogSnapshot(weight, doneSets)
    if (snap) history.push({ date: entry.date, snapshot: snap, targetSets: plannedSets.length })
  }

  return history
}

/** Planned sets from the latest session that has any done, to prefill a new session. */
export const pickLastCompletedSets = (entries: SlotHistoryEntry[]): LastSetValues[] | null => {
  for (const entry of entries) {
    if (entry.logStatus === 'skipped') continue

    const done = entry.sets.filter(
      (s) => s.status === 'done' && !s.isExtra && s.reps != null && s.weight != null,
    )
    if (done.length === 0) continue

    return done.map((s) => ({
      weight: s.weight!,
      reps: s.reps!,
      rir: s.rir ?? 2,
    }))
  }
  return null
}

/** "Last time" line from the latest session where the exercise wasn't skipped. */
export const pickLastTimeDisplay = (
  entries: SlotHistoryEntry[],
  weightType: WeightType,
): string | null => {
  const entry = entries.find((e) => e.logStatus !== 'skipped')
  if (!entry) return null
  return formatLastTimeDisplay(entry.sets, weightType)
}
