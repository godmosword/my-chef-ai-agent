/** PT-4: proactive expiry reminders, weekly digest, use-it-up. */

export type ReminderFrequency = "daily" | "smart" | "weekly_only" | "off";

export function isExpiryRemindersEnabled(): boolean {
  return process.env.ENABLE_EXPIRY_REMINDERS !== "0";
}

export function isWeeklyDigestEnabled(): boolean {
  return process.env.ENABLE_WEEKLY_DIGEST !== "0";
}

export function isUseItUpEnabled(): boolean {
  return process.env.ENABLE_USE_IT_UP !== "0";
}

export function notificationCronSecret(): string | null {
  const raw = process.env.NOTIFICATION_CRON_SECRET?.trim();
  return raw || null;
}

export function notificationMaxPushesPerSweep(): number {
  return Math.max(
    1,
    parseInt(process.env.NOTIFICATION_MAX_PUSHES_PER_SWEEP || "1000", 10) || 1000,
  );
}

export function notificationConcurrency(): number {
  return Math.max(
    1,
    parseInt(process.env.NOTIFICATION_CONCURRENCY || "10", 10) || 10,
  );
}

export function notificationIgnoreBackoffThreshold(): number {
  return Math.max(
    1,
    parseInt(process.env.NOTIFICATION_IGNORE_BACKOFF_THRESHOLD || "3", 10) || 3,
  );
}

export function notificationIgnoreBackoffDays(): number {
  return Math.max(
    1,
    parseInt(process.env.NOTIFICATION_IGNORE_BACKOFF_DAYS || "14", 10) || 14,
  );
}

export function useItUpFullRecipesCount(): number {
  return Math.max(
    0,
    parseInt(process.env.USE_IT_UP_FULL_RECIPES_COUNT || "1", 10) || 1,
  );
}

export function useItUpCandidateMaxTokens(): number {
  return Math.max(
    100,
    parseInt(process.env.USE_IT_UP_CANDIDATE_MAX_TOKENS || "400", 10) || 400,
  );
}

export function useItUpCandidateTimeoutSec(): number {
  return Math.max(
    3,
    parseInt(process.env.USE_IT_UP_CANDIDATE_TIMEOUT_SEC || "10", 10) || 10,
  );
}

export function defaultExpiryWarnDays(): number {
  return Math.max(
    1,
    parseInt(process.env.PANTRY_EXPIRY_WARN_DAYS || "3", 10) || 3,
  );
}
