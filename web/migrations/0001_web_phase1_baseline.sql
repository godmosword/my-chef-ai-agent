-- Migration 0001: Web Phase 1 baseline (memory, favorites, quota, cuisine)
-- Required before 0003_recipe_library.sql (which ALTERs usage_daily).
BEGIN;

CREATE TABLE IF NOT EXISTS user_memory (
  tenant_id   TEXT NOT NULL DEFAULT 'default',
  user_id     TEXT NOT NULL,
  history     JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  tenant_id    TEXT NOT NULL DEFAULT 'default',
  user_id      TEXT NOT NULL,
  preferences  JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS favorite_recipes (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    TEXT NOT NULL DEFAULT 'default',
  user_id      TEXT NOT NULL,
  recipe_name  TEXT NOT NULL,
  recipe_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_favorite_recipes_user
  ON favorite_recipes (tenant_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_cuisine_context (
  tenant_id            TEXT NOT NULL DEFAULT 'default',
  user_id              TEXT NOT NULL,
  active_cuisine       TEXT,
  context_updated_at   TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS usage_daily (
  tenant_id       TEXT NOT NULL DEFAULT 'default',
  user_id         TEXT NOT NULL,
  usage_date      DATE NOT NULL,
  requests_count  INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   TEXT NOT NULL DEFAULT 'default',
  user_id     TEXT NOT NULL,
  units       INTEGER NOT NULL DEFAULT 1,
  event_type  TEXT NOT NULL,
  detail      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_user_created
  ON usage_ledger (tenant_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  tenant_id  TEXT NOT NULL DEFAULT 'default',
  user_id    TEXT NOT NULL,
  plan_key   TEXT NOT NULL DEFAULT 'free',
  status     TEXT NOT NULL DEFAULT 'inactive',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

COMMIT;
