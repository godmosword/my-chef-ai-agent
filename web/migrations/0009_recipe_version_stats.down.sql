ALTER TABLE recipe_versions
  DROP COLUMN IF EXISTS prep_minutes,
  DROP COLUMN IF EXISTS cook_minutes,
  DROP COLUMN IF EXISTS servings;
