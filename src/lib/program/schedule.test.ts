import { describe, expect, it } from 'vitest'
import {
  getCycleIndex,
  getNextWorkoutCode,
  getProgramCycle,
  isMatchWithin48h,
} from '@/lib/program/schedule'

describe('schedule', () => {
  it('goes A → B → C → A after the last completed workout', () => {
    expect(getNextWorkoutCode(null)).toBe('A')
    expect(getNextWorkoutCode('A')).toBe('B')
    expect(getNextWorkoutCode('B')).toBe('C')
    expect(getNextWorkoutCode('C')).toBe('A')
  })

  it('A opens a cycle, B and C belong to the last A', () => {
    expect(getCycleIndex('A', 0)).toBe(0)
    expect(getCycleIndex('B', 0)).toBe(0)
    expect(getCycleIndex('B', 1)).toBe(0)
    expect(getCycleIndex('C', 1)).toBe(0)
    expect(getCycleIndex('A', 1)).toBe(1)
    expect(getCycleIndex('C', 5)).toBe(4)
  })

  it('program cycle wraps 1-13', () => {
    expect(getProgramCycle(0)).toBe(1)
    expect(getProgramCycle(12)).toBe(13)
    expect(getProgramCycle(13)).toBe(1)
  })

  it('warns about a match within 48 hours', () => {
    expect(isMatchWithin48h('2026-10-07', '2026-10-06')).toBe(true)
    expect(isMatchWithin48h('2026-10-08', '2026-10-06')).toBe(false)
    expect(isMatchWithin48h('2026-10-06', '2026-10-06')).toBe(false)
    expect(isMatchWithin48h(null, '2026-10-06')).toBe(false)
  })
})
