/**
 * PT-4: cron sweep — deliver expiry reminders via in-app inbox.
 */
import { buildExpiryReminderPayload } from "@/application/notifications/expiry-reminder-payload";
import {
  shouldSendExpiryReminder,
} from "@/application/notifications/notification-scheduler";
import { updateEngagementSignals } from "@/application/notifications/engagement-signals";
import {
  isExpiryRemindersEnabled,
  notificationConcurrency,
  notificationMaxPushesPerSweep,
} from "@/platform/config/notification-config";
import { findExpiringSoon, type PantryItem } from "@/platform/db/pantry";
import {
  getNotificationPreferences,
  getOrCreateNotificationPreferences,
  listUsersWithPantryForReminders,
  markReminderSent,
  resetIgnored,
  updateNotificationPreferences,
} from "@/platform/db/notification-prefs";
import { insertNotificationInbox } from "@/platform/db/notification-inbox";
import {
  recordNotificationDecision,
  recordNotificationPush,
  recordNotificationSweep,
} from "@/platform/observability/notification-metrics";
import { hashUserIdForObservability } from "@/platform/observability/hash-user-id";

export type SweepResult = {
  checked: number;
  sent: number;
  skipped: Record<string, number>;
};

async function deliverReminder(
  tenantId: string,
  userId: string,
  items: PantryItem[],
  showDisclaimer: boolean,
): Promise<boolean> {
  const prefs = await getNotificationPreferences(tenantId, userId);
  if (!prefs) return false;

  const payload = buildExpiryReminderPayload(
    items,
    prefs.expiry_warn_days,
    showDisclaimer,
  );

  if (showDisclaimer) {
    await insertNotificationInbox(tenantId, userId, "expiry_disclaimer", {
      text: payload.show_disclaimer,
    });
    await updateNotificationPreferences(tenantId, userId, {
      first_reminder_disclaimer_sent: true,
    });
  }

  const row = await insertNotificationInbox(
    tenantId,
    userId,
    "expiry_reminder",
    payload as unknown as Record<string, unknown>,
  );
  if (!row) return false;

  await markReminderSent(tenantId, userId);
  await resetIgnored(tenantId, userId);
  recordNotificationPush("ok", hashUserIdForObservability(userId));
  return true;
}

export async function runExpiryReminderSweep(
  tenantId: string,
  nowUtc: Date = new Date(),
): Promise<SweepResult> {
  const skipped: Record<string, number> = {};
  const bumpSkip = (reason: string) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
    recordNotificationDecision("expiry", "skipped", reason);
  };

  if (!isExpiryRemindersEnabled()) {
    recordNotificationSweep("expiry", "ok", 0);
    return { checked: 0, sent: 0, skipped: { feature_disabled: 1 } };
  }

  const userIds = await listUsersWithPantryForReminders(tenantId);
  const maxPushes = notificationMaxPushesPerSweep();
  const concurrency = notificationConcurrency();
  let sent = 0;
  let checked = 0;

  const sem = { active: 0, queue: [] as (() => void)[] };
  const acquire = () =>
    new Promise<void>((resolve) => {
      if (sem.active < concurrency) {
        sem.active += 1;
        resolve();
      } else {
        sem.queue.push(() => {
          sem.active += 1;
          resolve();
        });
      }
    });
  const release = () => {
    sem.active -= 1;
    const next = sem.queue.shift();
    if (next) next();
  };

  await updateEngagementSignals(tenantId, nowUtc);

  const tasks = userIds.map((userId) => async () => {
    if (sent >= maxPushes) return;
    await acquire();
    try {
      checked += 1;
      const prefs =
        (await getNotificationPreferences(tenantId, userId)) ??
        (await getOrCreateNotificationPreferences(tenantId, userId));
      if (!prefs) {
        bumpSkip("no_prefs");
        return;
      }

      const items = await findExpiringSoon(tenantId, userId, {
        days_ahead: prefs.expiry_warn_days,
      });
      const decision = shouldSendExpiryReminder(prefs, nowUtc, items);
      if (!decision.send) {
        bumpSkip(decision.reason);
        return;
      }

      if (sent >= maxPushes) {
        bumpSkip("cost_cap");
        recordNotificationPush("cost_cap", hashUserIdForObservability(userId));
        return;
      }

      const ok = await deliverReminder(
        tenantId,
        userId,
        items,
        !prefs.first_reminder_disclaimer_sent,
      );
      if (ok) {
        sent += 1;
        recordNotificationDecision("expiry", "sent", decision.reason);
      } else {
        bumpSkip("delivery_failed");
        recordNotificationPush(
          "line_api_error",
          hashUserIdForObservability(userId),
        );
      }
    } finally {
      release();
    }
  });

  await Promise.all(tasks.map((t) => t()));

  if (sent >= maxPushes) {
    skipped.cost_cap = (skipped.cost_cap ?? 0) + 1;
  }

  recordNotificationSweep("expiry", "ok", checked);
  return { checked, sent, skipped };
}
