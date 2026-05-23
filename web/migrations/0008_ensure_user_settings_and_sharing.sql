-- Migration 0008: Ensure user_settings + sharing tables (idempotent).
-- Fixes "relation user_settings does not exist" when 0005/0006 were skipped.
BEGIN;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id            TEXT PRIMARY KEY,
  tenant_id          TEXT NOT NULL DEFAULT 'default',
  theme              TEXT NOT NULL DEFAULT 'system'
    CHECK (theme IN ('system', 'light', 'dark')),
  font_scale         SMALLINT NOT NULL DEFAULT 100
    CHECK (font_scale BETWEEN 80 AND 150),
  locale             TEXT NOT NULL DEFAULT 'zh-Hant-TW',
  voice_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  analytics_opt      BOOLEAN NOT NULL DEFAULT TRUE,
  hero_auto_generate BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS hero_auto_generate BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS shared_recipe_likes (
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  visitor_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_likes_recipe ON shared_recipe_likes (recipe_id);

CREATE TABLE IF NOT EXISTS shared_recipe_views (
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  visitor_id  TEXT NOT NULL,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_views_recipe ON shared_recipe_views (recipe_id);

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS share_token TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_version_id UUID,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_share_token
  ON recipes (share_token)
  WHERE share_token IS NOT NULL;

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

COMMIT;
