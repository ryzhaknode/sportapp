import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { getSettings } from '@/lib/db/settings'
import { getTemplateByCode } from '@/lib/db/program'
import {
  exerciseLogs,
  setLogs,
  progressionState,
  syncReceipts,
  workoutSessions,
} from '@/lib/db/schema'
import type { SyncSessionPayload, SyncResult } from '@/lib/offline/types'
import { getWeekNumber } from '@/lib/program/schedule'
import { getWeekContext, getEffectiveSlotParams } from '@/lib/program/week-cycle'
import { evaluateProgression, type ExerciseLogSnapshot } from '@/lib/progression/evaluate'
import { getProgressionForSlot } from '@/lib/db/workout-sessions'
import { logBodyWeightForSession } from '@/lib/db/body-weight'

const nowIso = (): string => new Date().toISOString()

const buildLogSnapshot = (
  weight: number,
  sets: SyncSessionPayload['exercises'][0]['sets'],
): ExerciseLogSnapshot | null => {
  const done = sets.filter(
    (s) => s.status === 'done' && s.reps != null && s.rir != null && s.weight != null && !s.isExtra,
  )
  if (done.length === 0) return null
  return {
    weight,
    sets: done.map((s) => ({
      weight: s.weight!,
      reps: s.reps!,
      rir: s.rir!,
      status: 'done' as const,
    })),
  }
}

export const importOfflineSession = async (payload: SyncSessionPayload): Promise<SyncResult> => {
  if (!payload.localId || !payload.finishedAt) {
    return { ok: false, code: 'INVALID', message: 'Некоректні дані тренування' }
  }

  const db = getDb()

  const receipt = await db
    .select()
    .from(syncReceipts)
    .where(eq(syncReceipts.localId, payload.localId))
    .limit(1)
  if (receipt[0]) {
    return {
      ok: true,
      serverSessionId: receipt[0].serverSessionId,
      alreadySynced: true,
    }
  }

  const template = await getTemplateByCode(payload.templateCode)
  if (!template) {
    return { ok: false, code: 'INVALID', message: 'Шаблон тренування не знайдено' }
  }

  const pendingSets = payload.exercises.some((ex) =>
    ex.sets.some((s) => s.status === 'pending'),
  )
  if (pendingSets) {
    return { ok: false, code: 'NOT_FINISHED', message: 'Тренування ще не завершено на телефоні' }
  }

  const existing = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.date, payload.date),
        eq(workoutSessions.workoutTemplateId, template.id),
        eq(workoutSessions.status, 'completed'),
      ),
    )
    .limit(1)
  if (existing[0]) {
    return {
      ok: false,
      code: 'DUPLICATE_DAY',
      message: `На ${payload.date} вже є завершене тренування ${payload.templateCode} на Mac`,
      existingSessionId: existing[0].id,
    }
  }

  const settings = await getSettings()
  const weekNumber = getWeekNumber(settings.programStartDate, payload.date)
  const context = getWeekContext(weekNumber, settings.tournamentWeekEnabled)

  const [session] = await db
    .insert(workoutSessions)
    .values({
      workoutTemplateId: template.id,
      date: payload.date,
      startedAt: payload.startedAt,
      finishedAt: payload.finishedAt,
      weekNumber,
      mode: context.mode,
      status: 'completed',
      note: payload.note ?? null,
    })
    .returning()

  for (const ex of payload.exercises) {
    const slot = template.slots.find((s) => s.id === ex.exerciseSlotId)
    if (!slot) continue

    const effective = getEffectiveSlotParams(slot, context)

    const [log] = await db
      .insert(exerciseLogs)
      .values({
        sessionId: session.id,
        exerciseSlotId: ex.exerciseSlotId,
        sortOrder: ex.sortOrder,
        status: ex.status,
        skipReason: ex.skipReason,
        suggestedWeight: ex.suggestedWeight,
        suggestedStatus: ex.suggestedStatus,
      })
      .returning()

    for (const set of ex.sets) {
      await db.insert(setLogs).values({
        exerciseLogId: log.id,
        setIndex: set.setIndex,
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
        status: set.status,
        isExtra: set.isExtra,
        skipReason: set.skipReason,
        completedAt: set.completedAt,
      })
    }

    if (context.mode === 'normal' || context.mode === 'test') {
      if (ex.status === 'skipped') continue
      const doneSets = ex.sets.filter((s) => s.status === 'done' && !s.isExtra)
      if (doneSets.length === 0) continue

      const weight = doneSets[0].weight ?? ex.suggestedWeight ?? 0
      const progression = await getProgressionForSlot(
        ex.exerciseSlotId,
        template.id,
        effective.sets,
      )
      const doneSnap = buildLogSnapshot(weight, ex.sets)
      if (!doneSnap) continue

      const result = evaluateProgression({
        slot,
        lastLog: doneSnap,
        prevLog: null,
        stallCount: progression.stallCount,
        daysSinceLastSession: 0,
        targetSets: effective.sets,
      })

      await db
        .insert(progressionState)
        .values({
          exerciseSlotId: ex.exerciseSlotId,
          currentWeight: doneSets[doneSets.length - 1].weight,
          stallCount: result.stallCount,
          lastStatus: result.status,
          updatedAt: nowIso(),
        })
        .onConflictDoUpdate({
          target: progressionState.exerciseSlotId,
          set: {
            currentWeight: doneSets[doneSets.length - 1].weight,
            stallCount: result.stallCount,
            lastStatus: result.status,
            updatedAt: nowIso(),
          },
        })
    }
  }

  await logBodyWeightForSession({
    sessionId: session.id,
    date: payload.date,
    weightKg: payload.bodyWeightKg,
  })

  await db.insert(syncReceipts).values({
    localId: payload.localId,
    serverSessionId: session.id,
    syncedAt: nowIso(),
  })

  return { ok: true, serverSessionId: session.id }
}
