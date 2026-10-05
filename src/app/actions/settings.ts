'use server'

import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { updateSettings } from '@/lib/db/settings'
import {
  bodyWeightLogs,
  exerciseLogs,
  exerciseSlots,
  exercises,
  progressionState,
  programs,
  setLogs,
  workoutSessions,
  workoutTemplates,
} from '@/lib/db/schema'

export const updateSettingsAction = async (input: {
  programStartDate: string
  tournamentWeekEnabled: boolean
  matchDate: string | null
  timerSoundEnabled: boolean
  timerVibrationEnabled: boolean
}) => {
  await updateSettings(input)
  revalidatePath('/')
  revalidatePath('/settings')
  revalidatePath('/program')
}

export const exportDataAction = async () => {
  const db = getDb()
  return {
    exportedAt: new Date().toISOString(),
    programs: await db.select().from(programs),
    exercises: await db.select().from(exercises),
    workoutTemplates: await db.select().from(workoutTemplates),
    exerciseSlots: await db.select().from(exerciseSlots),
    workoutSessions: await db.select().from(workoutSessions),
    exerciseLogs: await db.select().from(exerciseLogs),
    setLogs: await db.select().from(setLogs),
    progressionState: await db.select().from(progressionState),
    bodyWeightLogs: await db.select().from(bodyWeightLogs),
    settings: await import('@/lib/db/settings').then((m) => m.getSettings()),
  }
}

export const exportCsvAction = async (): Promise<string> => {
  const db = getDb()
  const sessions = await db.select().from(workoutSessions)
  const lines = ['session_id,date,week,mode,status,started_at,finished_at']
  for (const s of sessions) {
    lines.push(
      [s.id, s.date, s.weekNumber, s.mode, s.status, s.startedAt, s.finishedAt ?? ''].join(','),
    )
  }
  return lines.join('\n')
}
