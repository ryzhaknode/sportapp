ALTER TABLE `exercise_slots` ADD `rotation_group` text;--> statement-breakpoint
ALTER TABLE `exercise_slots` ADD `rotation_phase` integer;--> statement-breakpoint
ALTER TABLE `exercise_slots` ADD `archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
-- Data changes below touch an already seeded program only; a fresh database
-- gets the same program from the seed (src/lib/program/seed.ts).
WITH `new_exercises`(`name`, `muscle_group`, `weight_type`) AS (VALUES
  ('Жим ногами', 'legs', 'machine'),
  ('Жим у тренажері на груди', 'chest', 'machine'),
  ('Жим на плечі в тренажері', 'shoulders', 'machine'),
  ('Тяга верхнього блоку', 'back', 'cable'),
  ('Згинання рук у нижньому блоці', 'biceps', 'cable')
)
INSERT INTO `exercises` (`name`, `muscle_group`, `weight_type`)
SELECT n.`name`, n.`muscle_group`, n.`weight_type` FROM `new_exercises` n
WHERE EXISTS (SELECT 1 FROM `programs`)
  AND NOT EXISTS (SELECT 1 FROM `exercises` e WHERE e.`name` = n.`name`);--> statement-breakpoint
-- Leg press replaces the Romanian deadlift. The RDL slot is archived, not
-- deleted, so its past logs keep their exercise and history.
INSERT INTO `exercise_slots` (
  `workout_template_id`, `exercise_id`, `sort_order`, `sets`, `rep_min`, `rep_max`,
  `rir_min`, `rir_max`, `rest_sec`, `start_weight`, `increment`, `extra_set_in_phase`, `target_reps`
)
SELECT s.`workout_template_id`, (SELECT max(`id`) FROM `exercises` WHERE `name` = 'Жим ногами'),
  s.`sort_order`, 3, 8, 12, 2, 3, 150, NULL, 5, false, 6
FROM `exercise_slots` s
WHERE s.`archived` = false
  AND s.`exercise_id` IN (SELECT `id` FROM `exercises` WHERE `name` = 'Румунська тяга');--> statement-breakpoint
UPDATE `exercise_slots` SET `archived` = true
WHERE `exercise_id` IN (SELECT `id` FROM `exercises` WHERE `name` = 'Румунська тяга');--> statement-breakpoint
-- Week phases complement each other across A/B/C: in C the primary runs in
-- phase 1, so e.g. weighted pull-ups in A go with the lat pulldown in C and
-- the barbell curl in A with the cable curl in C (see src/lib/program/seed.ts).
WITH `pairs`(`primary_name`, `rotation_group`) AS (VALUES
  ('Підтягування з вагою', 'vertical_pull'),
  ('Біцепс зі штангою', 'curl'),
  ('Жим гантелей на похилій лаві 30–45°', 'chest_press'),
  ('Тяга горизонтального блоку сидячи', 'row'),
  ('Жим стоячи', 'shoulder_press')
)
UPDATE `exercise_slots` SET
  `rotation_group` = (
    SELECT p.`rotation_group` FROM `pairs` p JOIN `exercises` e ON e.`name` = p.`primary_name`
    WHERE e.`id` = `exercise_slots`.`exercise_id`
  ),
  `rotation_phase` = (
    SELECT CASE t.`code` WHEN 'C' THEN 1 ELSE 0 END FROM `workout_templates` t
    WHERE t.`id` = `exercise_slots`.`workout_template_id`
  )
WHERE `archived` = false
  AND `exercise_id` IN (SELECT e.`id` FROM `exercises` e JOIN `pairs` p ON p.`primary_name` = e.`name`);--> statement-breakpoint
-- Each paired slot gets its alternative with the same sets/reps/RIR/rest and
-- its own progression (no start weight, no 12-week target).
WITH `pairs`(`primary_name`, `alt_name`, `increment`) AS (VALUES
  ('Підтягування з вагою', 'Тяга верхнього блоку', 1),
  ('Біцепс зі штангою', 'Згинання рук у нижньому блоці', 1),
  ('Жим гантелей на похилій лаві 30–45°', 'Жим у тренажері на груди', 2.5),
  ('Тяга горизонтального блоку сидячи', 'Тяга верхнього блоку', 1),
  ('Жим стоячи', 'Жим на плечі в тренажері', 2.5)
)
INSERT INTO `exercise_slots` (
  `workout_template_id`, `exercise_id`, `sort_order`, `sets`, `rep_min`, `rep_max`,
  `rir_min`, `rir_max`, `rest_sec`, `start_weight`, `increment`, `extra_set_in_phase`,
  `target_reps`, `rotation_group`, `rotation_phase`
)
SELECT s.`workout_template_id`, (SELECT max(a.`id`) FROM `exercises` a WHERE a.`name` = p.`alt_name`),
  s.`sort_order`, s.`sets`, s.`rep_min`, s.`rep_max`, s.`rir_min`, s.`rir_max`, s.`rest_sec`,
  NULL, p.`increment`, s.`extra_set_in_phase`, s.`target_reps`, s.`rotation_group`,
  1 - s.`rotation_phase`
FROM `exercise_slots` s
JOIN `exercises` e ON e.`id` = s.`exercise_id`
JOIN `pairs` p ON p.`primary_name` = e.`name`
WHERE s.`archived` = false;
