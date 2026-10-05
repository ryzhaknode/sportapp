/**
 * Demo history: two completed A sessions, last one strong (+1 extra set on bench).
 * Run: npm run seed:mock
 */
import { eq } from 'drizzle-orm'
import { ensureDbMigrated, getDb } from '../src/lib/db/index'
import { getTemplateByCode } from '../src/lib/db/program'
import { ensureProgramSeeded, ensureSettings } from '../src/lib/db/seed-program'
import { getProgressionForSlot } from '../src/lib/db/workout-sessions'
import {
  bodyWeightLogs,
  exerciseLogs,
  progressionState,
  restTimers,
  setLogs,
  settings,
  workoutSessions,
} from '../src/lib/db/schema'
import { getEffectiveSlotParams, getWeekContext } from '../src/lib/program/week-cycle'

type SetSeed = { weight: number; reps: number; rir: number; isExtra?: boolean }

const clearWorkoutData = async () => {
  const db = getDb()
  await db.delete(restTimers)
  await db.delete(setLogs)
  await db.delete(exerciseLogs)
  await db.delete(workoutSessions)
  await db.delete(progressionState)
  await db.delete(bodyWeightLogs)
}

const insertCompletedA = async (input: {
  date: string
  weekNumber: number
  exerciseSets: SetSeed[][]
  note: string
}) => {
  const db = getDb()
  const template = await getTemplateByCode('A')
  if (!template) throw new Error('Template A not found')

  const context = getWeekContext(input.weekNumber, false)
  const started = `${input.date}T10:00:00.000Z`
  const finished = `${input.date}T11:15:00.000Z`

  const [session] = await db
    .insert(workoutSessions)
    .values({
      workoutTemplateId: template.id,
      date: input.date,
      startedAt: started,
      finishedAt: finished,
      weekNumber: input.weekNumber,
      mode: context.mode,
      status: 'completed',
      note: input.note,
    })
    .returning()

  await db.insert(bodyWeightLogs).values({
    date: input.date,
    weightKg: input.date === '2026-09-29' ? 81.8 : 82.4,
    sessionId: session.id,
    createdAt: finished,
  })

  for (const [i, slot] of template.slots.entries()) {
    const setData = input.exerciseSets[i] ?? []

    const [log] = await db
      .insert(exerciseLogs)
      .values({
        sessionId: session.id,
        exerciseSlotId: slot.id,
        sortOrder: i,
        status: 'done',
        suggestedWeight: slot.startWeight,
        suggestedStatus: 'first',
      })
      .returning()

    for (const [si, s] of setData.entries()) {
      await db.insert(setLogs).values({
        exerciseLogId: log.id,
        setIndex: si,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        status: 'done',
        isExtra: s.isExtra ?? false,
        completedAt: finished,
      })
    }
  }
}

const refreshProgressionState = async () => {
  const db = getDb()
  const template = await getTemplateByCode('A')
  if (!template) return

  const context = getWeekContext(5, false)

  for (const slot of template.slots) {
    const effective = getEffectiveSlotParams(slot, context)
    const progression = await getProgressionForSlot(slot.id, template.id, effective.sets)

    await db
      .insert(progressionState)
      .values({
        exerciseSlotId: slot.id,
        currentWeight: progression.suggestedWeight ?? slot.startWeight,
        stallCount: progression.stallCount,
        lastStatus: progression.status,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: progressionState.exerciseSlotId,
        set: {
          currentWeight: progression.suggestedWeight ?? slot.startWeight,
          stallCount: progression.stallCount,
          lastStatus: progression.status,
          updatedAt: new Date().toISOString(),
        },
      })
  }
}

const main = async () => {
  await ensureDbMigrated()
  await ensureProgramSeeded()
  await ensureSettings()

  const db = getDb()
  await db.update(settings).set({ programStartDate: '2026-09-01' }).where(eq(settings.id, 1))

  await clearWorkoutData()

  await insertCompletedA({
    date: '2026-09-22',
    weekNumber: 4,
    note: 'Мок: базове A',
    exerciseSets: [
      [
        { weight: 70, reps: 7, rir: 2 },
        { weight: 70, reps: 7, rir: 2 },
        { weight: 70, reps: 6, rir: 3 },
      ],
      [
        { weight: 65, reps: 9, rir: 2 },
        { weight: 65, reps: 9, rir: 2 },
        { weight: 65, reps: 8, rir: 2 },
        { weight: 65, reps: 8, rir: 3 },
      ],
      [
        { weight: 5, reps: 10, rir: 2 },
        { weight: 5, reps: 9, rir: 2 },
        { weight: 5, reps: 9, rir: 2 },
        { weight: 5, reps: 8, rir: 3 },
      ],
      [
        { weight: 7, reps: 14, rir: 1 },
        { weight: 7, reps: 13, rir: 1 },
        { weight: 7, reps: 12, rir: 2 },
      ],
      [
        { weight: 27.5, reps: 10, rir: 1 },
        { weight: 27.5, reps: 9, rir: 1 },
        { weight: 27.5, reps: 9, rir: 2 },
      ],
    ],
  })

  await insertCompletedA({
    date: '2026-09-29',
    weekNumber: 5,
    note: 'Мок: сильне A (+1 підхід на жимі)',
    exerciseSets: [
      [
        { weight: 70, reps: 8, rir: 2 },
        { weight: 70, reps: 9, rir: 2 },
        { weight: 70, reps: 8, rir: 2 },
      ],
      [
        { weight: 65, reps: 10, rir: 2 },
        { weight: 65, reps: 10, rir: 2 },
        { weight: 65, reps: 10, rir: 2 },
        { weight: 65, reps: 10, rir: 2 },
        { weight: 65, reps: 8, rir: 2, isExtra: true },
      ],
      [
        { weight: 5, reps: 10, rir: 2 },
        { weight: 5, reps: 10, rir: 2 },
        { weight: 5, reps: 10, rir: 2 },
        { weight: 5, reps: 9, rir: 2 },
      ],
      [
        { weight: 7, reps: 16, rir: 1 },
        { weight: 7, reps: 15, rir: 1 },
        { weight: 7, reps: 14, rir: 1 },
      ],
      [
        { weight: 27.5, reps: 11, rir: 1 },
        { weight: 27.5, reps: 10, rir: 1 },
        { weight: 27.5, reps: 10, rir: 2 },
      ],
    ],
  })

  await refreshProgressionState()

  console.log('✓ Mock history seeded (2× A). Відкрий головну → «Почати тренування».')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
