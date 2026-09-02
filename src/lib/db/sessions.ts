import { and, desc, eq, gte, lt, lte } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import type { WorkoutSet } from '@/lib/db/schema'
import { workoutSessions } from '@/lib/db/schema'
import type { WorkoutType } from '@/lib/cycle'
import type { ExerciseVariant } from '@/lib/workouts'
import { calcTotalReps, WORKOUT_TEMPLATES } from '@/lib/workouts'

export const getSessionByDate = async (date: string) => {
  const db = getDb()
  const rows = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.date, date))
    .limit(1)
  return rows[0] ?? null
}

export const getLastSessionByType = async (
  type: WorkoutType,
  variant: ExerciseVariant,
  beforeDate?: string,
) => {
  const db = getDb()
  const conditions = [
    eq(workoutSessions.type, type),
    eq(workoutSessions.variant, variant),
  ]

  if (beforeDate) {
    conditions.push(lt(workoutSessions.date, beforeDate))
  }

  const rows = await db
    .select()
    .from(workoutSessions)
    .where(and(...conditions))
    .orderBy(desc(workoutSessions.date))
    .limit(1)

  return rows[0] ?? null
}

export const getLatestSessionsByType = async (variant: ExerciseVariant) => {
  const types: WorkoutType[] = ['A', 'B', 'C']
  const results = await Promise.all(
    types.map((type) => getLastSessionByType(type, variant)),
  )
  return { A: results[0], B: results[1], C: results[2] }
}

export const getSessionsInRange = async (from: string, to: string, variant?: ExerciseVariant) => {
  const db = getDb()
  const conditions = [gte(workoutSessions.date, from), lte(workoutSessions.date, to)]
  if (variant) {
    conditions.push(eq(workoutSessions.variant, variant))
  }
  return db
    .select()
    .from(workoutSessions)
    .where(and(...conditions))
    .orderBy(desc(workoutSessions.date))
}

export const getSessionsMapInRange = async (from: string, to: string, variant?: ExerciseVariant) => {
  const sessions = await getSessionsInRange(from, to, variant)
  const map = new Map<string, (typeof sessions)[0]>()
  for (const s of sessions) {
    map.set(s.date, s)
  }
  return map
}

export const getAllSessions = async (variant?: ExerciseVariant) => {
  const db = getDb()
  if (variant) {
    return db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.variant, variant))
      .orderBy(desc(workoutSessions.date))
  }
  return db.select().from(workoutSessions).orderBy(desc(workoutSessions.date))
}

export const parseSets = (setsJson: string): WorkoutSet[] => {
  return JSON.parse(setsJson) as WorkoutSet[]
}

export const getInitialReps = async (
  type: WorkoutType,
  variant: ExerciseVariant,
): Promise<number[]> => {
  const last = await getLastSessionByType(type, variant)
  if (last) {
    return parseSets(last.sets).map((s) => s.reps)
  }
  return [...WORKOUT_TEMPLATES[type].defaultReps]
}

export const saveSession = async (input: {
  date: string
  type: WorkoutType
  variant: ExerciseVariant
  reps: number[]
  notes?: string
}) => {
  const db = getDb()
  const sets: WorkoutSet[] = input.reps.map((reps) => ({ reps }))
  const totalReps = calcTotalReps(input.reps)
  const now = new Date().toISOString()
  const existing = await getSessionByDate(input.date)

  if (existing) {
    await db
      .update(workoutSessions)
      .set({
        type: input.type,
        variant: input.variant,
        sets: JSON.stringify(sets),
        totalReps,
        notes: input.notes ?? null,
        completedAt: now,
      })
      .where(eq(workoutSessions.id, existing.id))
    return existing.id
  }

  const inserted = await db
    .insert(workoutSessions)
    .values({
      date: input.date,
      type: input.type,
      variant: input.variant,
      sets: JSON.stringify(sets),
      totalReps,
      notes: input.notes ?? null,
      completedAt: now,
      createdAt: now,
    })
    .returning({ id: workoutSessions.id })

  return inserted[0].id
}

export const getSessionDelta = async (
  type: WorkoutType,
  variant: ExerciseVariant,
  totalReps: number,
  date: string,
): Promise<number | null> => {
  const previous = await getLastSessionByType(type, variant, date)
  if (!previous) return null
  return totalReps - previous.totalReps
}
