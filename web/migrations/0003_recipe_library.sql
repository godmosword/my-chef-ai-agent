-- Migration 0003: Recipe Library (forward-only, idempotent where possible)
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  tenant_id       TEXT NOT NULL DEFAULT 'default',
  title           TEXT NOT NULL,
  cuisine         TEXT,
  summary         TEXT,
  hero_url        TEXT,
  poster_url      TEXT,
  latest_version_id UUID,
  rating          SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  cook_count      INTEGER NOT NULL DEFAULT 0,
  last_cooked_at  TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  search_vector   TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(cuisine, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'C')
  ) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_updated
  ON recipes (user_id, tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recipes_user_cuisine
  ON recipes (user_id, tenant_id, cuisine)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recipes_search_vector
  ON recipes USING GIN (search_vector);

CREATE TABLE IF NOT EXISTS recipe_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version_no      INTEGER NOT NULL,
  ingredients     JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps           JSONB NOT NULL DEFAULT '[]'::jsonb,
  shopping_list   JSONB NOT NULL DEFAULT '[]'::jsonb,
  kitchen_talk    TEXT,
  cost_estimate   JSONB,
  source_prompt   TEXT NOT NULL,
  diff_from_prompt TEXT,
  model_used      TEXT,
  deep_research   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_recipe_versions_recipe_version
  ON recipe_versions (recipe_id, version_no DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipes_latest_version_fk'
  ) THEN
    ALTER TABLE recipes
      ADD CONSTRAINT recipes_latest_version_fk
      FOREIGN KEY (latest_version_id) REFERENCES recipe_versions(id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag          TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'ai', 'cuisine')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag ON recipe_tags (tag);

CREATE TABLE IF NOT EXISTS favorites_v2 (
  user_id      TEXT NOT NULL,
  tenant_id    TEXT NOT NULL DEFAULT 'default',
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_v2_user
  ON favorites_v2 (user_id, tenant_id, created_at DESC);

ALTER TABLE usage_daily
  ADD COLUMN IF NOT EXISTS text_requests_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE usage_daily
  ADD COLUMN IF NOT EXISTS image_requests_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_daily' AND column_name = 'requests_count'
  ) THEN
    UPDATE usage_daily
    SET text_requests_count = GREATEST(text_requests_count, requests_count)
    WHERE requests_count > 0 AND text_requests_count < requests_count;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION touch_recipes_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipes_touch_updated_at ON recipes;
CREATE TRIGGER recipes_touch_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION touch_recipes_updated_at();

COMMIT;
