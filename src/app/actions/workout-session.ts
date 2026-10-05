'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SkipReason, WorkoutTemplateCode } from '@/lib/db/schema'
import {
  abandonSession,
  addExtraSet,
  adjustRestTimer,
  clearRestTimer,
  completeSet,
  finishWorkoutSession,
  resolveStaleSession,
  skipExercise,
  skipSet,
  startWorkoutSession,
} from '@/lib/db/workout-sessions'

const revalidateWorkout = () => {
  revalidatePath('/')
  revalidatePath('/workout')
  revalidatePath('/history')
  revalidatePath('/program')
  revalidatePath('/weight')
}

export const actionStartWorkout = async (code: WorkoutTemplateCode, bodyWeightKg: number) => {
  const sessionId = await startWorkoutSession(code, bodyWeightKg)
  revalidateWorkout()
  revalidatePath('/weight')
  redirect(`/workout/${sessionId}`)
}

export const actionCompleteSet = async (input: {
  setId: number
  weight: number
  reps: number
  rir: number
}) => {
  const result = await completeSet(input)
  revalidateWorkout()
  return result
}

export const actionSkipSet = async (setId: number, reason: SkipReason) => {
  const sessionId = await skipSet(setId, reason)
  revalidateWorkout()
  return { sessionId }
}

export const actionSkipExercise = async (exerciseLogId: number, reason: SkipReason) => {
  const sessionId = await skipExercise(exerciseLogId, reason)
  revalidateWorkout()
  return { sessionId }
}

export const actionAddExtraSet = async (exerciseLogId: number) => {
  await addExtraSet(exerciseLogId)
  revalidateWorkout()
}

export const actionClearRestTimer = async (sessionId: number) => {
  await clearRestTimer(sessionId)
  revalidateWorkout()
}

export const actionAdjustRestTimer = async (sessionId: number, deltaSec: number) => {
  const endsAt = await adjustRestTimer(sessionId, deltaSec)
  revalidateWorkout()
  return { endsAt }
}

export const actionFinishWorkout = async (sessionId: number, note?: string) => {
  const result = await finishWorkoutSession(sessionId, note)
  revalidateWorkout()
  if (result.ok) {
    redirect(`/workout/${sessionId}/summary`)
  }
  return result
}

export const actionAbandonSession = async (sessionId: number) => {
  await abandonSession(sessionId)
  revalidateWorkout()
  redirect('/')
}

export const actionResolveStaleSession = async (sessionId: number) => {
  const result = await resolveStaleSession(sessionId)
  revalidateWorkout()
  if (result.ok) {
    redirect(`/workout/${sessionId}/summary`)
  }
  return result
}
