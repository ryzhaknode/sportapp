import { and, eq, gte, lte } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { skippedDays } from '@/lib/db/schema'

export const markSkipped = async (date: string) => {
  const db = getDb()
  const now = new Date().toISOString()
  await db
    .insert(skippedDays)
    .values({ date, createdAt: now })
    .onConflictDoNothing()
}

export const unmarkSkipped = async (date: string) => {
  const db = getDb()
  await db.delete(skippedDays).where(eq(skippedDays.date, date))
}

export const isManuallySkipped = async (date: string): Promise<boolean> => {
  const db = getDb()
  const rows = await db.select().from(skippedDays).where(eq(skippedDays.date, date)).limit(1)
  return rows.length > 0
}

export const getSkippedDatesInRange = async (from: string, to: string): Promise<string[]> => {
  const db = getDb()
  const rows = await db
    .select()
    .from(skippedDays)
    .where(and(gte(skippedDays.date, from), lte(skippedDays.date, to)))
  return rows.map((r) => r.date)
}

export const getAllSkippedDates = async (): Promise<string[]> => {
  const db = getDb()
  const rows = await db.select().from(skippedDays)
  return rows.map((r) => r.date)
}
