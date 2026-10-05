DROP TABLE IF EXISTS `rest_timers`;
--> statement-breakpoint
DROP TABLE IF EXISTS `set_logs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `exercise_logs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `progression_state`;
--> statement-breakpoint
DROP TABLE IF EXISTS `workout_sessions`;
--> statement-breakpoint
DROP TABLE IF EXISTS `exercise_slots`;
--> statement-breakpoint
DROP TABLE IF EXISTS `workout_templates`;
--> statement-breakpoint
DROP TABLE IF EXISTS `exercises`;
--> statement-breakpoint
DROP TABLE IF EXISTS `programs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `max_tests`;
--> statement-breakpoint
DROP TABLE IF EXISTS `skipped_days`;
--> statement-breakpoint
DROP TABLE IF EXISTS `settings`;
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`program_start_date` text NOT NULL,
	`program_id` integer,
	`tournament_week_enabled` integer DEFAULT false NOT NULL,
	`match_date` text,
	`timer_sound_enabled` integer DEFAULT true NOT NULL,
	`timer_vibration_enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cycle_length_weeks` integer DEFAULT 13 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`muscle_group` text NOT NULL,
	`weight_type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workout_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` integer NOT NULL,
	`code` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercise_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_template_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`sets` integer NOT NULL,
	`rep_min` integer NOT NULL,
	`rep_max` integer NOT NULL,
	`rir_min` integer NOT NULL,
	`rir_max` integer NOT NULL,
	`rest_sec` integer NOT NULL,
	`start_weight` real,
	`increment` real NOT NULL,
	`extra_set_in_phase` integer DEFAULT false NOT NULL,
	`twelve_week_target_min` real,
	`twelve_week_target_max` real,
	`target_reps` integer DEFAULT 6
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_template_id` integer NOT NULL,
	`date` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`week_number` integer NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `exercise_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`exercise_slot_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`status` text NOT NULL,
	`skip_reason` text,
	`suggested_weight` real,
	`suggested_status` text
);
--> statement-breakpoint
CREATE TABLE `set_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_log_id` integer NOT NULL,
	`set_index` integer NOT NULL,
	`weight` real,
	`reps` integer,
	`rir` integer,
	`status` text NOT NULL,
	`is_extra` integer DEFAULT false NOT NULL,
	`skip_reason` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `progression_state` (
	`exercise_slot_id` integer PRIMARY KEY NOT NULL,
	`current_weight` real,
	`stall_count` integer DEFAULT 0 NOT NULL,
	`last_status` text,
	`bw_progression_mode` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rest_timers` (
	`session_id` integer PRIMARY KEY NOT NULL,
	`ends_at` text NOT NULL,
	`label` text
);
