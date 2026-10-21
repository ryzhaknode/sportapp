/**
 * DB-backed tests for the workout session lifecycle and progression wiring.
 *
 * Uses a libSQL *file* in a temp dir, not ':memory:': @libsql/client's
 * transaction() opens a fresh connection, which for ':memory:' is an empty DB.
 * Vitest isolates modules per file, so the getDb() singleton belongs to this file.
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureDbMigrated, getDb } from '@/lib/db'
import { getTemplateByCode, type TemplateWithSlots } from '@/lib/db/program'
import {
  bodyWeightLogs,
  exerciseLogs,
  progressionState,
  restTimers,
  setLogs,
  settings,
  type WorkoutTemplateCode,
  workoutSessions,
} from '@/lib/db/schema'
import { ensureSettings } from '@/lib/db/seed-program'
import {
  completeSet,
  type ExerciseLogRow,
  finishWorkoutSession,
  getHomeExercisePreviews,
  isSessionStale,
  loadSessionDetail,
  resolveStaleSession,
  type SetLogRow,
  skipExercise,
  skipSet,
  startWorkoutSession,
} from '@/lib/db/workout-sessions'
import { getEffectiveSlotParams, getWeekContext } from '@/lib/program/week-cycle'
import { decreaseWeight, roundToIncrement } from '@/lib/progression/weight'

const DAY_MS = 86_400_000
// 05:00 UTC = 08:00 Kyiv: the same calendar day whether "today" comes from the
// machine's local date or from a Kyiv-timezone helper.
const BASE_TIME = new Date('2026-01-12T05:00:00.000Z')

let tmpDir: string
let templateA: TemplateWithSlots

/** Calendar date of the frozen clock (same in UTC and Kyiv at 05:00 UTC). */
const today = (): string => new Date().toISOString().slice(0, 10)

const advanceDays = (days: number) => {
  vi.setSystemTime(Date.now() + days * DAY_MS)
}

/**
 * Puts "today" in the given cycle week. The start date sits 3 days into the
 * week so a ±1 day difference in how "today" is computed keeps the same week.
 */
const setProgramWeek = async (week: number) => {
  const start = new Date(Date.now() - ((week - 1) * 7 + 3) * DAY_MS)
  await getDb()
    .update(settings)
    .set({ programStartDate: start.toISOString().slice(0, 10), tournamentWeekEnabled: false })
    .where(eq(settings.id, 1))
}

const loadDetail = async (sessionId: number) => {
  const detail = await loadSessionDetail(sessionId)
  if (!detail) throw new Error(`session ${sessionId} not found`)
  return detail
}

type SetValues = { weight: number; reps: number; rir: number }

/** Starts a session, completes every planned set with `pick`, finishes it and moves the clock on 2 days. */
const runSession = async (
  code: WorkoutTemplateCode,
  pick: (ex: ExerciseLogRow, set: SetLogRow) => SetValues,
) => {
  const sessionId = await startWorkoutSession(code, 80)
  const detail = await loadDetail(sessionId)
  for (const ex of detail.exercises) {
    for (const set of ex.sets) {
      await completeSet({ setId: Number(set.id), ...pick(ex, set) })
    }
  }
  const result = await finishWorkoutSession(sessionId)
  expect(result).toEqual({ ok: true, sessionId })
  advanceDays(2)
  return sessionId
}

const startWeightOf = (ex: ExerciseLogRow): number => ex.slot.startWeight ?? 0

const progressionRows = async () =>
  getDb().select().from(progressionState).orderBy(progressionState.exerciseSlotId)

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(BASE_TIME)

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sportapp-db-test-'))
  process.env.DATABASE_URL = `file:${path.join(tmpDir, 'test.db')}`
  delete process.env.TURSO_DATABASE_URL
  delete process.env.TURSO_AUTH_TOKEN
  delete process.env.SKIP_DB_MIGRATE

  await ensureDbMigrated()
  await ensureSettings()
  const tpl = await getTemplateByCode('A')
  if (!tpl) throw new Error('template A not seeded')
  templateA = tpl
})

afterAll(() => {
  getDb().$client.close()
  vi.useRealTimers()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

beforeEach(async () => {
  vi.setSystemTime(BASE_TIME)
  const db = getDb()
  for (const table of [setLogs, exerciseLogs, workoutSessions, progressionState, restTimers, bodyWeightLogs]) {
    await db.delete(table)
  }
  await setProgramWeek(1)
})

describe('startWorkoutSession', () => {
  it('creates an in-progress session prefilled from the program on the first run', async () => {
    const sessionId = await startWorkoutSession('A', 80)
    const detail = await loadDetail(sessionId)

    expect(detail.templateCode).toBe('A')
    expect(detail.session).toMatchObject({
      status: 'in_progress',
      date: today(),
      weekNumber: 1,
      mode: 'normal',
      finishedAt: null,
    })
    expect(detail.restTimer).toBeNull()

    const ctx = getWeekContext(1, false)
    expect(detail.exercises.map((e) => e.exerciseSlotId)).toEqual(templateA.slots.map((s) => s.id))
    for (const [i, slot] of templateA.slots.entries()) {
      const ex = detail.exercises[i]
      const effective = getEffectiveSlotParams(slot, ctx)
      expect(ex.sortOrder).toBe(i)
      expect(ex.status).toBe('pending')
      expect(ex.suggestedStatus).toBe('first')
      expect(ex.suggestedWeight).toBe(slot.startWeight)
      expect(ex.effectiveSets).toBe(effective.sets)
      expect(ex.sets).toHaveLength(effective.sets)
      expect(ex.sets.map((s) => s.setIndex)).toEqual([...Array(effective.sets).keys()])
      for (const set of ex.sets) {
        expect(set).toMatchObject({
          status: 'pending',
          isExtra: false,
          weight: slot.startWeight,
          reps: slot.repMin,
          rir: effective.rirMin,
        })
      }
    }

    const bw = await getDb().select().from(bodyWeightLogs)
    expect(bw).toHaveLength(1)
    expect(bw[0]).toMatchObject({ sessionId, weightKg: 80, date: today() })
  })

  it.each([
    { week: 7, mode: 'deload' },
    { week: 8, mode: 'normal' },
    { week: 13, mode: 'test' },
  ] as const)('week $week → $mode session with the effective set count', async ({ week, mode }) => {
    await setProgramWeek(week)
    const detail = await loadDetail(await startWorkoutSession('A', 80))

    expect(detail.session).toMatchObject({ weekNumber: week, mode })
    const ctx = getWeekContext(week, false)
    for (const [i, slot] of templateA.slots.entries()) {
      expect(detail.exercises[i].sets).toHaveLength(getEffectiveSlotParams(slot, ctx).sets)
    }
    if (week === 8) {
      // Extra-set phase: slots flagged extraSetInPhase get one more planned set.
      const bench = detail.exercises.find((e) => e.slot.extraSetInPhase)!
      expect(bench.sets).toHaveLength(bench.slot.sets + 1)
    }
  })

  it('returns the existing in-progress session instead of starting another', async () => {
    const first = await startWorkoutSession('A', 80)
    expect(await startWorkoutSession('B', 81)).toBe(first)
    expect(await getDb().select().from(workoutSessions)).toHaveLength(1)
  })

  it('rejects an implausible body weight', async () => {
    await expect(startWorkoutSession('A', 0)).rejects.toThrow('INVALID_BODY_WEIGHT')
    await expect(startWorkoutSession('A', 301)).rejects.toThrow('INVALID_BODY_WEIGHT')
  })
})

describe('completeSet / finishWorkoutSession', () => {
  it('refuses to finish with pending sets, then completes and caches progression', async () => {
    const sessionId = await startWorkoutSession('A', 80)
    let detail = await loadDetail(sessionId)
    const totalSets = detail.exercises.reduce((n, e) => n + e.sets.length, 0)

    expect(await finishWorkoutSession(sessionId)).toEqual({ ok: false, pending: totalSets })

    const [first] = detail.exercises
    const res = await completeSet({ setId: Number(first.sets[0].id), weight: 70, reps: 8, rir: 2 })
    const expectedEndsAt = new Date(Date.now() + first.restSec * 1000).toISOString()
    expect(res).toEqual({ sessionId, restSec: first.restSec, endsAt: expectedEndsAt })

    detail = await loadDetail(sessionId)
    expect(detail.exercises[0].status).toBe('partial')
    expect(detail.exercises[0].sets[0]).toMatchObject({
      status: 'done',
      weight: 70,
      reps: 8,
      rir: 2,
      completedAt: new Date().toISOString(),
    })
    expect(detail.restTimer).toEqual({ endsAt: expectedEndsAt, label: null })
    expect(await getDb().select().from(restTimers)).toHaveLength(1)
    expect(await finishWorkoutSession(sessionId)).toEqual({ ok: false, pending: totalSets - 1 })

    for (const set of first.sets.slice(1)) {
      await completeSet({ setId: Number(set.id), weight: 70, reps: 8, rir: 2 })
    }
    expect((await loadDetail(sessionId)).exercises[0].status).toBe('done')
    // Each completed set replaces the session's single rest timer.
    expect(await getDb().select().from(restTimers)).toHaveLength(1)

    for (const ex of detail.exercises.slice(1)) {
      for (const set of ex.sets) {
        await completeSet({ setId: Number(set.id), weight: startWeightOf(ex), reps: ex.repMin, rir: ex.rirMin })
      }
    }

    expect(await finishWorkoutSession(sessionId, 'добре')).toEqual({ ok: true, sessionId })
    detail = await loadDetail(sessionId)
    expect(detail.session).toMatchObject({
      status: 'completed',
      finishedAt: new Date().toISOString(),
      note: 'добре',
    })
    expect(detail.exercises.every((e) => e.status === 'done')).toBe(true)
    expect(await getDb().select().from(restTimers)).toHaveLength(0)

    const rows = await progressionRows()
    expect(rows.map((r) => r.exerciseSlotId)).toEqual(templateA.slots.map((s) => s.id).sort((a, b) => a - b))
    const squat = rows.find((r) => r.exerciseSlotId === first.exerciseSlotId)!
    // A single session has no previous one to compare → add_reps at the same weight.
    expect(squat).toMatchObject({ currentWeight: 70, stallCount: 0, lastStatus: 'add_reps' })
  })
})

describe('progression across sessions', () => {
  it('all sets at repMax with rir ≥ rirMin → increase_weight by one increment', async () => {
    await runSession('A', (ex) => ({ weight: startWeightOf(ex), reps: ex.repMax, rir: ex.rirMin }))

    const previews = await getHomeExercisePreviews('A')
    expect(previews.map((p) => p.slotId)).toEqual(templateA.slots.map((s) => s.id))
    for (const [i, slot] of templateA.slots.entries()) {
      expect(previews[i].status).toBe('increase_weight')
      expect(previews[i].suggestedWeight).toBe(
        roundToIncrement((slot.startWeight ?? 0) + slot.increment, slot.increment),
      )
    }
    const rows = await progressionRows()
    expect(rows.every((r) => r.lastStatus === 'increase_weight')).toBe(true)
  })

  it('after increase_weight the next session suggests the new weight but prefills the old one', async () => {
    await runSession('A', (ex) => ({ weight: startWeightOf(ex), reps: ex.repMax, rir: ex.rirMin }))

    const detail = await loadDetail(await startWorkoutSession('A', 80))
    for (const ex of detail.exercises) {
      const increased = roundToIncrement(startWeightOf(ex) + ex.slot.increment, ex.slot.increment)
      expect(ex.suggestedStatus).toBe('increase_weight')
      expect(ex.suggestedWeight).toBe(increased)
      // SUSPECTED BUG (current behaviour): set prefill copies the last session's
      // sets (weight and reps) instead of suggestedWeight/suggestedRepTarget, and
      // the workout form shows `set.weight ?? suggestedWeight`, so it opens on
      // the old weight at repMax. See the todo below.
      for (const set of ex.sets) {
        expect(set.weight).toBe(startWeightOf(ex))
        expect(set.reps).toBe(ex.repMax)
      }
    }
  })

  it.todo('after increase_weight / decrease_weight, new sets are prefilled with suggestedWeight')

  it('three sessions with the same weight and reps → stall → decrease_weight', async () => {
    const sameEveryTime = (ex: ExerciseLogRow): SetValues => ({
      weight: startWeightOf(ex),
      reps: ex.repMin + 1,
      rir: ex.rirMin,
    })
    const squatSlot = templateA.slots[0]

    await runSession('A', sameEveryTime)
    expect((await getHomeExercisePreviews('A'))[0].status).toBe('add_reps')

    await runSession('A', sameEveryTime)
    expect((await getHomeExercisePreviews('A'))[0].status).toBe('add_reps')
    expect((await progressionRows()).find((r) => r.exerciseSlotId === squatSlot.id)).toMatchObject({
      stallCount: 1,
      lastStatus: 'add_reps',
    })

    await runSession('A', sameEveryTime)
    const previews = await getHomeExercisePreviews('A')
    for (const [i, slot] of templateA.slots.entries()) {
      expect(previews[i].status).toBe('decrease_weight')
      expect(previews[i].suggestedWeight).toBe(decreaseWeight(slot.startWeight ?? 0, slot.increment))
    }
    expect((await progressionRows()).find((r) => r.exerciseSlotId === squatSlot.id)).toMatchObject({
      stallCount: 0,
      lastStatus: 'decrease_weight',
    })
  })

  it('a deload-week session does not change the progression result', async () => {
    await runSession('A', (ex) => ({ weight: startWeightOf(ex), reps: ex.repMin + 1, rir: ex.rirMin }))
    const before = await getHomeExercisePreviews('A')
    const stateBefore = await progressionRows()

    await setProgramWeek(7)
    const deloadId = await runSession('A', (ex) => ({
      weight: startWeightOf(ex) + 10,
      reps: ex.repMax,
      rir: ex.rirMax,
    }))
    const deload = await loadDetail(deloadId)
    expect(deload.session).toMatchObject({ mode: 'deload', weekNumber: 7, status: 'completed' })

    expect(await getHomeExercisePreviews('A')).toEqual(before)
    expect(await progressionRows()).toEqual(stateBefore)
  })
})

describe('skipping and stale sessions', () => {
  it('skipSet / skipExercise statuses, resolveStaleSession, one completed session per code per day', async () => {
    const sessionId = await startWorkoutSession('A', 80)
    const detail = await loadDetail(sessionId)
    const [mixed, allSkipped, skippedWhole, partial, untouched] = detail.exercises
    const done = (set: SetLogRow, ex: ExerciseLogRow) =>
      completeSet({ setId: Number(set.id), weight: startWeightOf(ex), reps: ex.repMin, rir: ex.rirMin })

    // Some done, the rest skipped → the exercise counts as done.
    await done(mixed.sets[0], mixed)
    for (const set of mixed.sets.slice(1)) {
      expect(await skipSet(Number(set.id), 'pain')).toBe(sessionId)
    }

    // Every set skipped one by one → the exercise is skipped with that reason.
    for (const set of allSkipped.sets) await skipSet(Number(set.id), 'equipment_busy')

    expect(await skipExercise(Number(skippedWhole.id), 'other')).toBe(sessionId)
    await done(partial.sets[0], partial)

    let after = await loadDetail(sessionId)
    const byId = (id: ExerciseLogRow['id']) => after.exercises.find((e) => e.id === id)!
    expect(byId(mixed.id)).toMatchObject({ status: 'done', skipReason: null })
    expect(byId(mixed.id).sets.map((s) => [s.status, s.skipReason])).toEqual([
      ['done', null],
      ...mixed.sets.slice(1).map(() => ['skipped', 'pain']),
    ])
    expect(byId(allSkipped.id)).toMatchObject({ status: 'skipped', skipReason: 'equipment_busy' })
    expect(byId(skippedWhole.id)).toMatchObject({ status: 'skipped', skipReason: 'other' })
    expect(byId(skippedWhole.id).sets.every((s) => s.status === 'skipped' && s.skipReason === 'other')).toBe(true)
    expect(byId(partial.id).status).toBe('partial')
    expect(byId(untouched.id).status).toBe('pending')

    const pending = partial.sets.length - 1 + untouched.sets.length
    expect(await finishWorkoutSession(sessionId)).toEqual({ ok: false, pending })

    vi.setSystemTime(Date.now() + 13 * 3_600_000)
    expect(isSessionStale(after.session)).toBe(true)
    vi.setSystemTime(BASE_TIME)

    expect(await resolveStaleSession(sessionId)).toEqual({ ok: true, sessionId })
    after = await loadDetail(sessionId)
    expect(after.session.status).toBe('completed')
    // A partially done exercise is marked skipped as a whole; its done set stays done.
    expect(byId(partial.id)).toMatchObject({ status: 'skipped', skipReason: 'no_time' })
    expect(byId(partial.id).sets.map((s) => [s.status, s.skipReason])).toEqual([
      ['done', null],
      ...partial.sets.slice(1).map(() => ['skipped', 'no_time']),
    ])
    expect(byId(untouched.id)).toMatchObject({ status: 'skipped', skipReason: 'no_time' })
    expect(byId(untouched.id).sets.every((s) => s.status === 'skipped' && s.skipReason === 'no_time')).toBe(true)
    // Earlier skip reasons are kept.
    expect(byId(skippedWhole.id).skipReason).toBe('other')

    // Only the exercise that ended "done" (with a done set) is cached.
    expect((await progressionRows()).map((r) => r.exerciseSlotId)).toEqual([mixed.exerciseSlotId])

    await expect(startWorkoutSession('A', 80)).rejects.toThrow('WORKOUT_ALREADY_COMPLETED_TODAY')
    // Other codes are still allowed the same day.
    const other = await startWorkoutSession('B', 80)
    expect((await loadDetail(other)).templateCode).toBe('B')
  })
})
