import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { maxTests } from '@/lib/db/schema'
import type { ExerciseVariant } from '@/lib/workouts'

export const getMaxTests = async (variant?: ExerciseVariant) => {
  const db = getDb()
  if (variant) {
    return db
      .select()
      .from(maxTests)
      .where(eq(maxTests.variant, variant))
      .orderBy(desc(maxTests.testedAt))
  }
  return db.select().from(maxTests).orderBy(desc(maxTests.testedAt))
}

export const getLatestMaxTest = async (variant: ExerciseVariant) => {
  const rows = await getMaxTests(variant)
  return rows[0] ?? null
}

export const addMaxTest = async (input: {
  variant: ExerciseVariant
  maxReps: number
  testedAt: string
  notes?: string
}) => {
  const db = getDb()
  await db.insert(maxTests).values({
    variant: input.variant,
    maxReps: input.maxReps,
    testedAt: input.testedAt,
    notes: input.notes ?? null,
  })
}

export const shouldSuggestMaxTest = async (variant: ExerciseVariant): Promise<boolean> => {
  const latest = await getLatestMaxTest(variant)
  if (!latest) return false
  const tested = new Date(`${latest.testedAt}T12:00:00`)
  const now = new Date()
  const weeks = (now.getTime() - tested.getTime()) / (7 * 86_400_000)
  return weeks >= 6
}
