import fs from 'fs'
import path from 'path'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from '@/lib/db/schema'

const resolveFileDatabaseUrl = (url: string): string => {
  if (!url.startsWith('file:')) return url
  const filePath = url.replace(/^file:/, '')
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(
        /* turbopackIgnore: true */ process.cwd(),
        'data',
        path.basename(filePath),
      )
  const dir = path.dirname(resolved)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return `file:${resolved}`
}

const createLibsqlClient = (): Client => {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  if (tursoUrl) {
    return createClient({
      url: tursoUrl,
      authToken: tursoToken,
    })
  }

  const fileUrl = resolveFileDatabaseUrl(
    process.env.DATABASE_URL ?? 'file:./data/workouts.db',
  )
  return createClient({ url: fileUrl })
}

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null
let migration: Promise<void> | null = null

// Memoised so concurrent callers (getDb's background run + ensureDbMigrated)
// share one migration instead of racing on a fresh database.
const runMigrationsIfNeeded = (db: ReturnType<typeof drizzle<typeof schema>>): Promise<void> => {
  migration ??= (async () => {
    if (process.env.SKIP_DB_MIGRATE === '1') return
    const migrationsFolder = path.join(process.cwd(), 'drizzle')
    if (!fs.existsSync(migrationsFolder)) return
    await migrate(db, { migrationsFolder })
  })()
  return migration
}

/** `DB_LOG=1` друкує кожен SQL-запит — щоб рахувати запити на сторінку. */
const queryLogger =
  process.env.DB_LOG === '1'
    ? { logQuery: (query: string) => console.debug(`[db] ${query}`) }
    : undefined

export const getDb = () => {
  if (dbInstance) return dbInstance

  const client = createLibsqlClient()
  dbInstance = drizzle(client, { schema, logger: queryLogger })

  if (!process.env.VERCEL) {
    void runMigrationsIfNeeded(dbInstance)
  }

  return dbInstance
}

/** На Vercel міграції запускай у build (`npm run build:vercel`). Для скриптів — await перед роботою. */
export const ensureDbMigrated = async (): Promise<void> => {
  const db = getDb()
  await runMigrationsIfNeeded(db)
}

export const isTurso = (): boolean => Boolean(process.env.TURSO_DATABASE_URL)
