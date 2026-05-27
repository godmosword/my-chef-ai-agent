BEGIN;
ALTER TABLE usage_daily DROP COLUMN IF EXISTS pantry_vision_count;
DROP INDEX IF EXISTS idx_pantry_vision_sessions_tenant_user;
DROP TABLE IF EXISTS pantry_vision_sessions;
COMMIT;
