'use client'

import {
  idbGetSession,
  idbListSessions,
  idbPutSession,
} from '@/lib/offline/idb'
import type {
  LocalExerciseLog,
  LocalSetLog,
  LocalWorkoutRecord,
  ProgramSnapshot,
  SyncSessionPayload,
} from '@/lib/offline/types'
import type { SkipReason, WorkoutTemplateCode } from '@/lib/db/schema'
import { getEffectiveSlotParams, getWeekContext } from '@/lib/program/week-cycle'
import { getWeekNumber } from '@/lib/program/schedule'
import { formatDateLocal } from '@/lib/utils'
import { idbGetSnapshot } from '@/lib/offline/idb'

const newId = (): string => crypto.randomUUID()

export class OfflineCacheError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OfflineCacheError'
  }
}

export const getCachedSnapshot = async (): Promise<ProgramSnapshot | null> =>
  idbGetSnapshot<ProgramSnapshot>()

export const createLocalWorkout = async (
  code: WorkoutTemplateCode,
  bodyWeightKg: number,
): Promise<string> => {
  const snapshot = await getCachedSnapshot()
  if (!snapshot?.templates[code]) {
    throw new OfflineCacheError(
      'Немає кешу програми. Спочатку відкрий додаток вдома з Wi‑Fi до Mac.',
    )
  }

  const inProgress = await getLocalInProgressSession()
  if (inProgress) return inProgress.localId

  const tpl = snapshot.templates[code]
  const today = formatDateLocal(new Date())
  const weekNumber = getWeekNumber(snapshot.programStartDate, today)
  const context = getWeekContext(weekNumber, snapshot.tournamentWeekEnabled)
  const startedAt = new Date().toISOString()

  const exercises: LocalExerciseLog[] = tpl.slots.map((entry, i) => {
    const effective = getEffectiveSlotParams(entry.slot, context)
    const lastSets = entry.lastSets
    const fallbackWeight = entry.suggestedWeight ?? entry.slot.startWeight ?? 0
    const fallbackReps = entry.slot.targetReps ?? entry.slot.repMin

    const sets: LocalSetLog[] = []
    for (let si = 0; si < effective.sets; si += 1) {
      const fromLast = lastSets?.[si] ?? lastSets?.[lastSets.length - 1]
      sets.push({
        localSetId: newId(),
        setIndex: si,
        weight: fromLast?.weight ?? fallbackWeight,
        reps: fromLast?.reps ?? fallbackReps,
        rir: fromLast?.rir ?? effective.rirMin,
        status: 'pending',
        isExtra: false,
        skipReason: null,
        completedAt: null,
      })
    }

    return {
      localLogId: newId(),
      exerciseSlotId: entry.slot.id,
      sortOrder: i,
      status: 'pending',
      skipReason: null,
      suggestedWeight: entry.suggestedWeight,
      suggestedStatus: entry.suggestedStatus,
      exerciseName: entry.exercise.name,
      weightType: entry.exercise.weightType,
      slot: entry.slot,
      effectiveSets: effective.sets,
      repMin: effective.repMin,
      repMax: effective.repMax,
      rirMin: effective.rirMin,
      rirMax: effective.rirMax,
      restSec: effective.restSec,
      lastTimeDisplay: entry.lastTimeDisplay,
      progressionHint: entry.hint,
      sets,
    }
  })

  const record: LocalWorkoutRecord = {
    localId: newId(),
    templateCode: code,
    templateId: tpl.templateId,
    bodyWeightKg,
    date: today,
    weekNumber,
    mode: context.mode,
    startedAt,
    finishedAt: null,
    status: 'in_progress',
    serverSessionId: null,
    syncError: null,
    note: null,
    restTimer: null,
    exercises,
  }

  await idbPutSession(record)
  return record.localId
}

export const getLocalWorkout = async (localId: string): Promise<LocalWorkoutRecord | null> =>
  idbGetSession<LocalWorkoutRecord>(localId)

export const saveLocalWorkout = async (record: LocalWorkoutRecord): Promise<void> => {
  await idbPutSession(record)
}

export const listLocalWorkouts = async (): Promise<LocalWorkoutRecord[]> =>
  idbListSessions<LocalWorkoutRecord>()

export const getLocalInProgressSession = async (): Promise<LocalWorkoutRecord | null> => {
  const all = await listLocalWorkouts()
  return all.find((s) => s.status === 'in_progress') ?? null
}

export const listPendingSyncSessions = async (): Promise<LocalWorkoutRecord[]> => {
  const all = await listLocalWorkouts()
  return all.filter((s) => s.status === 'completed')
}

const refreshExerciseStatus = (ex: LocalExerciseLog): LocalExerciseLog => {
  const allResolved = ex.sets.every((s) => s.status === 'done' || s.status === 'skipped')
  if (!allResolved) {
    const anyDone = ex.sets.some((s) => s.status === 'done')
    return { ...ex, status: anyDone ? 'partial' : ex.status === 'pending' ? 'pending' : 'partial' }
  }
  const allSkipped = ex.sets.every((s) => s.status === 'skipped')
  return {
    ...ex,
    status: allSkipped ? 'skipped' : 'done',
    skipReason: allSkipped ? ex.skipReason : null,
  }
}

export const completeLocalSet = async (
  localId: string,
  localSetId: string,
  input: { weight: number; reps: number; rir: number },
): Promise<LocalWorkoutRecord> => {
  const record = await getLocalWorkout(localId)
  if (!record) throw new Error('SESSION_NOT_FOUND')

  const now = new Date().toISOString()
  let restSec = 90

  const exercises = record.exercises.map((ex) => {
    const sets = ex.sets.map((s) => {
      if (s.localSetId !== localSetId) return s
      restSec = ex.restSec
      return {
        ...s,
        weight: input.weight,
        reps: input.reps,
        rir: input.rir,
        status: 'done' as const,
        completedAt: now,
      }
    })
    return refreshExerciseStatus({ ...ex, sets })
  })

  const updated: LocalWorkoutRecord = {
    ...record,
    exercises,
    restTimer: {
      endsAt: new Date(Date.now() + restSec * 1000).toISOString(),
      label: null,
    },
  }
  await saveLocalWorkout(updated)
  return updated
}

export const skipLocalSet = async (
  localId: string,
  localSetId: string,
  reason: SkipReason,
): Promise<LocalWorkoutRecord> => {
  const record = await getLocalWorkout(localId)
  if (!record) throw new Error('SESSION_NOT_FOUND')

  const now = new Date().toISOString()
  const exercises = record.exercises.map((ex) => {
    const sets = ex.sets.map((s) =>
      s.localSetId === localSetId
        ? { ...s, status: 'skipped' as const, skipReason: reason, completedAt: now }
        : s,
    )
    return refreshExerciseStatus({ ...ex, sets })
  })

  const updated: LocalWorkoutRecord = {
    ...record,
    exercises,
    restTimer: null,
  }
  await saveLocalWorkout(updated)
  return updated
}

export const skipLocalExercise = async (
  localId: string,
  localLogId: string,
  reason: SkipReason,
): Promise<LocalWorkoutRecord> => {
  const record = await getLocalWorkout(localId)
  if (!record) throw new Error('SESSION_NOT_FOUND')

  const now = new Date().toISOString()
  const exercises = record.exercises.map((ex) => {
    if (ex.localLogId !== localLogId) return ex
    const sets = ex.sets.map((s) =>
      s.status === 'pending'
        ? { ...s, status: 'skipped' as const, skipReason: reason, completedAt: now }
        : s,
    )
    return { ...ex, sets, status: 'skipped' as const, skipReason: reason }
  })

  const updated: LocalWorkoutRecord = { ...record, exercises, restTimer: null }
  await saveLocalWorkout(updated)
  return updated
}

export const addLocalExtraSet = async (
  localId: string,
  localLogId: string,
): Promise<LocalWorkoutRecord> => {
  const record = await getLocalWorkout(localId)
  if (!record) throw new Error('SESSION_NOT_FOUND')

  const exercises = record.exercises.map((ex) => {
    if (ex.localLogId !== localLogId) return ex
    const last = ex.sets[ex.sets.length - 1]
    const nextIndex = (last?.setIndex ?? -1) + 1
    const newSet: LocalSetLog = {
      localSetId: newId(),
      setIndex: nextIndex,
      weight: last?.weight ?? null,
      reps: null,
      rir: last?.rir ?? 1,
      status: 'pending',
      isExtra: true,
      skipReason: null,
      completedAt: null,
    }
    return refreshExerciseStatus({ ...ex, sets: [...ex.sets, newSet] })
  })

  const updated: LocalWorkoutRecord = { ...record, exercises }
  await saveLocalWorkout(updated)
  return updated
}

export const clearLocalRestTimer = async (localId: string): Promise<LocalWorkoutRecord> => {
  const record = await getLocalWorkout(localId)
  if (!record) throw new Error('SESSION_NOT_FOUND')
  const updated = { ...record, restTimer: null }
  await saveLocalWorkout(updated)
  return updated
}

export const adjustLocalRestTimer = async (
  localId: string,
  deltaSec: number,
): Promise<LocalWorkoutRecord> => {
  const record = await getLocalWorkout(localId)
  if (!record?.restTimer) throw new Error('NO_TIMER')
  const ends = new Date(record.restTimer.endsAt).getTime() + deltaSec * 1000
  const updated: LocalWorkoutRecord = {
    ...record,
    restTimer: { ...record.restTimer, endsAt: new Date(ends).toISOString() },
  }
  await saveLocalWorkout(updated)
  return updated
}

export const finishLocalWorkout = async (
  localId: string,
  note?: string,
): Promise<{ ok: true; record: LocalWorkoutRecord } | { ok: false; pending: number }> => {
  const record = await getLocalWorkout(localId)
  if (!record) throw new Error('SESSION_NOT_FOUND')

  let pending = 0
  for (const ex of record.exercises) {
    pending += ex.sets.filter((s) => s.status === 'pending').length
  }
  if (pending > 0) return { ok: false, pending }

  const updated: LocalWorkoutRecord = {
    ...record,
    status: 'completed',
    finishedAt: new Date().toISOString(),
    note: note ?? null,
    restTimer: null,
  }
  await saveLocalWorkout(updated)
  return { ok: true, record: updated }
}

export const markLocalSynced = async (
  localId: string,
  serverSessionId: number,
): Promise<void> => {
  const record = await getLocalWorkout(localId)
  if (!record) return
  await saveLocalWorkout({
    ...record,
    status: 'synced',
    serverSessionId,
    syncError: null,
  })
}

export const setLocalSyncError = async (localId: string, message: string): Promise<void> => {
  const record = await getLocalWorkout(localId)
  if (!record) return
  await saveLocalWorkout({ ...record, syncError: message })
}

export const toSyncPayload = (record: LocalWorkoutRecord): SyncSessionPayload => {
  if (!record.finishedAt) {
    throw new Error('NOT_FINISHED')
  }
  return {
    localId: record.localId,
    templateCode: record.templateCode,
    bodyWeightKg: record.bodyWeightKg,
    date: record.date,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    note: record.note ?? undefined,
    exercises: record.exercises.map((ex) => ({
      exerciseSlotId: ex.exerciseSlotId,
      sortOrder: ex.sortOrder,
      status: ex.status,
      skipReason: ex.skipReason,
      suggestedWeight: ex.suggestedWeight,
      suggestedStatus: ex.suggestedStatus,
      sets: ex.sets.map((s) => ({
        setIndex: s.setIndex,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        status: s.status,
        isExtra: s.isExtra,
        skipReason: s.skipReason,
        completedAt: s.completedAt,
      })),
    })),
  }
}
