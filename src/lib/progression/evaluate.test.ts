import { describe, expect, it } from 'vitest'
import { evaluateProgression } from '@/lib/progression/evaluate'

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
