-- 0016: MP-1 weekly meal planning (sessions + slots + pantry snapshot)
-- Renames legacy calendar table meal_plans → meal_calendar_entries when present.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meal_plans'
      AND column_name = 'plan_date'
  ) THEN
    ALTER TABLE meal_plans RENAME TO meal_calendar_entries;
    ALTER INDEX IF EXISTS meal_plans_user_date_slot_unq
      RENAME TO meal_calendar_entries_user_date_slot_unq;
    ALTER INDEX IF EXISTS idx_meal_plans_user_week
      RENAME TO idx_meal_calendar_entries_user_week;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS meal_plans (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  meal_pattern JSONB NOT NULL DEFAULT '{"breakfast":false,"lunch":true,"dinner":true}',
  constraints JSONB NOT NULL DEFAULT '{}',
  target_household_member_ids JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  name TEXT,
  total_estimated_cost NUMERIC(10, 2),
  pantry_reuse_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_v2_user_status_start
  ON meal_plans (tenant_id, user_id, status, start_date);

CREATE INDEX IF NOT EXISTS idx_meal_plans_v2_user_dates
  ON meal_plans (tenant_id, user_id, start_date, end_date);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_meal_plan_per_user
  ON meal_plans (tenant_id, user_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS meal_slots (
  id BIGSERIAL PRIMARY KEY,
  meal_plan_id BIGINT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  slot_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  slot_index INTEGER NOT NULL DEFAULT 0,
  dish_title TEXT NOT NULL,
  cuisine TEXT,
  estimated_time_min INTEGER,
  effort_level TEXT,
  key_ingredients JSONB NOT NULL DEFAULT '[]',
  estimated_cost NUMERIC(10, 2),
  tags JSONB NOT NULL DEFAULT '[]',
  rationale TEXT,
  full_recipe_json JSONB,
  full_recipe_generated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned',
  cooked_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_slots_plan_date_type
  ON meal_slots (meal_plan_id, slot_date, meal_type, slot_index);

CREATE INDEX IF NOT EXISTS idx_meal_slots_user_date
  ON meal_slots (tenant_id, user_id, slot_date);

CREATE INDEX IF NOT EXISTS idx_meal_slots_user_status
  ON meal_slots (tenant_id, user_id, status);

CREATE TABLE IF NOT EXISTS meal_plan_pantry_snapshot (
  meal_plan_id BIGINT PRIMARY KEY REFERENCES meal_plans(id) ON DELETE CASCADE,
  pantry_items JSONB NOT NULL DEFAULT '[]',
  expiring_items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
