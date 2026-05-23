BEGIN;

DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS shared_recipe_views;
DROP TABLE IF EXISTS shared_recipe_likes;

DROP INDEX IF EXISTS idx_recipes_share_token;

ALTER TABLE recipes
  DROP COLUMN IF EXISTS like_count,
  DROP COLUMN IF EXISTS view_count,
  DROP COLUMN IF EXISTS published_version_id,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS share_token;

COMMIT;
