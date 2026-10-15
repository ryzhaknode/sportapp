import { describe, expect, it } from 'vitest'
import { evaluateProgression, evaluateProgressionHistory } from '@/lib/progression/evaluate'

const slot = {
  repMin: 6,
  repMax: 10,
  rirMin: 1,
  rirMax: 2,
  startWeight: 65,
  increment: 2.5,
}

describe('evaluateProgression', () => {
  it('scenario 1: all top reps with RIR → increase weight', () => {
    const lastLog = {
      weight: 65,
      sets: [
        { weight: 65, reps: 10, rir: 2, status: 'done' as const },
        { weight: 65, reps: 10, rir: 2, status: 'done' as const },
        { weight: 65, reps: 10, rir: 2, status: 'done' as const },
        { weight: 65, reps: 10, rir: 2, status: 'done' as const },
      ],
    }
    const result = evaluateProgression({
      slot,
      lastLog,
      prevLog: null,
      stallCount: 0,
      daysSinceLastSession: 3,
      targetSets: 4,
    })
    expect(result.status).toBe('increase_weight')
    expect(result.suggestedWeight).toBe(67.5)
  })

  it('scenario 3: stall twice → decrease weight', () => {
    const lastLog = {
      weight: 65,
      sets: [
        { weight: 65, reps: 8, rir: 2, status: 'done' as const },
        { weight: 65, reps: 8, rir: 2, status: 'done' as const },
        { weight: 65, reps: 7, rir: 2, status: 'done' as const },
        { weight: 65, reps: 6, rir: 2, status: 'done' as const },
      ],
    }
    const prevLog = {
      weight: 65,
      sets: [
        { weight: 65, reps: 8, rir: 2, status: 'done' as const },
        { weight: 65, reps: 8, rir: 2, status: 'done' as const },
        { weight: 65, reps: 7, rir: 2, status: 'done' as const },
        { weight: 65, reps: 6, rir: 2, status: 'done' as const },
      ],
    }
    const result = evaluateProgression({
      slot,
      lastLog,
      prevLog,
      stallCount: 1,
      daysSinceLastSession: 3,
      targetSets: 4,
    })
    expect(result.status).toBe('decrease_weight')
    expect(result.suggestedWeight).toBe(57.5)
  })

  it('scenario 12: 14+ days → repeat', () => {
    const lastLog = {
      weight: 65,
      sets: [{ weight: 65, reps: 10, rir: 2, status: 'done' as const }],
    }
    const result = evaluateProgression({
      slot,
      lastLog,
      prevLog: null,
      stallCount: 0,
      daysSinceLastSession: 20,
      targetSets: 4,
    })
    expect(result.status).toBe('repeat')
  })
})

const sessionSets = (weight: number, reps: number[]) => ({
  weight,
  sets: reps.map((r) => ({ weight, reps: r, rir: 2, status: 'done' as const })),
})

describe('evaluateProgressionHistory', () => {
  it('3 identical sessions at the same weight → decrease weight', () => {
    const stalled = sessionSets(65, [8, 8, 7, 6])
    const result = evaluateProgressionHistory({
      slot,
      history: [
        { date: '2026-10-12', snapshot: stalled, targetSets: 4 },
        { date: '2026-10-05', snapshot: stalled, targetSets: 4 },
        { date: '2026-09-28', snapshot: stalled, targetSets: 4 },
      ],
      today: '2026-10-15',
    })
    expect(result.status).toBe('decrease_weight')
    expect(result.suggestedWeight).toBe(57.5)
  })

  it('2 identical sessions only add reps', () => {
    const stalled = sessionSets(65, [8, 8, 7, 6])
    const result = evaluateProgressionHistory({
      slot,
      history: [
        { date: '2026-10-12', snapshot: stalled, targetSets: 4 },
        { date: '2026-10-05', snapshot: stalled, targetSets: 4 },
      ],
      today: '2026-10-15',
    })
    expect(result.status).toBe('add_reps')
    expect(result.stallCount).toBe(1)
  })

  it('rep progress between sessions resets the stall', () => {
    const result = evaluateProgressionHistory({
      slot,
      history: [
        { date: '2026-10-12', snapshot: sessionSets(65, [8, 8, 7, 7]), targetSets: 4 },
        { date: '2026-10-05', snapshot: sessionSets(65, [8, 8, 7, 6]), targetSets: 4 },
        { date: '2026-09-28', snapshot: sessionSets(65, [8, 8, 7, 6]), targetSets: 4 },
      ],
      today: '2026-10-15',
    })
    expect(result.status).toBe('add_reps')
    expect(result.stallCount).toBe(0)
  })

  it('uses each session’s own planned set count, not the upcoming one', () => {
    // Last session was an extra-set week (5 planned, 5 done); the next week is back to 4.
    const result = evaluateProgressionHistory({
      slot,
      history: [
        { date: '2026-10-12', snapshot: sessionSets(65, [9, 9, 8, 8, 7]), targetSets: 5 },
        { date: '2026-10-05', snapshot: sessionSets(65, [9, 8, 8, 7, 7]), targetSets: 5 },
      ],
      today: '2026-10-15',
    })
    expect(result.status).toBe('add_reps')
  })

  it('an extra set does not count as a stall when the next week has fewer sets', () => {
    const result = evaluateProgressionHistory({
      slot,
      history: [
        { date: '2026-10-12', snapshot: sessionSets(65, [9, 9, 8, 8]), targetSets: 4 },
        { date: '2026-10-05', snapshot: sessionSets(65, [9, 8, 8, 7, 7]), targetSets: 5 },
      ],
      today: '2026-10-15',
    })
    expect(result.status).toBe('add_reps')
    expect(result.stallCount).toBe(0)
  })

  it('no history → first', () => {
    const result = evaluateProgressionHistory({ slot, history: [], today: '2026-10-15' })
    expect(result.status).toBe('first')
    expect(result.suggestedWeight).toBe(65)
  })
})
