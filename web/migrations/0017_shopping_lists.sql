-- MP-3: Shopping lists derived from meal plans (merge + pantry subtract + aisle sections)

CREATE TABLE IF NOT EXISTS shopping_lists (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  meal_plan_id BIGINT REFERENCES meal_plans(id) ON DELETE CASCADE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  estimated_total_cost NUMERIC(10, 2),
  actual_total_cost NUMERIC(10, 2),
  share_token TEXT,
  share_token_expires_at TIMESTAMPTZ,
  regenerated_count INTEGER NOT NULL DEFAULT 0,
  last_regenerated_at TIMESTAMPTZ,
  pantry_snapshot_at_generation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT shopping_lists_status_check CHECK (
    status IN ('draft', 'active', 'completed', 'abandoned')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_list_per_plan
  ON shopping_lists (meal_plan_id)
  WHERE status = 'active' AND meal_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_lists_tenant_user_status
  ON shopping_lists (tenant_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan
  ON shopping_lists (meal_plan_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shopping_lists_share_token
  ON shopping_lists (share_token)
  WHERE share_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id BIGSERIAL PRIMARY KEY,
  shopping_list_id BIGINT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT,
  section TEXT NOT NULL,
  quantity NUMERIC(10, 2),
  unit TEXT,
  quantity_display TEXT NOT NULL,
  estimated_unit_price NUMERIC(10, 2),
  estimated_total_price NUMERIC(10, 2),
  source TEXT NOT NULL DEFAULT 'auto_from_plan',
  source_slot_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  from_pantry_partial BOOLEAN NOT NULL DEFAULT FALSE,
  pantry_coverage_note TEXT,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_at TIMESTAMPTZ,
  checked_by TEXT,
  is_removed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shopping_list_items_source_check CHECK (
    source IN ('auto_from_plan', 'manual_added', 'pantry_restock')
  )
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_section_order
  ON shopping_list_items (shopping_list_id, section, display_order);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_progress
  ON shopping_list_items (tenant_id, user_id, shopping_list_id, is_checked);
