CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`current_variant` text DEFAULT 'standard' NOT NULL,
	`baseline_max` integer DEFAULT 20 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`variant` text NOT NULL,
	`sets` text NOT NULL,
	`total_reps` integer NOT NULL,
	`notes` text,
	`completed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `max_tests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant` text NOT NULL,
	`max_reps` integer NOT NULL,
	`tested_at` text NOT NULL,
	`notes` text
);
