BEGIN;
DROP TRIGGER IF EXISTS meal_plans_touch_updated_at ON meal_plans;
DROP FUNCTION IF EXISTS touch_meal_plans_updated_at();
DROP TABLE IF EXISTS meal_plans;
COMMIT;
