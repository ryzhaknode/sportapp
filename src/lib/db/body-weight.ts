import { asc, desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { bodyWeightLogs } from '@/lib/db/schema'
import { formatDateLocal } from '@/lib/utils'

const nowIso = (): string => new Date().toISOString()

export const logBodyWeightForSession = async (input: {
  sessionId: number
  date: string
  weightKg: number
}) => {
  const db = getDb()
  await db.insert(bodyWeightLogs).values({
    date: input.date,
    weightKg: input.weightKg,
    sessionId: input.sessionId,
    createdAt: nowIso(),
  })
}

export const addBodyWeightEntry = async (input: {
  date: string
  weightKg: number
  note?: string
}) => {
  const db = getDb()
  await db.insert(bodyWeightLogs).values({
    date: input.date,
    weightKg: input.weightKg,
    sessionId: null,
    note: input.note ?? null,
    createdAt: nowIso(),
  })
}

export const getLatestBodyWeight = async (): Promise<number | null> => {
  const db = getDb()
  const rows = await db
    .select()
    .from(bodyWeightLogs)
    .orderBy(desc(bodyWeightLogs.date), desc(bodyWeightLogs.createdAt))
    .limit(1)
  return rows[0]?.weightKg ?? null
}

export interface BodyWeightChartPoint {
  date: string
  weightKg: number
  label: string
  sessionId: number | null
}

export const getBodyWeightHistory = async (): Promise<BodyWeightChartPoint[]> => {
  const db = getDb()
  const rows = await db.select().from(bodyWeightLogs).orderBy(asc(bodyWeightLogs.date))

  return rows.map((r) => ({
    date: r.date,
    weightKg: r.weightKg,
    sessionId: r.sessionId,
    label: new Date(`${r.date}T12:00:00`).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
    }),
  }))
}

export const getBodyWeightEntries = async (limit = 30) => {
  const db = getDb()
  return db
    .select()
    .from(bodyWeightLogs)
    .orderBy(desc(bodyWeightLogs.date), desc(bodyWeightLogs.createdAt))
    .limit(limit)
}

export const getTodayMorningWeight = async (): Promise<number | null> => {
  const today = formatDateLocal(new Date())
  const db = getDb()
  const rows = await db
    .select()
    .from(bodyWeightLogs)
    .where(eq(bodyWeightLogs.date, today))
    .orderBy(desc(bodyWeightLogs.createdAt))
    .limit(1)
  return rows[0]?.weightKg ?? null
}
