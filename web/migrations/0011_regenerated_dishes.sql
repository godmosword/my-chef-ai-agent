-- 0011: regenerated_dishes on user_taste_profile (PM-2 implicit dislike tracking)
ALTER TABLE user_taste_profile
  ADD COLUMN IF NOT EXISTS regenerated_dishes JSONB NOT NULL DEFAULT '[]'::jsonb;
