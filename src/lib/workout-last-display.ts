import type { WeightType } from '@/lib/program/types'

interface SetLine {
  weight: number | null
  reps: number | null
  isExtra: boolean
  status: string
}

export const formatLastTimeDisplay = (
  sets: SetLine[],
  weightType: WeightType,
): string | null => {
  const done = sets.filter((s) => s.status === 'done' && s.reps != null)
  if (done.length === 0) return null

  const planned = done.filter((s) => !s.isExtra)
  const extra = done.filter((s) => s.isExtra)
  const ref = planned[0] ?? done[0]
  const w = ref.weight

  let prefix = ''
  if (w != null) {
    if (weightType === 'bodyweight_plus' && w === 0) prefix = 'BW'
    else if (weightType === 'bodyweight_plus') prefix = `+${w} кг`
    else if (weightType === 'dumbbell_per_hand') prefix = `${w} кг/рука`
    else prefix = `${w} кг`
  }

  const repsStr = planned.map((s) => s.reps).join(', ')
  const extraNote = extra.length > 0 ? ` (+${extra.length} додат.)` : ''
  return `${prefix} × ${repsStr}${extraNote}`
}
