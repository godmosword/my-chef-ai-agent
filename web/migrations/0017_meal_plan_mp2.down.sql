BEGIN;

ALTER TABLE notification_preferences
  DROP COLUMN IF EXISTS meal_plan_generations_reset_at,
  DROP COLUMN IF EXISTS meal_plan_generations_this_month;

ALTER TABLE meal_plans
  DROP COLUMN IF EXISTS generation_progress;

COMMIT;
