-- 0015: notification preferences + inbox (PT-4)
-- Idempotent; safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS notification_preferences (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  expiry_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  expiry_warn_days INTEGER NOT NULL DEFAULT 3,
  expiry_reminder_frequency TEXT NOT NULL DEFAULT 'smart',
  quiet_hours_start INTEGER NOT NULL DEFAULT 22,
  quiet_hours_end INTEGER NOT NULL DEFAULT 8,
  timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',
  weekly_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  weekly_digest_day INTEGER NOT NULL DEFAULT 0,
  weekly_digest_hour INTEGER NOT NULL DEFAULT 19,
  last_reminder_sent_at TIMESTAMPTZ,
  last_digest_sent_at TIMESTAMPTZ,
  snooze_until TIMESTAMPTZ,
  consecutive_ignored_count INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  first_reminder_disclaimer_sent BOOLEAN NOT NULL DEFAULT FALSE,
  backoff_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_active
  ON notification_preferences (tenant_id, user_id)
  WHERE expiry_reminders_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_notification_prefs_digest
  ON notification_preferences (tenant_id, user_id)
  WHERE weekly_digest_enabled = TRUE;

CREATE TABLE IF NOT EXISTS notification_inbox (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_user_unread
  ON notification_inbox (tenant_id, user_id, created_at DESC)
  WHERE read_at IS NULL;

COMMIT;
