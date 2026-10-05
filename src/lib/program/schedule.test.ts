import { describe, expect, it } from 'vitest'
import { getWeekNumber, getWorkoutForDate } from '@/lib/program/schedule'

describe('schedule', () => {
  it('maps Mon/Wed/Fri to A/B/C', () => {
    expect(getWorkoutForDate('2026-10-05')).toBe('A')
    expect(getWorkoutForDate('2026-10-07')).toBe('B')
    expect(getWorkoutForDate('2026-10-09')).toBe('C')
    expect(getWorkoutForDate('2026-10-06')).toBeNull()
  })

  it('week number wraps 1-13', () => {
    expect(getWeekNumber('2026-10-05', '2026-10-05')).toBe(1)
    expect(getWeekNumber('2026-10-05', '2026-11-02')).toBe(5)
  })
})
