import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { getSettings } from '@/lib/db/settings'
import { getTemplateByCode } from '@/lib/db/program'
import {
  type ExerciseSlot,
  exerciseLogs,
  exerciseSlots,
  exercises,
  progressionState,
  restTimers,
  setLogs,
  type SkipReason,
  type WorkoutSession,
  type WorkoutTemplateCode,
  workoutSessions,
  workoutTemplates,
} from '@/lib/db/schema'
import { evaluateProgressionHistory } from '@/lib/progression/evaluate'
import {
  groupHistoryBySlot,
  pickLastCompletedSets,
  pickLastTimeDisplay,
  prefillSetValues,
  toProgressionHistory,
  type SlotHistory,
} from '@/lib/progression/history'
import {
  countsTowardProgression,
  getEffectiveSlotParams,
  getWeekContext,
} from '@/lib/program/week-cycle'
import { getWeekNumber } from '@/lib/program/schedule'
import { formatDateLocal } from '@/lib/utils'
import type { ProgressionStatus } from '@/lib/program/types'
import type { WeightType } from '@/lib/program/types'
import { estimateE1rm } from '@/lib/progression/weight'

const nowIso = (): string => new Date().toISOString()

export interface SetLogRow {
  id: number | string
  setIndex: number
  weight: number | null
  reps: number | null
  rir: number | null
  status: 'pending' | 'done' | 'skipped'
  isExtra: boolean
  skipReason: string | null
  completedAt: string | null
}

export interface ExerciseLogRow {
  id: number | string
  exerciseSlotId: number
  sortOrder: number
  status: 'pending' | 'done' | 'partial' | 'skipped'
  skipReason: string | null
  suggestedWeight: number | null
  suggestedStatus: string | null
  exerciseName: string
  weightType: string
  slot: typeof exerciseSlots.$inferSelect
  effectiveSets: number
  repMin: number
  repMax: number
  rirMin: number
  rirMax: number
  restSec: number
  sets: SetLogRow[]
  lastTimeDisplay: string | null
  progressionHint: string | null
}

export interface SessionDetail {
  session: WorkoutSession
  templateCode: WorkoutTemplateCode
  exercises: ExerciseLogRow[]
  restTimer: { endsAt: string; label: string | null } | null
}

/** Completed history of a template in one query, grouped per slot (newest session first). */
export const loadTemplateHistory = async (templateId: number): Promise<SlotHistory> => {
  const db = getDb()
  const rows = await db
    .select({
      sessionId: workoutSessions.id,
      date: workoutSessions.date,
      mode: workoutSessions.mode,
      logId: exerciseLogs.id,
      slotId: exerciseLogs.exerciseSlotId,
      logStatus: exerciseLogs.status,
      suggestedWeight: exerciseLogs.suggestedWeight,
      set: {
        setIndex: setLogs.setIndex,
        weight: setLogs.weight,
        reps: setLogs.reps,
        rir: setLogs.rir,
        status: setLogs.status,
        isExtra: setLogs.isExtra,
      },
    })
    .from(workoutSessions)
    .innerJoin(exerciseLogs, eq(exerciseLogs.sessionId, workoutSessions.id))
    .leftJoin(setLogs, eq(setLogs.exerciseLogId, exerciseLogs.id))
    .where(
      and(
        eq(workoutSessions.workoutTemplateId, templateId),
        eq(workoutSessions.status, 'completed'),
      ),
    )
    .orderBy(
      desc(workoutSessions.finishedAt),
      asc(workoutSessions.id),
      asc(exerciseLogs.id),
      asc(setLogs.setIndex),
    )

  return groupHistoryBySlot(rows)
}

export const progressionFromHistory = (history: SlotHistory, slot: ExerciseSlot) =>
  evaluateProgressionHistory({
    slot,
    history: toProgressionHistory(history.get(slot.id) ?? [], slot),
    today: formatDateLocal(new Date()),
  })

export const getProgressionForSlot = async (slotId: number, templateId: number) => {
  const db = getDb()
  const slotRows = await db.select().from(exerciseSlots).where(eq(exerciseSlots.id, slotId)).limit(1)
  const slot = slotRows[0]
  if (!slot) throw new Error('Slot not found')

  return progressionFromHistory(await loadTemplateHistory(templateId), slot)
}

export const getTodayCompletedSessionForCode = async (
  code: WorkoutTemplateCode,
): Promise<WorkoutSession | null> => {
  const template = await getTemplateByCode(code)
  if (!template) return null

  const today = formatDateLocal(new Date())
  const db = getDb()
  const rows = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.date, today),
        eq(workoutSessions.workoutTemplateId, template.id),
        eq(workoutSessions.status, 'completed'),
      ),
    )
    .orderBy(desc(workoutSessions.finishedAt))
    .limit(1)
  return rows[0] ?? null
}

export const getInProgressSession = async (): Promise<WorkoutSession | null> => {
  const db = getDb()
  const rows = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.status, 'in_progress'))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1)
  return rows[0] ?? null
}

export const startWorkoutSession = async (
  code: WorkoutTemplateCode,
  bodyWeightKg: number,
): Promise<number> => {
  const db = getDb()
  const existing = await getInProgressSession()
  if (existing) return existing.id

  const settings = await getSettings()
  const template = await getTemplateByCode(code)
  if (!template) throw new Error('Template not found')

  if (!Number.isFinite(bodyWeightKg) || bodyWeightKg <= 0 || bodyWeightKg > 300) {
    throw new Error('INVALID_BODY_WEIGHT')
  }

  const today = formatDateLocal(new Date())
  const alreadyToday = await getTodayCompletedSessionForCode(code)
  if (alreadyToday) {
    throw new Error('WORKOUT_ALREADY_COMPLETED_TODAY')
  }
  const weekNumber = getWeekNumber(settings.programStartDate, today)
  const context = getWeekContext(weekNumber, settings.tournamentWeekEnabled)

  const history = await loadTemplateHistory(template.id)

  const [session] = await db
    .insert(workoutSessions)
    .values({
      workoutTemplateId: template.id,
      date: today,
      startedAt: nowIso(),
      weekNumber,
      mode: context.mode,
      status: 'in_progress',
    })
    .returning()

  const plans = template.slots.map((slot, i) => ({
    slot,
    sortOrder: i,
    effective: getEffectiveSlotParams(slot, context),
    progression: progressionFromHistory(history, slot),
    lastSets: pickLastCompletedSets(history.get(slot.id) ?? []),
  }))

  if (plans.length > 0) {
    const logs = await db
      .insert(exerciseLogs)
      .values(
        plans.map(({ slot, sortOrder, progression }) => ({
          sessionId: session.id,
          exerciseSlotId: slot.id,
          sortOrder,
          status: 'pending' as const,
          suggestedWeight: progression.suggestedWeight,
          suggestedStatus: progression.status,
        })),
      )
      .returning()
    // RETURNING order isn't guaranteed in SQLite, so match logs back by slot.
    const logIdBySlot = new Map(logs.map((l) => [l.exerciseSlotId, l.id]))

    const sets = plans.flatMap(({ slot, effective, progression, lastSets }) =>
      Array.from({ length: effective.sets }, (_, si) => ({
        exerciseLogId: logIdBySlot.get(slot.id)!,
        setIndex: si,
        ...prefillSetValues(si, lastSets, progression, {
          startWeight: slot.startWeight,
          rirMin: effective.rirMin,
        }),
        status: 'pending' as const,
        isExtra: false,
      })),
    )
    if (sets.length > 0) await db.insert(setLogs).values(sets)
  }

  const { logBodyWeightForSession } = await import('@/lib/db/body-weight')
  await logBodyWeightForSession({
    sessionId: session.id,
    date: today,
    weightKg: bodyWeightKg,
  })

  return session.id
}

export const loadSessionDetail = async (sessionId: number): Promise<SessionDetail | null> => {
  const db = getDb()
  const sessRows = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.id, sessionId))
    .limit(1)
  const session = sessRows[0]
  if (!session) return null

  const [tpl, settings, logs, sets, timer, history] = await Promise.all([
    db
      .select()
      .from(workoutTemplates)
      .where(eq(workoutTemplates.id, session.workoutTemplateId))
      .limit(1),
    getSettings(),
    db
      .select({ log: exerciseLogs, slot: exerciseSlots, exercise: exercises })
      .from(exerciseLogs)
      .innerJoin(exerciseSlots, eq(exerciseSlots.id, exerciseLogs.exerciseSlotId))
      .innerJoin(exercises, eq(exercises.id, exerciseSlots.exerciseId))
      .where(eq(exerciseLogs.sessionId, sessionId))
      .orderBy(asc(exerciseLogs.sortOrder)),
    db
      .select({ set: setLogs })
      .from(setLogs)
      .innerJoin(exerciseLogs, eq(exerciseLogs.id, setLogs.exerciseLogId))
      .where(eq(exerciseLogs.sessionId, sessionId))
      .orderBy(asc(setLogs.setIndex)),
    db.select().from(restTimers).where(eq(restTimers.sessionId, sessionId)).limit(1),
    loadTemplateHistory(session.workoutTemplateId),
  ])
  const templateCode = tpl[0]?.code as WorkoutTemplateCode
  const context = getWeekContext(session.weekNumber, settings.tournamentWeekEnabled)

  const setsByLog = new Map<number, (typeof sets)[number]['set'][]>()
  for (const { set } of sets) {
    const list = setsByLog.get(set.exerciseLogId)
    if (list) list.push(set)
    else setsByLog.set(set.exerciseLogId, [set])
  }

  const exerciseRows: ExerciseLogRow[] = logs.map(({ log, slot, exercise: ex }) => {
    const effective = getEffectiveSlotParams(slot, context)
    const wt = ex.weightType as WeightType
    const progression = progressionFromHistory(history, slot)
    const lastTimeDisplay = pickLastTimeDisplay(history.get(slot.id) ?? [], wt)

    return {
      id: log.id,
      exerciseSlotId: log.exerciseSlotId,
      sortOrder: log.sortOrder,
      status: log.status as ExerciseLogRow['status'],
      skipReason: log.skipReason,
      suggestedWeight: log.suggestedWeight,
      suggestedStatus: log.suggestedStatus,
      exerciseName: ex.name,
      weightType: ex.weightType,
      slot,
      effectiveSets: effective.sets,
      repMin: effective.repMin,
      repMax: effective.repMax,
      rirMin: effective.rirMin,
      rirMax: effective.rirMax,
      restSec: effective.restSec,
      lastTimeDisplay,
      progressionHint: progression.hint,
      sets: (setsByLog.get(log.id) ?? []).map((s) => ({
        id: s.id,
        setIndex: s.setIndex,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        status: s.status as SetLogRow['status'],
        isExtra: s.isExtra,
        skipReason: s.skipReason,
        completedAt: s.completedAt,
      })),
    }
  })

  return {
    session,
    templateCode,
    exercises: exerciseRows,
    restTimer: timer[0]
      ? { endsAt: timer[0].endsAt, label: timer[0].label }
      : null,
  }
}

export const completeSet = async (input: {
  setId: number
  weight: number
  reps: number
  rir: number
}) => {
  const db = getDb()
  await db
    .update(setLogs)
    .set({
      weight: input.weight,
      reps: input.reps,
      rir: input.rir,
      status: 'done',
      completedAt: nowIso(),
    })
    .where(eq(setLogs.id, input.setId))

  const setRow = await db.select().from(setLogs).where(eq(setLogs.id, input.setId)).limit(1)
  const logRow = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.id, setRow[0].exerciseLogId))
    .limit(1)

  const allSets = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.exerciseLogId, logRow[0].id))

  const allDone = allSets.every((s) => s.status === 'done' || s.status === 'skipped')
  if (allDone) {
    await db
      .update(exerciseLogs)
      .set({ status: 'done' })
      .where(eq(exerciseLogs.id, logRow[0].id))
  } else {
    await db
      .update(exerciseLogs)
      .set({ status: 'partial' })
      .where(eq(exerciseLogs.id, logRow[0].id))
  }

  const slot = await db
    .select()
    .from(exerciseSlots)
    .where(eq(exerciseSlots.id, logRow[0].exerciseSlotId))
    .limit(1)

  await db
    .delete(restTimers)
    .where(eq(restTimers.sessionId, logRow[0].sessionId))

  const endsAt = new Date(Date.now() + slot[0].restSec * 1000).toISOString()
  await db.insert(restTimers).values({
    sessionId: logRow[0].sessionId,
    endsAt,
    label: null,
  })

  return { sessionId: logRow[0].sessionId, restSec: slot[0].restSec, endsAt }
}

export const skipSet = async (setId: number, reason: SkipReason) => {
  const db = getDb()
  const setRow = await db.select().from(setLogs).where(eq(setLogs.id, setId)).limit(1)
  await db
    .update(setLogs)
    .set({ status: 'skipped', skipReason: reason, completedAt: nowIso() })
    .where(eq(setLogs.id, setId))

  const logRow = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.id, setRow[0].exerciseLogId))
    .limit(1)

  const allSets = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.exerciseLogId, logRow[0].id))

  const allResolved = allSets.every((s) => s.status === 'done' || s.status === 'skipped')
  if (allResolved) {
    const allSkipped = allSets.every((s) => s.status === 'skipped')
    await db
      .update(exerciseLogs)
      .set({
        status: allSkipped ? 'skipped' : 'done',
        skipReason: allSkipped ? reason : null,
      })
      .where(eq(exerciseLogs.id, logRow[0].id))
  }

  return logRow[0].sessionId
}

export const skipExercise = async (exerciseLogId: number, reason: SkipReason) => {
  const db = getDb()
  await db
    .update(setLogs)
    .set({ status: 'skipped', skipReason: reason, completedAt: nowIso() })
    .where(and(eq(setLogs.exerciseLogId, exerciseLogId), eq(setLogs.status, 'pending')))

  await db
    .update(exerciseLogs)
    .set({ status: 'skipped', skipReason: reason })
    .where(eq(exerciseLogs.id, exerciseLogId))

  const log = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.id, exerciseLogId))
    .limit(1)
  return log[0].sessionId
}

export const addExtraSet = async (exerciseLogId: number) => {
  const db = getDb()
  const sets = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.exerciseLogId, exerciseLogId))
    .orderBy(desc(setLogs.setIndex))

  const last = sets[0]
  const nextIndex = (last?.setIndex ?? -1) + 1

  await db.insert(setLogs).values({
    exerciseLogId,
    setIndex: nextIndex,
    weight: last?.weight ?? null,
    reps: null,
    rir: last?.rir ?? 1,
    status: 'pending',
    isExtra: true,
  })
}

export const clearRestTimer = async (sessionId: number) => {
  const db = getDb()
  await db.delete(restTimers).where(eq(restTimers.sessionId, sessionId))
}

export const adjustRestTimer = async (sessionId: number, deltaSec: number) => {
  const db = getDb()
  const row = await db.select().from(restTimers).where(eq(restTimers.sessionId, sessionId)).limit(1)
  if (!row[0]) return null
  const ends = new Date(row[0].endsAt).getTime() + deltaSec * 1000
  const endsAt = new Date(ends).toISOString()
  await db.update(restTimers).set({ endsAt }).where(eq(restTimers.sessionId, sessionId))
  return endsAt
}

export const countUnresolvedSets = async (sessionId: number): Promise<number> => {
  const db = getDb()
  const pending = await db
    .select({ id: setLogs.id })
    .from(setLogs)
    .innerJoin(exerciseLogs, eq(exerciseLogs.id, setLogs.exerciseLogId))
    .where(and(eq(exerciseLogs.sessionId, sessionId), eq(setLogs.status, 'pending')))
  return pending.length
}

export const finishWorkoutSession = async (sessionId: number, note?: string) => {
  const db = getDb()
  const pending = await countUnresolvedSets(sessionId)
  if (pending > 0) {
    return { ok: false as const, pending }
  }

  const detail = await loadSessionDetail(sessionId)
  if (!detail) return { ok: false as const, pending: 0 }

  await db
    .update(workoutSessions)
    .set({
      status: 'completed',
      finishedAt: nowIso(),
      note: note ?? null,
    })
    .where(eq(workoutSessions.id, sessionId))

  await db.delete(restTimers).where(eq(restTimers.sessionId, sessionId))

  // Progression is derived from completed-session history (which now includes
  // this session); progression_state only caches the latest result.
  if (countsTowardProgression(detail.session.mode)) {
    const history = await loadTemplateHistory(detail.session.workoutTemplateId)
    for (const ex of detail.exercises) {
      if (ex.status === 'skipped') continue

      const doneSets = ex.sets.filter((s) => s.status === 'done' && !s.isExtra)
      if (doneSets.length === 0) continue

      const result = progressionFromHistory(history, ex.slot)

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

  return { ok: true as const, sessionId }
}

export const SESSION_NOTE_MAX_LENGTH = 2000

export const saveSessionNote = async (sessionId: number, note: string) => {
  const db = getDb()
  const trimmed = note.trim().slice(0, SESSION_NOTE_MAX_LENGTH)
  await db
    .update(workoutSessions)
    .set({ note: trimmed || null })
    .where(eq(workoutSessions.id, sessionId))
}

export const abandonSession = async (sessionId: number) => {
  const db = getDb()
  await db
    .update(workoutSessions)
    .set({ status: 'abandoned', finishedAt: nowIso() })
    .where(eq(workoutSessions.id, sessionId))
  await db.delete(restTimers).where(eq(restTimers.sessionId, sessionId))
}

export const resolveStaleSession = async (sessionId: number) => {
  const db = getDb()
  const sessionLogIds = db
    .select({ id: exerciseLogs.id })
    .from(exerciseLogs)
    .where(eq(exerciseLogs.sessionId, sessionId))

  await db
    .update(setLogs)
    .set({ status: 'skipped', skipReason: 'no_time', completedAt: nowIso() })
    .where(and(inArray(setLogs.exerciseLogId, sessionLogIds), eq(setLogs.status, 'pending')))
  await db
    .update(exerciseLogs)
    .set({ status: 'skipped', skipReason: 'no_time' })
    .where(
      and(
        eq(exerciseLogs.sessionId, sessionId),
        inArray(exerciseLogs.status, ['pending', 'partial']),
      ),
    )

  return finishWorkoutSession(sessionId)
}

export const getCompletedSessions = async (limit = 50) => {
  const db = getDb()
  return db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.status, 'completed'))
    .orderBy(desc(workoutSessions.finishedAt))
    .limit(limit)
}

export const getPreviousCompletedSession = async (
  templateId: number,
  beforeSessionId: number,
) => {
  const db = getDb()
  const rows = await db
    .select()
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.workoutTemplateId, templateId), eq(workoutSessions.status, 'completed')),
    )
    .orderBy(desc(workoutSessions.finishedAt))
    .limit(20)

  return rows.find((r) => r.id !== beforeSessionId) ?? null
}

export const getHomeExercisePreviews = async (code: WorkoutTemplateCode) => {
  const template = await getTemplateByCode(code)
  if (!template) return []

  const history = await loadTemplateHistory(template.id)
  return template.slots.map((slot) => {
    const progression = progressionFromHistory(history, slot)
    return {
      name: slot.exercise.name,
      slotId: slot.id,
      status: progression.status as ProgressionStatus,
      suggestedWeight: progression.suggestedWeight,
      hint: progression.hint,
      weightType: slot.exercise.weightType,
    }
  })
}

/** Best estimated 1RM per completed session of a slot, oldest log first. */
export const getExerciseE1rmPoints = async (
  slotId: number,
): Promise<{ week: string; e1rm: number }[]> => {
  const db = getDb()
  const rows = await db
    .select({
      logId: exerciseLogs.id,
      weekNumber: workoutSessions.weekNumber,
      weight: setLogs.weight,
      reps: setLogs.reps,
    })
    .from(exerciseLogs)
    .innerJoin(workoutSessions, eq(workoutSessions.id, exerciseLogs.sessionId))
    .innerJoin(setLogs, eq(setLogs.exerciseLogId, exerciseLogs.id))
    .where(
      and(
        eq(exerciseLogs.exerciseSlotId, slotId),
        eq(workoutSessions.status, 'completed'),
        eq(setLogs.status, 'done'),
      ),
    )
    .orderBy(asc(exerciseLogs.id))

  const bestByLog = new Map<number, { weekNumber: number; best: number }>()
  for (const r of rows) {
    const e1rm = estimateE1rm(r.weight ?? 0, r.reps ?? 0)
    const point = bestByLog.get(r.logId)
    if (!point) bestByLog.set(r.logId, { weekNumber: r.weekNumber, best: e1rm })
    else point.best = Math.max(point.best, e1rm)
  }

  return [...bestByLog.values()].map(({ weekNumber, best }) => ({
    week: `T${weekNumber}`,
    e1rm: Math.round(best * 10) / 10,
  }))
}

export const isSessionStale = (session: WorkoutSession): boolean => {
  const started = new Date(session.startedAt).getTime()
  return Date.now() - started > 12 * 3_600_000
}
