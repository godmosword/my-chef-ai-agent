-- 0013: pantry_items inventory (PT-1)
-- Idempotent; safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS pantry_items (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL DEFAULT 'default',
  user_id         TEXT NOT NULL,
  item_key        TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  category        TEXT,
  quantity        NUMERIC(10, 2),
  unit            TEXT,
  quantity_text   TEXT,
  location        TEXT NOT NULL DEFAULT 'fridge_main',
  expires_at      DATE,
  purchased_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  source          TEXT NOT NULL DEFAULT 'manual',
  confidence      REAL NOT NULL DEFAULT 1.0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pantry_items_tenant_user_deleted
  ON pantry_items (tenant_id, user_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_pantry_items_tenant_user_key_deleted
  ON pantry_items (tenant_id, user_id, item_key, deleted_at);

CREATE INDEX IF NOT EXISTS idx_pantry_items_tenant_user_expires_deleted
  ON pantry_items (tenant_id, user_id, expires_at, deleted_at);

COMMIT;
