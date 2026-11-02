import { describe, expect, it } from 'vitest'
import { maxGapDaysFor, selectSessionSlots } from '@/lib/program/rotation'
import type { SlotHistory, SlotHistoryEntry } from '@/lib/progression/history'

const slots = [
  { id: 1, rotationGroup: null },
  { id: 2, rotationGroup: 'pull' },
  { id: 3, rotationGroup: 'pull' },
  { id: 4, rotationGroup: null },
  { id: 5, rotationGroup: 'curl' },
  { id: 6, rotationGroup: 'curl' },
]

const entry = (sessionId: number, patch: Partial<SlotHistoryEntry> = {}): SlotHistoryEntry => ({
  sessionId,
  date: `2026-10-${String(sessionId).padStart(2, '0')}`,
  mode: 'normal',
  logStatus: 'done',
  suggestedWeight: null,
  sets: [],
  ...patch,
})

const ids = (history: SlotHistory) => selectSessionSlots(slots, history).map((s) => s.id)

describe('selectSessionSlots', () => {
  it('runs fixed slots and the first member of each group without history', () => {
    expect(ids(new Map())).toEqual([1, 2, 4, 5])
  })

  it('switches to the other member after one was done, and back', () => {
    const afterFirst: SlotHistory = new Map([
      [2, [entry(1)]],
      [5, [entry(1)]],
    ])
    expect(ids(afterFirst)).toEqual([1, 3, 4, 6])

    const afterSecond: SlotHistory = new Map([
      [2, [entry(1)]],
      [3, [entry(2)]],
      [5, [entry(1)]],
      [6, [entry(2)]],
    ])
    expect(ids(afterSecond)).toEqual([1, 2, 4, 5])
  })

  it('repeats a member that was skipped last time', () => {
    const history: SlotHistory = new Map([
      [2, [entry(1)]],
      [3, [entry(2, { logStatus: 'skipped' })]],
    ])
    expect(ids(history)).toContain(3)
  })

  it('orders same-day sessions by id', () => {
    const history: SlotHistory = new Map([
      [2, [entry(4, { date: '2026-10-10' })]],
      [3, [entry(3, { date: '2026-10-10' })]],
    ])
    expect(ids(history)).toContain(3)
  })

  it('treats each group on its own', () => {
    const history: SlotHistory = new Map([[2, [entry(1)]]])
    expect(ids(history)).toEqual([1, 3, 4, 5])
  })
})

describe('maxGapDaysFor', () => {
  it('doubles the gap for a rotating slot', () => {
    expect(maxGapDaysFor({ rotationGroup: null })).toBe(14)
    expect(maxGapDaysFor({ rotationGroup: 'pull' })).toBe(28)
  })
})
