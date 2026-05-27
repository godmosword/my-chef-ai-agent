-- 0017: MP-2 async generation progress + monthly quota

BEGIN;

ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS generation_progress JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN meal_plans.generation_progress IS
  'Async UI progress: {phase, iteration, message, errors?}';

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS meal_plan_generations_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_plan_generations_reset_at DATE;

COMMIT;
