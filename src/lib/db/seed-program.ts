import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  exerciseSlots,
  exercises,
  programs,
  settings,
  workoutTemplates,
} from '@/lib/db/schema'
import { CYCLE_LENGTH_WEEKS, PROGRAM_NAME, SEED_EXERCISES, SEED_WORKOUTS } from '@/lib/program/seed'
import { formatDateLocal } from '@/lib/utils'

export const ensureProgramSeeded = async (): Promise<number> => {
  const db = getDb()
  const existing = await db.select().from(programs).limit(1)
  if (existing[0]) return existing[0].id

  const [program] = await db
    .insert(programs)
    .values({ name: PROGRAM_NAME, cycleLengthWeeks: CYCLE_LENGTH_WEEKS })
    .returning()

  const exerciseIdByKey = new Map<string, number>()
  for (const ex of SEED_EXERCISES) {
    const [row] = await db
      .insert(exercises)
      .values({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        weightType: ex.weightType,
      })
      .returning()
    exerciseIdByKey.set(ex.key, row.id)
  }

  for (const [wi, workout] of SEED_WORKOUTS.entries()) {
    const [template] = await db
      .insert(workoutTemplates)
      .values({
        programId: program.id,
        code: workout.code,
        sortOrder: wi,
      })
      .returning()

    for (const [si, slot] of workout.slots.entries()) {
      const exerciseId = exerciseIdByKey.get(slot.exerciseKey)
      if (!exerciseId) continue
      await db.insert(exerciseSlots).values({
        workoutTemplateId: template.id,
        exerciseId,
        sortOrder: si,
        sets: slot.sets,
        repMin: slot.repMin,
        repMax: slot.repMax,
        rirMin: slot.rirMin,
        rirMax: slot.rirMax,
        restSec: slot.restSec,
        startWeight: slot.startWeight,
        increment: slot.increment,
        extraSetInPhase: slot.extraSetInPhase ?? false,
        twelveWeekTargetMin: slot.twelveWeekTargetMin ?? null,
        twelveWeekTargetMax: slot.twelveWeekTargetMax ?? null,
        targetReps: 6,
      })
    }
  }

  return program.id
}

export const ensureSettings = async () => {
  const db = getDb()
  const programId = await ensureProgramSeeded()
  const rows = await db.select().from(settings).limit(1)

  if (rows[0]) {
    if (!rows[0].programId) {
      await db.update(settings).set({ programId }).where(eq(settings.id, 1))
    }
    return rows[0]
  }

  const today = formatDateLocal(new Date())
  await db.insert(settings).values({
    id: 1,
    programStartDate: today,
    programId,
    tournamentWeekEnabled: false,
    matchDate: null,
    timerSoundEnabled: true,
    timerVibrationEnabled: true,
  })

  const created = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)
  return created[0]
}
