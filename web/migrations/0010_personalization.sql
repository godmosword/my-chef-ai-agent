-- 0010_personalization: user taste profile + household members (PM-1)
-- Idempotent; safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS user_taste_profile (
  tenant_id                 TEXT NOT NULL DEFAULT 'default',
  user_id                   TEXT NOT NULL,
  spice_tolerance           SMALLINT,
  sweetness_preference      SMALLINT,
  saltiness_preference      SMALLINT,
  oil_preference            SMALLINT,
  allergies                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  dislikes                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  loved_ingredients         JSONB NOT NULL DEFAULT '[]'::jsonb,
  loved_dishes              JSONB NOT NULL DEFAULT '[]'::jsonb,
  dietary_restrictions      JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_cuisines        JSONB NOT NULL DEFAULT '[]'::jsonb,
  disliked_cuisines         JSONB NOT NULL DEFAULT '[]'::jsonb,
  cooking_skill_level       SMALLINT,
  typical_cooking_time_min  SMALLINT,
  notes                     TEXT,
  confidence_score          REAL NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS household_members (
  id                    BIGSERIAL PRIMARY KEY,
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  user_id               TEXT NOT NULL,
  name                  TEXT NOT NULL,
  relation              TEXT,
  age_group             TEXT,
  dietary_restrictions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergies             JSONB NOT NULL DEFAULT '[]'::jsonb,
  dislikes              JSONB NOT NULL DEFAULT '[]'::jsonb,
  medical_conditions    JSONB NOT NULL DEFAULT '[]'::jsonb,
  texture_needs         JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_household_members_tenant_user
  ON household_members (tenant_id, user_id);

COMMIT;
