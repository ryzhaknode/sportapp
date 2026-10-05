import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  programStartDate: text('program_start_date').notNull(),
  programId: integer('program_id'),
  tournamentWeekEnabled: integer('tournament_week_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  matchDate: text('match_date'),
  timerSoundEnabled: integer('timer_sound_enabled', { mode: 'boolean' }).notNull().default(true),
  timerVibrationEnabled: integer('timer_vibration_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
})

export const programs = sqliteTable('programs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  cycleLengthWeeks: integer('cycle_length_weeks').notNull().default(13),
})

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  muscleGroup: text('muscle_group').notNull(),
  weightType: text('weight_type', {
    enum: ['barbell', 'dumbbell_per_hand', 'bodyweight_plus', 'cable'],
  }).notNull(),
})

export const workoutTemplates = sqliteTable('workout_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  programId: integer('program_id').notNull(),
  code: text('code', { enum: ['A', 'B', 'C'] }).notNull(),
  sortOrder: integer('sort_order').notNull(),
})

export const exerciseSlots = sqliteTable('exercise_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workoutTemplateId: integer('workout_template_id').notNull(),
  exerciseId: integer('exercise_id').notNull(),
  sortOrder: integer('sort_order').notNull(),
  sets: integer('sets').notNull(),
  repMin: integer('rep_min').notNull(),
  repMax: integer('rep_max').notNull(),
  rirMin: integer('rir_min').notNull(),
  rirMax: integer('rir_max').notNull(),
  restSec: integer('rest_sec').notNull(),
  startWeight: real('start_weight'),
  increment: real('increment').notNull(),
  extraSetInPhase: integer('extra_set_in_phase', { mode: 'boolean' }).notNull().default(false),
  twelveWeekTargetMin: real('twelve_week_target_min'),
  twelveWeekTargetMax: real('twelve_week_target_max'),
  targetReps: integer('target_reps').default(6),
})

export const workoutSessions = sqliteTable('workout_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workoutTemplateId: integer('workout_template_id').notNull(),
  date: text('date').notNull(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  weekNumber: integer('week_number').notNull(),
  mode: text('mode', { enum: ['normal', 'deload', 'tournament', 'test'] }).notNull(),
  status: text('status', { enum: ['in_progress', 'completed', 'abandoned'] }).notNull(),
  note: text('note'),
})

export const exerciseLogs = sqliteTable('exercise_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull(),
  exerciseSlotId: integer('exercise_slot_id').notNull(),
  sortOrder: integer('sort_order').notNull(),
  status: text('status', { enum: ['pending', 'done', 'partial', 'skipped'] }).notNull(),
  skipReason: text('skip_reason'),
  suggestedWeight: real('suggested_weight'),
  suggestedStatus: text('suggested_status'),
})

export const setLogs = sqliteTable('set_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exerciseLogId: integer('exercise_log_id').notNull(),
  setIndex: integer('set_index').notNull(),
  weight: real('weight'),
  reps: integer('reps'),
  rir: integer('rir'),
  status: text('status', { enum: ['pending', 'done', 'skipped'] }).notNull(),
  isExtra: integer('is_extra', { mode: 'boolean' }).notNull().default(false),
  skipReason: text('skip_reason'),
  completedAt: text('completed_at'),
})

export const progressionState = sqliteTable('progression_state', {
  exerciseSlotId: integer('exercise_slot_id').primaryKey(),
  currentWeight: real('current_weight'),
  stallCount: integer('stall_count').notNull().default(0),
  lastStatus: text('last_status'),
  bwProgressionMode: text('bw_progression_mode'),
  updatedAt: text('updated_at').notNull(),
})

export const restTimers = sqliteTable('rest_timers', {
  sessionId: integer('session_id').primaryKey(),
  endsAt: text('ends_at').notNull(),
  label: text('label'),
})

export const syncReceipts = sqliteTable('sync_receipts', {
  localId: text('local_id').primaryKey(),
  serverSessionId: integer('server_session_id').notNull(),
  syncedAt: text('synced_at').notNull(),
})

export const bodyWeightLogs = sqliteTable('body_weight_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  weightKg: real('weight_kg').notNull(),
  sessionId: integer('session_id').unique(),
  note: text('note'),
  createdAt: text('created_at').notNull(),
})

export type Settings = typeof settings.$inferSelect
export type Program = typeof programs.$inferSelect
export type Exercise = typeof exercises.$inferSelect
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect
export type ExerciseSlot = typeof exerciseSlots.$inferSelect
export type WorkoutSession = typeof workoutSessions.$inferSelect
export type ExerciseLog = typeof exerciseLogs.$inferSelect
export type SetLog = typeof setLogs.$inferSelect
export type ProgressionState = typeof progressionState.$inferSelect
export type RestTimer = typeof restTimers.$inferSelect
export type BodyWeightLog = typeof bodyWeightLogs.$inferSelect

export type WorkoutTemplateCode = 'A' | 'B' | 'C'
export type SessionMode = 'normal' | 'deload' | 'tournament' | 'test'
export type SkipReason =
  | 'equipment_busy'
  | 'pain'
  | 'no_time'
  | 'other'

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  equipment_busy: 'Зайнятий тренажер',
  pain: 'Біль або дискомфорт',
  no_time: 'Немає часу',
  other: 'Інше',
}
