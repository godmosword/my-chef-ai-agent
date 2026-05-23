-- Migration 0006: Recipe hero auto-generation status + user preference
BEGIN;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS hero_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS hero_error TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS hero_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipes_hero_status_check'
  ) THEN
    ALTER TABLE recipes
      ADD CONSTRAINT recipes_hero_status_check
      CHECK (hero_status IN ('pending', 'generating', 'ready', 'failed', 'skipped'));
  END IF;
END $$;

-- Existing rows: cached URL → ready; otherwise skipped (no backfill burst)
UPDATE recipes
SET hero_status = CASE
  WHEN hero_url IS NOT NULL AND hero_url <> '' THEN 'ready'
  ELSE 'skipped'
END
WHERE hero_status = 'pending'
  AND created_at < now();

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS hero_auto_generate BOOLEAN NOT NULL DEFAULT TRUE;

COMMIT;
