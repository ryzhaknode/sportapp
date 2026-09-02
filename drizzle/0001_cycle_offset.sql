ALTER TABLE `settings` ADD COLUMN `cycle_offset` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `skipped_days` (
	`date` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
