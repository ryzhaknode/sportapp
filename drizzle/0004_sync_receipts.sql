CREATE TABLE `sync_receipts` (
	`local_id` text PRIMARY KEY NOT NULL,
	`server_session_id` integer NOT NULL,
	`synced_at` text NOT NULL
);
