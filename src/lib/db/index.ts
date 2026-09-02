import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '@/lib/db/schema'

const getDbPath = (): string => {
  const url = process.env.DATABASE_URL ?? 'file:./data/workouts.db'
  const filePath = url.replace(/^file:/, '')
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), 'data', path.basename(filePath))
  const dir = path.dirname(resolved)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return resolved
}

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export const getDb = () => {
  if (dbInstance) return dbInstance

  const sqlite = new Database(getDbPath())
  sqlite.pragma('journal_mode = WAL')
  dbInstance = drizzle(sqlite, { schema })

  const migrationsFolder = path.join(process.cwd(), 'drizzle')
  if (fs.existsSync(migrationsFolder)) {
    migrate(dbInstance, { migrationsFolder })
  }

  return dbInstance
}
