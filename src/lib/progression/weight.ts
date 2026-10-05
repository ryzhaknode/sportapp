import type { WeightType } from '@/lib/program/types'

export const roundToIncrement = (weight: number, increment: number): number => {
  if (increment <= 0) return weight
  return Math.round(weight / increment) * increment
}

export const decreaseWeight = (weight: number, increment: number): number => {
  const decreased = weight * 0.9
  const rounded = roundToIncrement(decreased, increment)
  return Math.max(0, rounded)
}

export const formatWeight = (weight: number | null, weightType: WeightType): string => {
  if (weight === null) return '—'
  if (weightType === 'bodyweight_plus' && weight === 0) return 'власна вага'
  const suffix = weightType === 'dumbbell_per_hand' ? ' кг/рука' : ' кг'
  if (weightType === 'bodyweight_plus' && weight > 0) return `+${weight}${suffix.replace(' кг', ' кг')}`
  return `${weight}${suffix === ' кг/рука' ? suffix : ' кг'}`
}

export const totalReps = (reps: number[]): number => reps.reduce((a, b) => a + b, 0)

export const calcTonnage = (sets: { weight: number | null; reps: number | null }[]): number => {
  return sets.reduce((sum, s) => {
    if (s.weight == null || s.reps == null) return sum
    const multiplier = 1
    return sum + s.weight * s.reps * multiplier
  }, 0)
}

export const estimateE1rm = (weight: number, reps: number): number =>
  weight * (1 + reps / 30)
