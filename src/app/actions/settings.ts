'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { getSettings } from '@/lib/db/settings'
import { getAllSessions } from '@/lib/db/sessions'
import { addMaxTest, getMaxTests } from '@/lib/db/max-tests'
import { settings } from '@/lib/db/schema'
import type { ExerciseVariant } from '@/lib/workouts'

export const updateSettingsAction = async (input: {
  startDate: string
  currentVariant: ExerciseVariant
  baselineMax: number
}) => {
  const db = getDb()
  await db
    .update(settings)
    .set({
      startDate: input.startDate,
      currentVariant: input.currentVariant,
      baselineMax: input.baselineMax,
    })
    .where(eq(settings.id, 1))

  revalidatePath('/')
  revalidatePath('/workout')
  revalidatePath('/settings')
}

export const addMaxTestAction = async (input: {
  variant: ExerciseVariant
  maxReps: number
  testedAt: string
  notes?: string
}) => {
  await addMaxTest(input)
  revalidatePath('/')
  revalidatePath('/settings')
}

export const exportDataAction = async () => {
  const appSettings = await getSettings()
  const sessions = await getAllSessions()
  const tests = await getMaxTests()

  return {
    exportedAt: new Date().toISOString(),
    settings: appSettings,
    sessions,
    maxTests: tests,
  }
}
