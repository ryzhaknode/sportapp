import { defineConfig } from 'drizzle-kit'

const tursoUrl = process.env.TURSO_DATABASE_URL
const fileUrl = process.env.DATABASE_URL ?? 'file:./data/workouts.db'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: tursoUrl ?? fileUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
