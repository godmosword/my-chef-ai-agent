BEGIN;

ALTER TABLE user_settings DROP COLUMN IF EXISTS hero_auto_generate;

ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_hero_status_check;
ALTER TABLE recipes DROP COLUMN IF EXISTS hero_updated_at;
ALTER TABLE recipes DROP COLUMN IF EXISTS hero_error;
ALTER TABLE recipes DROP COLUMN IF EXISTS hero_status;

COMMIT;
