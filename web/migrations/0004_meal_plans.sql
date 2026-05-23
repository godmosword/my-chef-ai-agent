-- Migration 0004: Weekly meal plans
BEGIN;

CREATE TABLE IF NOT EXISTS meal_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  tenant_id         TEXT NOT NULL DEFAULT 'default',
  plan_date         DATE NOT NULL,
  slot              TEXT NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'dinner')),
  recipe_id         UUID REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_version_id UUID REFERENCES recipe_versions(id) ON DELETE SET NULL,
  servings          INTEGER NOT NULL DEFAULT 2 CHECK (servings BETWEEN 1 AND 20),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, plan_date, slot)
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_week
  ON meal_plans (user_id, tenant_id, plan_date);

CREATE OR REPLACE FUNCTION touch_meal_plans_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meal_plans_touch_updated_at ON meal_plans;
CREATE TRIGGER meal_plans_touch_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION touch_meal_plans_updated_at();

COMMIT;
