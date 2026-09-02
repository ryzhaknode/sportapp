import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { formatDateLocal } from '@/lib/utils'

export const getSettings = async () => {
  const db = getDb()
  const rows = await db.select().from(settings).limit(1)

  if (rows[0]) return rows[0]

  const today = formatDateLocal(new Date())
  await db.insert(settings).values({
    id: 1,
    startDate: today,
    currentVariant: 'standard',
    baselineMax: 20,
    cycleOffset: 0,
  })

  const created = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)
  return created[0]
}

export const incrementCycleOffset = async () => {
  const db = getDb()
  const current = await getSettings()
  await db
    .update(settings)
    .set({ cycleOffset: current.cycleOffset + 1 })
    .where(eq(settings.id, 1))
}
