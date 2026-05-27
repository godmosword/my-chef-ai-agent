-- 0014: pantry vision sessions + daily vision quota (PT-2)
BEGIN;

CREATE TABLE IF NOT EXISTS pantry_vision_sessions (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL DEFAULT 'default',
  user_id       TEXT NOT NULL,
  session_type  TEXT NOT NULL,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pantry_vision_sessions_tenant_user
  ON pantry_vision_sessions (tenant_id, user_id);

ALTER TABLE usage_daily
  ADD COLUMN IF NOT EXISTS pantry_vision_count INTEGER NOT NULL DEFAULT 0;

COMMIT;
