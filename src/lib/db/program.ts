import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { ensureProgramSeeded } from '@/lib/db/seed-program'
import {
  exerciseSlots,
  exercises,
  type Exercise,
  type ExerciseSlot,
  type WorkoutTemplate,
  type WorkoutTemplateCode,
  workoutTemplates,
} from '@/lib/db/schema'

export interface SlotWithExercise extends ExerciseSlot {
  exercise: Exercise
}

export interface TemplateWithSlots extends WorkoutTemplate {
  slots: SlotWithExercise[]
}

export const getTemplateByCode = async (
  code: WorkoutTemplateCode,
): Promise<TemplateWithSlots | null> => {
  const db = getDb()
  const programId = await ensureProgramSeeded()
  const templates = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.programId, programId))

  const template = templates.find((t) => t.code === code)
  if (!template) return null

  const slots = await db
    .select()
    .from(exerciseSlots)
    .where(eq(exerciseSlots.workoutTemplateId, template.id))
    .orderBy(asc(exerciseSlots.sortOrder))

  const allExercises = await db.select().from(exercises)
  const exMap = new Map(allExercises.map((e) => [e.id, e]))

  return {
    ...template,
    slots: slots.map((slot) => ({
      ...slot,
      exercise: exMap.get(slot.exerciseId)!,
    })),
  }
}

export const getAllTemplates = async (): Promise<TemplateWithSlots[]> => {
  const codes: WorkoutTemplateCode[] = ['A', 'B', 'C']
  const results = await Promise.all(codes.map((c) => getTemplateByCode(c)))
  return results.filter((t): t is TemplateWithSlots => t !== null)
}

export const getSlotById = async (slotId: number): Promise<SlotWithExercise | null> => {
  const db = getDb()
  const rows = await db.select().from(exerciseSlots).where(eq(exerciseSlots.id, slotId)).limit(1)
  const slot = rows[0]
  if (!slot) return null
  const ex = await db.select().from(exercises).where(eq(exercises.id, slot.exerciseId)).limit(1)
  if (!ex[0]) return null
  return { ...slot, exercise: ex[0] }
}

export const updateExerciseSlot = async (
  slotId: number,
  patch: Partial<
    Pick<
      ExerciseSlot,
      | 'sets'
      | 'repMin'
      | 'repMax'
      | 'rirMin'
      | 'rirMax'
      | 'restSec'
      | 'startWeight'
      | 'increment'
    >
  >,
) => {
  const db = getDb()
  await db.update(exerciseSlots).set(patch).where(eq(exerciseSlots.id, slotId))
}
