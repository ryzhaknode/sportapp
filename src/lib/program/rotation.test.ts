import { describe, expect, it } from 'vitest'
import { getRotationPhase, maxGapDaysFor, selectSessionSlots } from '@/lib/program/rotation'
import { SEED_EXERCISES, SEED_WORKOUTS } from '@/lib/program/seed'

describe('getRotationPhase', () => {
  // 2026-09-01 is a Tuesday: weeks run Monday–Sunday regardless of the start day.
  const start = '2026-09-01'

  it('keeps one phase for a whole Monday–Sunday week', () => {
    expect(getRotationPhase(start, '2026-08-31')).toBe(0)
    expect(getRotationPhase(start, '2026-09-01')).toBe(0)
    expect(getRotationPhase(start, '2026-09-06')).toBe(0)
  })

  it('flips every Monday', () => {
    expect(getRotationPhase(start, '2026-09-07')).toBe(1)
    expect(getRotationPhase(start, '2026-09-11')).toBe(1)
    expect(getRotationPhase(start, '2026-09-14')).toBe(0)
    // Across the 13-week cycle boundary too (week 13 → week 1 of the next cycle).
    expect(getRotationPhase(start, '2026-11-23')).toBe(0)
    expect(getRotationPhase(start, '2026-11-30')).toBe(1)
  })
})

describe('selectSessionSlots', () => {
  const slots = [
    { id: 1, rotationGroup: null, rotationPhase: null },
    { id: 2, rotationGroup: 'pull', rotationPhase: 0 },
    { id: 3, rotationGroup: 'pull', rotationPhase: 1 },
    { id: 4, rotationGroup: null, rotationPhase: null },
  ]

  it('runs fixed slots and the group members of the phase, in order', () => {
    expect(selectSessionSlots(slots, 0).map((s) => s.id)).toEqual([1, 2, 4])
    expect(selectSessionSlots(slots, 1).map((s) => s.id)).toEqual([1, 3, 4])
  })
})

describe('program rotation', () => {
  const name = (key: string) => SEED_EXERCISES.find((e) => e.key === key)!.name
  const week = (phase: 0 | 1) =>
    Object.fromEntries(
      SEED_WORKOUTS.map((w) => [
        w.code,
        selectSessionSlots(w.slots, phase).map((s) => name(s.exerciseKey)),
      ]),
    )

  it('every rotation group has one member per phase', () => {
    for (const workout of SEED_WORKOUTS) {
      const groups = new Map<string, number[]>()
      for (const slot of workout.slots) {
        if (!slot.rotationGroup) continue
        groups.set(slot.rotationGroup, [...(groups.get(slot.rotationGroup) ?? []), slot.rotationPhase!])
      }
      for (const phases of groups.values()) expect(phases.sort()).toEqual([0, 1])
    }
  })

  it.each([0, 1] as const)('week phase %i: A and C complement each other', (phase) => {
    const { A, B, C } = week(phase)
    const pullupsInA = A.includes(name('pull_weighted'))
    expect(C.includes(name('lat_pulldown'))).toBe(pullupsInA)
    expect(A.includes(name('lat_pulldown'))).toBe(!pullupsInA)

    const barbellCurlInA = A.includes(name('curl'))
    expect(C.includes(name('cable_curl'))).toBe(barbellCurlInA)
    expect(C.includes(name('curl'))).toBe(!barbellCurlInA)

    // One seated cable row a week: in B or in C, never both.
    expect([B, C].filter((w) => w.includes(name('row_cable')))).toHaveLength(1)
  })
})

describe('maxGapDaysFor', () => {
  it('doubles the gap for a rotating slot', () => {
    expect(maxGapDaysFor({ rotationGroup: null })).toBe(14)
    expect(maxGapDaysFor({ rotationGroup: 'pull' })).toBe(28)
  })
})
