import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { type WorkoutTemplateCode, workoutSessions, workoutTemplates } from '@/lib/db/schema'

export const getTemplateCodeForSession = async (
  sessionId: number,
): Promise<WorkoutTemplateCode | null> => {
  const db = getDb()
  const rows = await db
    .select({ code: workoutTemplates.code })
    .from(workoutSessions)
    .innerJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
    .where(eq(workoutSessions.id, sessionId))
    .limit(1)

  const code = rows[0]?.code
  if (code === 'A' || code === 'B' || code === 'C') return code
  return null
}
