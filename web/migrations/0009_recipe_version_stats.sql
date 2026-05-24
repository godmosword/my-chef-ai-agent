-- 0009_recipe_version_stats
-- Adds prep_minutes / cook_minutes / servings to recipe_versions for
-- recipe metadata display (D6 in feedback v2 plan).
-- All nullable; existing rows simply have NULL until next regeneration.
-- Idempotent.

ALTER TABLE recipe_versions
  ADD COLUMN IF NOT EXISTS prep_minutes  INTEGER,
  ADD COLUMN IF NOT EXISTS cook_minutes  INTEGER,
  ADD COLUMN IF NOT EXISTS servings      INTEGER;
