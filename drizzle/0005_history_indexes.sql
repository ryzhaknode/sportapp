CREATE INDEX IF NOT EXISTS `workout_sessions_template_status_finished_idx` ON `workout_sessions` (`workout_template_id`,`status`,`finished_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exercise_logs_session_id_idx` ON `exercise_logs` (`session_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exercise_logs_exercise_slot_id_idx` ON `exercise_logs` (`exercise_slot_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `set_logs_exercise_log_id_set_index_idx` ON `set_logs` (`exercise_log_id`,`set_index`);
