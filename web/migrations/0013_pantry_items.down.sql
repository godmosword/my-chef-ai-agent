BEGIN;

DROP INDEX IF EXISTS idx_pantry_items_tenant_user_expires_deleted;
DROP INDEX IF EXISTS idx_pantry_items_tenant_user_key_deleted;
DROP INDEX IF EXISTS idx_pantry_items_tenant_user_deleted;
DROP TABLE IF EXISTS pantry_items;

COMMIT;
