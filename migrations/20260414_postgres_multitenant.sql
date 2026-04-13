-- Postgres-only multi-tenant schema (Supabase-free)

-- Compatibility upgrades for legacy single-tenant tables
ALTER TABLE IF EXISTS user_memory ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE IF EXISTS favorite_recipes ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE IF EXISTS user_cuisine_context ADD COLUMN IF NOT EXISTS tenant_id text;

DO $$
BEGIN
  IF to_regclass('public.user_memory') IS NOT NULL THEN
    UPDATE user_memory SET tenant_id = 'default' WHERE tenant_id IS NULL;
    ALTER TABLE user_memory ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE user_memory ALTER COLUMN tenant_id SET DEFAULT 'default';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_preferences') IS NOT NULL THEN
    UPDATE user_preferences SET tenant_id = 'default' WHERE tenant_id IS NULL;
    ALTER TABLE user_preferences ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE user_preferences ALTER COLUMN tenant_id SET DEFAULT 'default';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.favorite_recipes') IS NOT NULL THEN
    UPDATE favorite_recipes SET tenant_id = 'default' WHERE tenant_id IS NULL;
    ALTER TABLE favorite_recipes ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE favorite_recipes ALTER COLUMN tenant_id SET DEFAULT 'default';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_cuisine_context') IS NOT NULL THEN
    UPDATE user_cuisine_context SET tenant_id = 'default' WHERE tenant_id IS NULL;
    ALTER TABLE user_cuisine_context ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE user_cuisine_context ALTER COLUMN tenant_id SET DEFAULT 'default';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'user_memory' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE user_memory DROP CONSTRAINT user_memory_pkey;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'user_preferences' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_pkey;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'user_cuisine_context' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE user_cuisine_context DROP CONSTRAINT user_cuisine_context_pkey;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS user_memory (
  tenant_id text NOT NULL DEFAULT 'default',
  user_id text NOT NULL,
  history jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  tenant_id text NOT NULL DEFAULT 'default',
  user_id text NOT NULL,
  preferences text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS favorite_recipes (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'default',
  user_id text NOT NULL,
  recipe_name text NOT NULL,
  recipe_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_cuisine_context (
  tenant_id text NOT NULL DEFAULT 'default',
  user_id text NOT NULL,
  active_cuisine text NOT NULL,
  context_updated_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'user_memory'
      AND constraint_name = 'user_memory_pkey'
  ) THEN
    ALTER TABLE user_memory ADD CONSTRAINT user_memory_pkey PRIMARY KEY (tenant_id, user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'user_preferences'
      AND constraint_name = 'user_preferences_pkey'
  ) THEN
    ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (tenant_id, user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'user_cuisine_context'
      AND constraint_name = 'user_cuisine_context_pkey'
  ) THEN
    ALTER TABLE user_cuisine_context ADD CONSTRAINT user_cuisine_context_pkey PRIMARY KEY (tenant_id, user_id);
  END IF;
END $$;

-- Billing and usage
CREATE TABLE IF NOT EXISTS usage_daily (
  tenant_id text NOT NULL DEFAULT 'default',
  user_id text NOT NULL,
  usage_date date NOT NULL,
  requests_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  tenant_id text NOT NULL DEFAULT 'default',
  user_id text NOT NULL,
  plan_key text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'default',
  user_id text NOT NULL,
  units integer NOT NULL,
  event_type text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_favorite_recipes_tenant_user_created_at
  ON favorite_recipes (tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_tenant_user_created_at
  ON usage_ledger (tenant_id, user_id, created_at DESC);

-- Atomic usage increment helper
CREATE OR REPLACE FUNCTION increment_usage_daily(
  p_tenant_id text,
  p_user_id text,
  p_usage_date date,
  p_units integer
)
RETURNS TABLE (requests_count integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO usage_daily (tenant_id, user_id, usage_date, requests_count, updated_at)
  VALUES (p_tenant_id, p_user_id, p_usage_date, p_units, now())
  ON CONFLICT (tenant_id, user_id, usage_date)
  DO UPDATE SET
    requests_count = usage_daily.requests_count + EXCLUDED.requests_count,
    updated_at = now()
  RETURNING usage_daily.requests_count INTO v_count;

  RETURN QUERY SELECT v_count;
END;
$$;
