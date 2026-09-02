'use server'

import { revalidatePath } from 'next/cache'
import { incrementCycleOffset } from '@/lib/db/settings'
import {
  getSessionDelta,
  getSessionByDate,
  saveSession,
} from '@/lib/db/sessions'
import type { WorkoutType } from '@/lib/cycle'
import type { ExerciseVariant } from '@/lib/workouts'

export const saveWorkoutSession = async (input: {
  date: string
  type: WorkoutType
  variant: ExerciseVariant
  reps: number[]
  notes?: string
  skipRest?: boolean
}) => {
  const existing = await getSessionByDate(input.date)
  await saveSession(input)

  if (input.skipRest && !existing?.completedAt) {
    await incrementCycleOffset()
  }

  const delta = await getSessionDelta(
    input.type,
    input.variant,
    input.reps.reduce((a, b) => a + b, 0),
    input.date,
  )

  revalidatePath('/')
  revalidatePath('/workout')
  revalidatePath('/history')

  return { delta }
}
