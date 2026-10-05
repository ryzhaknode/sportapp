import { and, asc, desc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { getSettings } from '@/lib/db/settings'
import { getTemplateByCode } from '@/lib/db/program'
import {
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
import { evaluateProgression, type ExerciseLogSnapshot } from '@/lib/progression/evaluate'
import { getEffectiveSlotParams, getWeekContext } from '@/lib/program/week-cycle'
import { daysSince, getWeekNumber } from '@/lib/program/schedule'
import { formatDateLocal } from '@/lib/utils'
import type { ProgressionStatus } from '@/lib/program/types'
import { formatLastTimeDisplay } from '@/lib/workout-last-display'
import type { WeightType } from '@/lib/program/types'

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

const buildLogSnapshot = (
  weight: number,
  sets: { weight: number | null; reps: number | null; rir: number | null; status: string }[],
): ExerciseLogSnapshot | null => {
  const done = sets.filter(
    (s) => s.status === 'done' && s.reps != null && s.rir != null && s.weight != null,
  )
  if (done.length === 0) return null
  const w = weight ?? done[0].weight!
  return {
    weight: w,
    sets: done.map((s) => ({
      weight: s.weight!,
      reps: s.reps!,
      rir: s.rir!,
      status: 'done' as const,
    })),
  }
}

export const getProgressionForSlot = async (
  slotId: number,
  templateId: number,
  targetSets: number,
) => {
  const db = getDb()
  const slotRows = await db.select().from(exerciseSlots).where(eq(exerciseSlots.id, slotId)).limit(1)
  const slot = slotRows[0]
  if (!slot) throw new Error('Slot not found')

  const stateRows = await db
    .select()
    .from(progressionState)
    .where(eq(progressionState.exerciseSlotId, slotId))
    .limit(1)
  const state = stateRows[0]

  const completedSessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.workoutTemplateId, templateId),
        eq(workoutSessions.status, 'completed'),
        ne(workoutSessions.mode, 'deload'),
        ne(workoutSessions.mode, 'tournament'),
      ),
    )
    .orderBy(desc(workoutSessions.finishedAt))

  const snapshots: { date: string; snapshot: ExerciseLogSnapshot }[] = []

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

    const doneSets = sets.filter((s) => s.status === 'done' && !s.isExtra)
    const weight =
      doneSets.find((s) => s.weight != null)?.weight ??
      log.suggestedWeight ??
      slot.startWeight ??
      0

    const snap = buildLogSnapshot(weight, doneSets)
    if (snap) snapshots.push({ date: sess.date, snapshot: snap })
  }

  const last = snapshots[0]?.snapshot ?? null
  const prev = snapshots[1]?.snapshot ?? null
  const lastDate = snapshots[0]?.date ?? null
  const today = formatDateLocal(new Date())
  const daysSinceLast = lastDate ? daysSince(lastDate, today) : null

  return evaluateProgression({
    slot,
    lastLog: last,
    prevLog: prev,
    stallCount: state?.stallCount ?? 0,
    daysSinceLastSession: daysSinceLast,
    targetSets,
  })
}

export interface LastSetValues {
  weight: number
  reps: number
  rir: number
}

const getLastCompletedSetsForSlot = async (
  slotId: number,
  templateId: number,
): Promise<LastSetValues[] | null> => {
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

export const getLastTimeDisplayForSlot = async (
  slotId: number,
  templateId: number,
  weightType: WeightType,
): Promise<string | null> => {
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

    return formatLastTimeDisplay(
      sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        isExtra: s.isExtra,
        status: s.status,
      })),
      weightType,
    )
  }
  return null
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

  for (const [i, slot] of template.slots.entries()) {
    const effective = getEffectiveSlotParams(slot, context)
    const progression = await getProgressionForSlot(slot.id, template.id, effective.sets)

    const [log] = await db
      .insert(exerciseLogs)
      .values({
        sessionId: session.id,
        exerciseSlotId: slot.id,
        sortOrder: i,
        status: 'pending',
        suggestedWeight: progression.suggestedWeight,
        suggestedStatus: progression.status,
      })
      .returning()

    const lastSets = await getLastCompletedSetsForSlot(slot.id, template.id)
    const fallbackWeight = progression.suggestedWeight ?? slot.startWeight
    const fallbackReps = progression.suggestedRepTarget

    for (let si = 0; si < effective.sets; si += 1) {
      const fromLast = lastSets?.[si] ?? lastSets?.[lastSets.length - 1]
      await db.insert(setLogs).values({
        exerciseLogId: log.id,
        setIndex: si,
        weight: fromLast?.weight ?? fallbackWeight,
        reps: fromLast?.reps ?? fallbackReps,
        rir: fromLast?.rir ?? effective.rirMin,
        status: 'pending',
        isExtra: false,
      })
    }
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

  const tpl = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.id, session.workoutTemplateId))
    .limit(1)
  const templateCode = tpl[0]?.code as WorkoutTemplateCode

  const settings = await getSettings()
  const context = getWeekContext(session.weekNumber, settings.tournamentWeekEnabled)

  const logs = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.sessionId, sessionId))
    .orderBy(asc(exerciseLogs.sortOrder))

  const exerciseRows: ExerciseLogRow[] = []

  for (const log of logs) {
    const slot = await db
      .select()
      .from(exerciseSlots)
      .where(eq(exerciseSlots.id, log.exerciseSlotId))
      .limit(1)
    const ex = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, slot[0].exerciseId))
      .limit(1)

    const effective = getEffectiveSlotParams(slot[0], context)
    const sets = await db
      .select()
      .from(setLogs)
      .where(eq(setLogs.exerciseLogId, log.id))
      .orderBy(asc(setLogs.setIndex))

    const wt = ex[0].weightType as WeightType
    const progression = await getProgressionForSlot(
      log.exerciseSlotId,
      session.workoutTemplateId,
      effective.sets,
    )
    const lastTimeDisplay = await getLastTimeDisplayForSlot(
      log.exerciseSlotId,
      session.workoutTemplateId,
      wt,
    )

    exerciseRows.push({
      id: log.id,
      exerciseSlotId: log.exerciseSlotId,
      sortOrder: log.sortOrder,
      status: log.status as ExerciseLogRow['status'],
      skipReason: log.skipReason,
      suggestedWeight: log.suggestedWeight,
      suggestedStatus: log.suggestedStatus,
      exerciseName: ex[0].name,
      weightType: ex[0].weightType,
      slot: slot[0],
      effectiveSets: effective.sets,
      repMin: effective.repMin,
      repMax: effective.repMax,
      rirMin: effective.rirMin,
      rirMax: effective.rirMax,
      restSec: effective.restSec,
      lastTimeDisplay,
      progressionHint: progression.hint,
      sets: sets.map((s) => ({
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
    })
  }

  const timer = await db
    .select()
    .from(restTimers)
    .where(eq(restTimers.sessionId, sessionId))
    .limit(1)

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
  const sets = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.exerciseLogId, exerciseLogId))

  for (const s of sets) {
    if (s.status === 'pending') {
      await db
        .update(setLogs)
        .set({ status: 'skipped', skipReason: reason, completedAt: nowIso() })
        .where(eq(setLogs.id, s.id))
    }
  }

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
  const logs = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.sessionId, sessionId))

  let count = 0
  for (const log of logs) {
    const sets = await db
      .select()
      .from(setLogs)
      .where(eq(setLogs.exerciseLogId, log.id))
    count += sets.filter((s) => s.status === 'pending').length
  }
  return count
}

export const finishWorkoutSession = async (sessionId: number, note?: string) => {
  const db = getDb()
  const pending = await countUnresolvedSets(sessionId)
  if (pending > 0) {
    return { ok: false as const, pending }
  }

  const detail = await loadSessionDetail(sessionId)
  if (!detail) return { ok: false as const, pending: 0 }

  const settings = await getSettings()

  if (detail.session.mode === 'normal' || detail.session.mode === 'test') {
    for (const ex of detail.exercises) {
      if (ex.status === 'skipped') continue

      const doneSets = ex.sets.filter((s) => s.status === 'done' && !s.isExtra)
      if (doneSets.length === 0) continue

      const weight = doneSets[0].weight ?? ex.suggestedWeight ?? 0
      const progression = await getProgressionForSlot(
        ex.exerciseSlotId,
        detail.session.workoutTemplateId,
        ex.effectiveSets,
      )

      const doneSnap = buildLogSnapshot(weight, doneSets)
      if (!doneSnap) continue

      const result = evaluateProgression({
        slot: ex.slot,
        lastLog: doneSnap,
        prevLog: null,
        stallCount: progression.stallCount,
        daysSinceLastSession: 0,
        targetSets: ex.effectiveSets,
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

  await db
    .update(workoutSessions)
    .set({
      status: 'completed',
      finishedAt: nowIso(),
      note: note ?? null,
    })
    .where(eq(workoutSessions.id, sessionId))

  await db.delete(restTimers).where(eq(restTimers.sessionId, sessionId))

  void settings
  return { ok: true as const, sessionId }
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
  const logs = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.sessionId, sessionId))

  for (const log of logs) {
    const sets = await db
      .select()
      .from(setLogs)
      .where(eq(setLogs.exerciseLogId, log.id))
    for (const s of sets) {
      if (s.status === 'pending') {
        await db
          .update(setLogs)
          .set({
            status: 'skipped',
            skipReason: 'no_time',
            completedAt: nowIso(),
          })
          .where(eq(setLogs.id, s.id))
      }
    }
    if (log.status === 'pending' || log.status === 'partial') {
      await db
        .update(exerciseLogs)
        .set({ status: 'skipped', skipReason: 'no_time' })
        .where(eq(exerciseLogs.id, log.id))
    }
  }

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

  const settings = await getSettings()
  const today = formatDateLocal(new Date())
  const weekNumber = getWeekNumber(settings.programStartDate, today)
  const context = getWeekContext(weekNumber, settings.tournamentWeekEnabled)

  const previews = []
  for (const slot of template.slots) {
    const effective = getEffectiveSlotParams(slot, context)
    const progression = await getProgressionForSlot(slot.id, template.id, effective.sets)
    previews.push({
      name: slot.exercise.name,
      slotId: slot.id,
      status: progression.status as ProgressionStatus,
      suggestedWeight: progression.suggestedWeight,
      hint: progression.hint,
      weightType: slot.exercise.weightType,
    })
  }
  return previews
}

export const isSessionStale = (session: WorkoutSession): boolean => {
  const started = new Date(session.startedAt).getTime()
  return Date.now() - started > 12 * 3_600_000
}
