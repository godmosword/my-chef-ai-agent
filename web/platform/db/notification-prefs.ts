/**
 * Notification preferences CRUD (PT-4).
 */
import type { ReminderFrequency } from "@/platform/config/notification-config";
import { defaultExpiryWarnDays } from "@/platform/config/notification-config";
import { asRows, getSql } from "./client";

export type NotificationPreferences = {
  tenant_id: string;
  user_id: string;
  expiry_reminders_enabled: boolean;
  expiry_warn_days: number;
  expiry_reminder_frequency: ReminderFrequency;
  quiet_hours_start: number;
  quiet_hours_end: number;
  timezone: string;
  weekly_digest_enabled: boolean;
  weekly_digest_day: number;
  weekly_digest_hour: number;
  last_reminder_sent_at: string | null;
  last_digest_sent_at: string | null;
  snooze_until: string | null;
  consecutive_ignored_count: number;
  last_interaction_at: string | null;
  first_reminder_disclaimer_sent: boolean;
  backoff_until: string | null;
  created_at: string;
  updated_at: string;
};

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
}

function rowToPrefs(row: Record<string, unknown>): NotificationPreferences {
  return {
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    expiry_reminders_enabled: Boolean(row.expiry_reminders_enabled),
    expiry_warn_days: Number(row.expiry_warn_days ?? defaultExpiryWarnDays()),
    expiry_reminder_frequency: String(
      row.expiry_reminder_frequency ?? "smart",
    ) as ReminderFrequency,
    quiet_hours_start: Number(row.quiet_hours_start ?? 22),
    quiet_hours_end: Number(row.quiet_hours_end ?? 8),
    timezone: String(row.timezone ?? "Asia/Taipei"),
    weekly_digest_enabled: Boolean(row.weekly_digest_enabled),
    weekly_digest_day: Number(row.weekly_digest_day ?? 0),
    weekly_digest_hour: Number(row.weekly_digest_hour ?? 19),
    last_reminder_sent_at: toIso(row.last_reminder_sent_at),
    last_digest_sent_at: toIso(row.last_digest_sent_at),
    snooze_until: toIso(row.snooze_until),
    consecutive_ignored_count: Number(row.consecutive_ignored_count ?? 0),
    last_interaction_at: toIso(row.last_interaction_at),
    first_reminder_disclaimer_sent: Boolean(row.first_reminder_disclaimer_sent),
    backoff_until: toIso(row.backoff_until),
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    updated_at: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

export async function getNotificationPreferences(
  tenantId: string,
  userId: string,
): Promise<NotificationPreferences | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM notification_preferences
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? rowToPrefs(row) : null;
}

export async function getOrCreateNotificationPreferences(
  tenantId: string,
  userId: string,
): Promise<NotificationPreferences | null> {
  const existing = await getNotificationPreferences(tenantId, userId);
  if (existing) return existing;

  const sql = getSql();
  if (!sql) return null;
  const warnDays = defaultExpiryWarnDays();
  const rows = await sql`
    INSERT INTO notification_preferences (
      tenant_id, user_id, expiry_warn_days
    ) VALUES (
      ${tenantId}, ${userId}, ${warnDays}
    )
    ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET updated_at = now()
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? rowToPrefs(row) : null;
}

export type NotificationPrefsPatch = Partial<
  Pick<
    NotificationPreferences,
    | "expiry_reminders_enabled"
    | "expiry_warn_days"
    | "expiry_reminder_frequency"
    | "quiet_hours_start"
    | "quiet_hours_end"
    | "timezone"
    | "weekly_digest_enabled"
    | "weekly_digest_day"
    | "weekly_digest_hour"
    | "snooze_until"
    | "first_reminder_disclaimer_sent"
    | "backoff_until"
    | "consecutive_ignored_count"
  >
>;

export async function updateNotificationPreferences(
  tenantId: string,
  userId: string,
  fields: NotificationPrefsPatch,
): Promise<NotificationPreferences | null> {
  await getOrCreateNotificationPreferences(tenantId, userId);
  const sql = getSql();
  if (!sql) return null;

  const current = await getNotificationPreferences(tenantId, userId);
  if (!current) return null;

  const rows = await sql`
    UPDATE notification_preferences SET
      expiry_reminders_enabled = ${fields.expiry_reminders_enabled ?? current.expiry_reminders_enabled},
      expiry_warn_days = ${fields.expiry_warn_days ?? current.expiry_warn_days},
      expiry_reminder_frequency = ${fields.expiry_reminder_frequency ?? current.expiry_reminder_frequency},
      quiet_hours_start = ${fields.quiet_hours_start ?? current.quiet_hours_start},
      quiet_hours_end = ${fields.quiet_hours_end ?? current.quiet_hours_end},
      timezone = ${fields.timezone ?? current.timezone},
      weekly_digest_enabled = ${fields.weekly_digest_enabled ?? current.weekly_digest_enabled},
      weekly_digest_day = ${fields.weekly_digest_day ?? current.weekly_digest_day},
      weekly_digest_hour = ${fields.weekly_digest_hour ?? current.weekly_digest_hour},
      snooze_until = ${fields.snooze_until !== undefined ? fields.snooze_until : current.snooze_until},
      first_reminder_disclaimer_sent = ${fields.first_reminder_disclaimer_sent ?? current.first_reminder_disclaimer_sent},
      backoff_until = ${fields.backoff_until !== undefined ? fields.backoff_until : current.backoff_until},
      consecutive_ignored_count = ${fields.consecutive_ignored_count ?? current.consecutive_ignored_count},
      updated_at = now()
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? rowToPrefs(row) : null;
}

export async function markReminderSent(
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    UPDATE notification_preferences
    SET last_reminder_sent_at = now(), updated_at = now()
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

export async function markDigestSent(
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    UPDATE notification_preferences
    SET last_digest_sent_at = now(), updated_at = now()
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

export async function incrementIgnored(
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    UPDATE notification_preferences
    SET consecutive_ignored_count = consecutive_ignored_count + 1,
        updated_at = now()
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

export async function resetIgnored(
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    UPDATE notification_preferences
    SET consecutive_ignored_count = 0,
        backoff_until = NULL,
        updated_at = now()
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

export async function touchLastInteraction(
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await getOrCreateNotificationPreferences(tenantId, userId);
  await sql`
    UPDATE notification_preferences
    SET last_interaction_at = now(), updated_at = now()
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

export async function snoozeNotifications(
  tenantId: string,
  userId: string,
  days: number,
): Promise<NotificationPreferences | null> {
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + days);
  return updateNotificationPreferences(tenantId, userId, {
    snooze_until: until.toISOString(),
  });
}

export async function listNotificationPreferencesForTenant(
  tenantId: string,
): Promise<NotificationPreferences[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM notification_preferences WHERE tenant_id = ${tenantId}
  `;
  return asRows<Record<string, unknown>>(rows).map(rowToPrefs);
}

export async function listUsersWithPantryForReminders(
  tenantId: string,
): Promise<string[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT DISTINCT p.user_id
    FROM notification_preferences p
    INNER JOIN pantry_items i
      ON i.tenant_id = p.tenant_id
      AND i.user_id = p.user_id
      AND i.deleted_at IS NULL
      AND i.expires_at IS NOT NULL
    WHERE p.tenant_id = ${tenantId}
      AND p.expiry_reminders_enabled = TRUE
  `;
  return asRows<Record<string, unknown>>(rows).map((r) => String(r.user_id));
}

export async function hardDeleteNotificationPrefs(
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    DELETE FROM notification_preferences
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}
