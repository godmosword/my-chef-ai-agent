-- 0012: onboarding_status on user_taste_profile (PM-4)
ALTER TABLE user_taste_profile
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';
