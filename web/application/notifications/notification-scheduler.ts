/**
 * PT-4: should-send decision logic for expiry reminders & digest eligibility.
 */
import type { PantryItem } from "@/platform/db/pantry";
import type { NotificationPreferences } from "@/platform/db/notification-prefs";
import {
  getLocalParts,
  hoursSince,
  isInQuietHours,
} from "@/domain/notifications/quiet-hours";
import {
  notificationIgnoreBackoffThreshold,
} from "@/platform/config/notification-config";

export type SendDecision = { send: boolean; reason: string };

function hasItemExpiringWithinDays(
  items: PantryItem[],
  days: number,
  todayStr: string,
): boolean {
  const end = new Date(`${todayStr}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  const endStr = end.toISOString().slice(0, 10);
  return items.some(
    (i) =>
      i.expires_at &&
      i.expires_at >= todayStr &&
      i.expires_at <= endStr,
  );
}

export function shouldSendExpiryReminder(
  prefs: NotificationPreferences,
  nowUtc: Date,
  expiringItems: PantryItem[],
): SendDecision {
  if (!prefs.expiry_reminders_enabled) {
    return { send: false, reason: "disabled" };
  }
  if (prefs.snooze_until && new Date(prefs.snooze_until) > nowUtc) {
    return { send: false, reason: "snoozed" };
  }
  if (prefs.backoff_until && new Date(prefs.backoff_until) > nowUtc) {
    return { send: false, reason: "backoff" };
  }

  const local = getLocalParts(nowUtc, prefs.timezone);
  if (isInQuietHours(local.hour, prefs.quiet_hours_start, prefs.quiet_hours_end)) {
    return { send: false, reason: "quiet_hours" };
  }

  const todayStr = new Date(
    Date.UTC(local.year, local.month - 1, local.day),
  )
    .toISOString()
    .slice(0, 10);

  const activeItems = expiringItems.filter(
    (i) => i.expires_at && (i.expires_at >= todayStr || i.expires_at < todayStr),
  );
  if (!activeItems.length) {
    return { send: false, reason: "nothing_to_remind" };
  }

  if (prefs.expiry_reminder_frequency === "off") {
    return { send: false, reason: "frequency_off" };
  }
  if (prefs.expiry_reminder_frequency === "weekly_only") {
    return { send: false, reason: "weekly_only" };
  }

  const threshold = notificationIgnoreBackoffThreshold();
  if (prefs.consecutive_ignored_count >= threshold) {
    return { send: false, reason: "backoff" };
  }

  const hoursSinceLast = hoursSince(prefs.last_reminder_sent_at, nowUtc);

  if (prefs.expiry_reminder_frequency === "daily") {
    if (hoursSinceLast != null && hoursSinceLast < 20) {
      return { send: false, reason: "too_soon" };
    }
    return { send: true, reason: "daily_ok" };
  }

  // smart (default)
  if (hoursSinceLast != null && hoursSinceLast < 36) {
    return { send: false, reason: "too_soon" };
  }
  if (!hasItemExpiringWithinDays(activeItems, 2, todayStr)) {
    return { send: false, reason: "smart_no_urgent" };
  }
  return { send: true, reason: "smart_ok" };
}

export function shouldSendWeeklyDigest(
  prefs: NotificationPreferences,
  nowUtc: Date,
): SendDecision {
  if (!prefs.weekly_digest_enabled) {
    return { send: false, reason: "digest_disabled" };
  }
  if (prefs.snooze_until && new Date(prefs.snooze_until) > nowUtc) {
    return { send: false, reason: "snoozed" };
  }

  const local = getLocalParts(nowUtc, prefs.timezone);
  if (local.weekday !== prefs.weekly_digest_day) {
    return { send: false, reason: "wrong_day" };
  }
  if (local.hour !== prefs.weekly_digest_hour) {
    return { send: false, reason: "wrong_hour" };
  }
  if (isInQuietHours(local.hour, prefs.quiet_hours_start, prefs.quiet_hours_end)) {
    return { send: false, reason: "quiet_hours" };
  }

  const hoursSinceLast = hoursSince(prefs.last_digest_sent_at, nowUtc);
  if (hoursSinceLast != null && hoursSinceLast < 24 * 6) {
    return { send: false, reason: "digest_too_soon" };
  }

  return { send: true, reason: "digest_ok" };
}
