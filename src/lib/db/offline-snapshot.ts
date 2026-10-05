import { getSettings } from '@/lib/db/settings'
import { getTemplateByCode } from '@/lib/db/program'
import {
  getHomeExercisePreviews,
  getLastTimeDisplayForSlot,
} from '@/lib/db/workout-sessions'
import type { WorkoutTemplateCode } from '@/lib/db/schema'
import type { ProgramSnapshot, SnapshotSlot } from '@/lib/offline/types'
import { getEffectiveSlotParams, getWeekContext } from '@/lib/program/week-cycle'
import { getWeekNumber } from '@/lib/program/schedule'
import { formatDateLocal } from '@/lib/utils'
import type { WeightType } from '@/lib/program/types'
import { getDb } from '@/lib/db'
import { and, asc, desc, eq } from 'drizzle-orm'
import {
  exerciseLogs,
  setLogs,
  workoutSessions,
} from '@/lib/db/schema'

const getLastCompletedSetsForSlot = async (
  slotId: number,
  templateId: number,
): Promise<SnapshotSlot['lastSets']> => {
  const db = getDb()
  const completedSessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.workoutTemplateId, templateId),
        eq(workoutSessions.status, 'completed'),
      ),
    )
    .orderBy(desc(workoutSessions.finishedAt))

  for (const sess of completedSessions) {
    const logs = await db
      .select()
      .from(exerciseLogs)
      .where(
        and(eq(exerciseLogs.sessionId, sess.id), eq(exerciseLogs.exerciseSlotId, slotId)),
      )
      .limit(1)
    const log = logs[0]
    if (!log || log.status === 'skipped') continue

    const sets = await db
      .select()
      .from(setLogs)
      .where(eq(setLogs.exerciseLogId, log.id))
      .orderBy(asc(setLogs.setIndex))

    const done = sets.filter(
      (s) => s.status === 'done' && !s.isExtra && s.reps != null && s.weight != null,
    )
    if (done.length === 0) continue

    return done.map((s) => ({
      weight: s.weight!,
      reps: s.reps!,
      rir: s.rir ?? 2,
    }))
  }
  return null
}

export const buildProgramSnapshot = async (): Promise<ProgramSnapshot> => {
  const settings = await getSettings()
  const today = formatDateLocal(new Date())
  const weekNumber = getWeekNumber(settings.programStartDate, today)
  const context = getWeekContext(weekNumber, settings.tournamentWeekEnabled)

  const codes: WorkoutTemplateCode[] = ['A', 'B', 'C']
  const templates = {} as ProgramSnapshot['templates']

  for (const code of codes) {
    const template = await getTemplateByCode(code)
    if (!template) throw new Error(`Template ${code} missing`)

    const previews = await getHomeExercisePreviews(code)
    const previewBySlot = new Map(previews.map((p) => [p.slotId, p]))

    const slots: SnapshotSlot[] = []
    for (const slot of template.slots) {
      const effective = getEffectiveSlotParams(slot, context)
      void effective
      const preview = previewBySlot.get(slot.id)!
      const lastSets = await getLastCompletedSetsForSlot(slot.id, template.id)
      const lastTimeDisplay = await getLastTimeDisplayForSlot(
        slot.id,
        template.id,
        slot.exercise.weightType as WeightType,
      )
      slots.push({
        slot,
        exercise: slot.exercise,
        suggestedWeight: preview.suggestedWeight,
        suggestedStatus: preview.status,
        hint: preview.hint,
        lastTimeDisplay,
        lastSets,
      })
    }

    templates[code] = { templateId: template.id, slots }
  }

  return {
    cachedAt: new Date().toISOString(),
    programStartDate: settings.programStartDate,
    tournamentWeekEnabled: settings.tournamentWeekEnabled,
    timerSoundEnabled: settings.timerSoundEnabled,
    timerVibrationEnabled: settings.timerVibrationEnabled,
    templates,
  }
}
