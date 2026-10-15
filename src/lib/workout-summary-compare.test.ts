import { describe, expect, it } from 'vitest'
import { compareExerciseResult } from '@/lib/workout-summary-compare'

const sets = (weight: number, reps: number[]) => reps.map((r) => ({ weight, reps: r }))

describe('compareExerciseResult', () => {
  it('counts an exercise once when it has both a rep gain and a PR', () => {
    const result = compareExerciseResult(sets(65, [10, 9, 9]), sets(65, [9, 9, 8]))
    expect(result.resultTone).toBe('good')
    expect(result.isPr).toBe(true)
    expect(result.progressed).toBe(true)
  })

  it('a PR without a rep gain still counts as progress', () => {
    const result = compareExerciseResult(sets(70, [8, 7]), sets(65, [9, 9]))
    expect(result.resultTone).toBe('bad')
    expect(result.isPr).toBe(true)
    expect(result.progressed).toBe(true)
  })

  it('same result is not progress', () => {
    const result = compareExerciseResult(sets(65, [8, 8]), sets(65, [8, 8]))
    expect(result.resultLabel).toBe('Без змін')
    expect(result.progressed).toBe(false)
  })
})
