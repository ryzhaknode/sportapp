ALTER TABLE `exercise_slots` ADD `rotation_phase` integer;--> statement-breakpoint
-- Rotating slots take turns by calendar week instead of by their own history.
-- Week phases complement each other across A/B/C: in C the primary runs in
-- phase 1, so e.g. weighted pull-ups in A go with the lat pulldown in C and
-- the barbell curl in A with the cable curl in C (see src/lib/program/seed.ts).
-- A fresh database gets the phases from the seed.
WITH `primaries`(`name`) AS (VALUES
  ('Підтягування з вагою'),
  ('Біцепс зі штангою'),
  ('Жим гантелей на похилій лаві 30–45°'),
  ('Тяга горизонтального блоку сидячи'),
  ('Жим стоячи')
)
UPDATE `exercise_slots` SET `rotation_phase` = (
  SELECT CASE
    WHEN (t.`code` = 'C') = (e.`name` IN (SELECT `name` FROM `primaries`)) THEN 1
    ELSE 0
  END
  FROM `workout_templates` t, `exercises` e
  WHERE t.`id` = `exercise_slots`.`workout_template_id` AND e.`id` = `exercise_slots`.`exercise_id`
)
WHERE `rotation_group` IS NOT NULL;
