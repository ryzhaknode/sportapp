import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  startDate: text('start_date').notNull(),
  currentVariant: text('current_variant').notNull().default('standard'),
  baselineMax: integer('baseline_max').notNull().default(20),
  cycleOffset: integer('cycle_offset').notNull().default(0),
})

export const skippedDays = sqliteTable('skipped_days', {
  date: text('date').primaryKey(),
  createdAt: text('created_at').notNull(),
})

export const workoutSessions = sqliteTable('workout_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  type: text('type', { enum: ['A', 'B', 'C'] }).notNull(),
  variant: text('variant').notNull(),
  sets: text('sets').notNull(),
  totalReps: integer('total_reps').notNull(),
  notes: text('notes'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
})

export const maxTests = sqliteTable('max_tests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  variant: text('variant').notNull(),
  maxReps: integer('max_reps').notNull(),
  testedAt: text('tested_at').notNull(),
  notes: text('notes'),
})

export type Settings = typeof settings.$inferSelect
export type WorkoutSession = typeof workoutSessions.$inferSelect
export type MaxTest = typeof maxTests.$inferSelect

export interface WorkoutSet {
  reps: number
}
