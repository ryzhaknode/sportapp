import { describe, expect, it } from 'vitest'
import type { SessionMode } from '@/lib/db/schema'
import {
  groupHistoryBySlot,
  pickLastCompletedSets,
  pickLastTimeDisplay,
  prefillSetValues,
  toProgressionHistory,
  type HistoryRow,
  type HistorySet,
  type SlotHistoryEntry,
} from '@/lib/progression/history'

const set = (setIndex: number, patch: Partial<HistorySet> = {}): HistorySet => ({
  setIndex,
  weight: 60,
  reps: 8,
  rir: 2,
  status: 'done',
  isExtra: false,
  ...patch,
})

const entry = (patch: Partial<SlotHistoryEntry> = {}): SlotHistoryEntry => ({
  sessionId: 1,
  date: '2026-10-01',
  mode: 'normal',
  logStatus: 'done',
  suggestedWeight: null,
  sets: [set(0), set(1)],
  ...patch,
})

const row = (
  sessionId: number,
  slotId: number,
  logId: number,
  s: HistorySet | null,
  mode: SessionMode = 'normal',
): HistoryRow => ({
  sessionId,
  date: `2026-10-${String(sessionId).padStart(2, '0')}`,
  mode,
  logId,
  slotId,
  logStatus: 'done',
  suggestedWeight: null,
  set: s,
})

describe('groupHistoryBySlot', () => {
  it('keeps session order per slot and sorts sets by setIndex', () => {
    const grouped = groupHistoryBySlot([
      row(3, 10, 30, set(1)),
      row(3, 10, 30, set(0)),
      row(3, 11, 31, set(0)),
      row(2, 10, 20, set(0)),
    ])

    expect(grouped.get(10)?.map((e) => e.sessionId)).toEqual([3, 2])
    expect(grouped.get(10)?.[0].sets.map((s) => s.setIndex)).toEqual([0, 1])
    expect(grouped.get(11)?.map((e) => e.sessionId)).toEqual([3])
  })

  it('keeps a log without sets as an entry with no sets', () => {
    const grouped = groupHistoryBySlot([row(1, 10, 1, null)])
    expect(grouped.get(10)).toEqual([expect.objectContaining({ sessionId: 1, sets: [] })])
  })

  it('uses only the first log of a slot within one session', () => {
    const grouped = groupHistoryBySlot([
      row(1, 10, 5, set(0, { reps: 8 })),
      row(1, 10, 6, set(0, { reps: 12 })),
    ])
    expect(grouped.get(10)?.[0].sets.map((s) => s.reps)).toEqual([8])
  })
})

describe('toProgressionHistory', () => {
  const slot = { startWeight: 50 }

  it('skips non-normal weeks and skipped logs', () => {
    const history = toProgressionHistory(
      [
        entry({ sessionId: 4, mode: 'deload' }),
        entry({ sessionId: 3, mode: 'test' }),
        entry({ sessionId: 2, logStatus: 'skipped' }),
        entry({ sessionId: 1, date: '2026-09-01' }),
      ],
      slot,
    )
    expect(history.map((h) => h.date)).toEqual(['2026-09-01'])
  })

  it('ignores extra sets but counts every planned set as a target', () => {
    const [h] = toProgressionHistory(
      [
        entry({
          sets: [
            set(0),
            set(1, { status: 'skipped' }),
            set(2, { isExtra: true, reps: 20 }),
          ],
        }),
      ],
      slot,
    )
    expect(h.targetSets).toBe(2)
    expect(h.snapshot.sets.map((s) => s.reps)).toEqual([8])
  })

  it('takes the session weight from the first weighted done set', () => {
    expect(toProgressionHistory([entry({ sets: [set(0, { weight: null })] })], slot)).toEqual([])

    const [h] = toProgressionHistory(
      [entry({ suggestedWeight: 55, sets: [set(0, { weight: null }), set(1, { weight: 62.5 })] })],
      slot,
    )
    expect(h.snapshot.weight).toBe(62.5)
  })

  it('drops sessions whose done sets lack reps or RIR', () => {
    expect(toProgressionHistory([entry({ sets: [set(0, { rir: null })] })], slot)).toEqual([])
  })
})

describe('pickLastCompletedSets', () => {
  it('returns planned done sets of the latest session that has any, any mode', () => {
    const result = pickLastCompletedSets([
      entry({ sessionId: 3, logStatus: 'skipped' }),
      entry({ sessionId: 2, mode: 'deload', sets: [set(0, { status: 'skipped' })] }),
      entry({
        sessionId: 1,
        mode: 'deload',
        sets: [set(0, { rir: null }), set(1, { isExtra: true })],
      }),
    ])
    expect(result).toEqual([{ weight: 60, reps: 8, rir: 2 }])
  })

  it('returns null without usable history', () => {
    expect(pickLastCompletedSets([])).toBeNull()
  })
})

describe('pickLastTimeDisplay', () => {
  it('uses the latest non-skipped session', () => {
    const text = pickLastTimeDisplay(
      [
        entry({ logStatus: 'skipped', sets: [set(0, { weight: 99 })] }),
        entry({ sets: [set(0), set(1, { reps: 7 }), set(2, { isExtra: true })] }),
      ],
      'barbell',
    )
    expect(text).toBe('60 кг × 8, 7 (+1 додат.)')
  })

  it('is null when the latest non-skipped session has no done sets', () => {
    expect(
      pickLastTimeDisplay([entry({ sets: [] }), entry({ sets: [set(0)] })], 'barbell'),
    ).toBeNull()
  })
})

describe('prefillSetValues', () => {
  const lastSets = [
    { weight: 60, reps: 12, rir: 2 },
    { weight: 60, reps: 11, rir: 1 },
  ]
  const defaults = { startWeight: 40, rirMin: 2 }

  it('uses the new weight at repMin after increase_weight', () => {
    const progression = { status: 'increase_weight' as const, suggestedWeight: 62.5, suggestedRepTarget: 8 }
    expect(prefillSetValues(0, lastSets, progression, defaults)).toEqual({ weight: 62.5, reps: 8, rir: 2 })
    expect(prefillSetValues(1, lastSets, progression, defaults)).toEqual({ weight: 62.5, reps: 8, rir: 1 })
  })

  it('uses the lowered weight at repMin after decrease_weight', () => {
    const progression = { status: 'decrease_weight' as const, suggestedWeight: 55, suggestedRepTarget: 8 }
    expect(prefillSetValues(2, lastSets, progression, defaults)).toEqual({ weight: 55, reps: 8, rir: 1 })
  })

  it('repeats last per-set values when the weight stays', () => {
    const progression = { status: 'add_reps' as const, suggestedWeight: 60, suggestedRepTarget: 13 }
    expect(prefillSetValues(0, lastSets, progression, defaults)).toEqual({ weight: 60, reps: 12, rir: 2 })
    expect(prefillSetValues(3, lastSets, progression, defaults)).toEqual({ weight: 60, reps: 11, rir: 1 })
  })

  it('falls back to the suggestion, then start weight, without history', () => {
    expect(
      prefillSetValues(0, null, { status: 'first', suggestedWeight: null, suggestedRepTarget: 8 }, defaults),
    ).toEqual({ weight: 40, reps: 8, rir: 2 })
    expect(
      prefillSetValues(0, null, { status: 'repeat', suggestedWeight: 50, suggestedRepTarget: 9 }, defaults),
    ).toEqual({ weight: 50, reps: 9, rir: 2 })
  })
})
