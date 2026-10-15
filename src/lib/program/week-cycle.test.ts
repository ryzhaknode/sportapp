import { describe, expect, it } from 'vitest'
import { countsTowardProgression, getWeekContext } from '@/lib/program/week-cycle'

describe('countsTowardProgression', () => {
  it('excludes test, deload and tournament weeks', () => {
    expect(countsTowardProgression(getWeekContext(13, false).mode)).toBe(false)
    expect(countsTowardProgression(getWeekContext(7, false).mode)).toBe(false)
    expect(countsTowardProgression(getWeekContext(3, true).mode)).toBe(false)
  })

  it('includes regular weeks, including extra-set weeks', () => {
    expect(countsTowardProgression(getWeekContext(1, false).mode)).toBe(true)
    expect(countsTowardProgression(getWeekContext(10, false).mode)).toBe(true)
  })
})
