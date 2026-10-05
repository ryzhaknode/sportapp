import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { ensureSettings } from '@/lib/db/seed-program'
import { settings } from '@/lib/db/schema'

export const getSettings = async () => ensureSettings()

export const updateSettings = async (
  patch: Partial<Omit<typeof settings.$inferInsert, 'id'>>,
) => {
  const db = getDb()
  await getSettings()
  await db.update(settings).set(patch).where(eq(settings.id, 1))
}
