/**
 * PT-4: increment ignored count when no interaction 24h after reminder.
 */
import {
  notificationIgnoreBackoffDays,
  notificationIgnoreBackoffThreshold,
} from "@/platform/config/notification-config";
import {
  getNotificationPreferences,
  incrementIgnored,
  listNotificationPreferencesForTenant,
  resetIgnored,
  updateNotificationPreferences,
} from "@/platform/db/notification-prefs";
import { recordNotificationEngagement } from "@/platform/observability/notification-metrics";

const HOURS_ENGAGEMENT_WINDOW = 24;

export async function updateEngagementSignals(
  tenantId: string,
  nowUtc: Date = new Date(),
): Promise<void> {
  const threshold = notificationIgnoreBackoffThreshold();
  const backoffDays = notificationIgnoreBackoffDays();
  const all = await listNotificationPreferencesForTenant(tenantId);

  for (const prefs of all) {
    if (prefs.backoff_until && new Date(prefs.backoff_until) <= nowUtc) {
      await resetIgnored(tenantId, prefs.user_id);
      continue;
    }

    if (!prefs.last_reminder_sent_at) continue;

    const sentAt = new Date(prefs.last_reminder_sent_at).getTime();
    const hoursSinceSent = (nowUtc.getTime() - sentAt) / (1000 * 60 * 60);
    if (hoursSinceSent < HOURS_ENGAGEMENT_WINDOW) continue;

    const interacted =
      prefs.last_interaction_at &&
      new Date(prefs.last_interaction_at).getTime() > sentAt;

    if (interacted) {
      if (prefs.consecutive_ignored_count > 0) {
        await resetIgnored(tenantId, prefs.user_id);
      }
      continue;
    }

    if (prefs.consecutive_ignored_count < threshold) {
      await incrementIgnored(tenantId, prefs.user_id);
      recordNotificationEngagement("ignored");
    } else if (!prefs.backoff_until) {
      const until = new Date(nowUtc);
      until.setUTCDate(until.getUTCDate() + backoffDays);
      await updateNotificationPreferences(tenantId, prefs.user_id, {
        backoff_until: until.toISOString(),
      });
      recordNotificationEngagement("backoff_entered");
    }
  }
}

export async function recordUserEngagement(
  tenantId: string,
  userId: string,
  event: "opened" | "use_it_up_clicked" | "snooze" | "disabled",
): Promise<void> {
  const { touchLastInteraction, resetIgnored } = await import(
    "@/platform/db/notification-prefs"
  );
  await touchLastInteraction(tenantId, userId);
  await resetIgnored(tenantId, userId);
  recordNotificationEngagement(event);
}
