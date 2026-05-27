-- MP-4: meal plan execution notification prefs + plan lifecycle flags

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS daily_meal_push_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS daily_meal_morning_hour INTEGER DEFAULT 9,
  ADD COLUMN IF NOT EXISTS daily_meal_evening_hour INTEGER DEFAULT 17,
  ADD COLUMN IF NOT EXISTS daily_meal_evening_minute INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_meal_morning_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS daily_meal_evening_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS shopping_reminder_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS shopping_reminder_day INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS shopping_reminder_hour INTEGER DEFAULT 9,
  ADD COLUMN IF NOT EXISTS weekly_review_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS weekly_review_day INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS weekly_review_hour INTEGER DEFAULT 19,
  ADD COLUMN IF NOT EXISTS last_daily_morning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_daily_evening_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_shopping_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_weekly_review_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meal_plan_morning_ignored_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_plan_morning_backoff_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_next_week_nudge_sent_at TIMESTAMPTZ;

ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS auto_completed_with_low_engagement BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weekly_review_narrative TEXT,
  ADD COLUMN IF NOT EXISTS weekly_review_narrative_at TIMESTAMPTZ;
