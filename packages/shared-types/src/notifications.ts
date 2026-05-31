import { z } from "zod";

export const NotificationSnoozeSchema = z.object({
  days: z.number().int().min(1).max(90),
});
export type NotificationSnooze = z.infer<typeof NotificationSnoozeSchema>;

export const NotificationInboxMarkReadSchema = z.object({
  id: z.number().int().positive(),
});
export type NotificationInboxMarkRead = z.infer<
  typeof NotificationInboxMarkReadSchema
>;

/**
 * A single unread notification item. Lenient (passthrough) because the
 * server row carries extra fields the UI ignores, and payload shape varies
 * by `kind`.
 */
export const NotificationInboxItemSchema = z
  .object({
    id: z.number(),
    kind: z.string(),
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .passthrough();
export type NotificationInboxItem = z.infer<
  typeof NotificationInboxItemSchema
>;

/** Response of GET /api/me/notifications/inbox (success case). */
export const NotificationInboxResponseSchema = z.object({
  ok: z.boolean().optional(),
  items: z.array(NotificationInboxItemSchema).default([]),
});
export type NotificationInboxResponse = z.infer<
  typeof NotificationInboxResponseSchema
>;

/**
 * Stored notification preferences (read shape). Lenient (passthrough): the
 * settings UI reads a fixed set of fields; the row carries a few extras
 * (e.g. timezone) the page does not render.
 */
export const NotificationPreferencesSchema = z
  .object({
    expiry_reminders_enabled: z.boolean(),
    expiry_warn_days: z.number(),
    expiry_reminder_frequency: z.string(),
    quiet_hours_start: z.number(),
    quiet_hours_end: z.number(),
    weekly_digest_enabled: z.boolean(),
    weekly_digest_day: z.number(),
    weekly_digest_hour: z.number(),
    snooze_until: z.string().nullable(),
    last_reminder_sent_at: z.string().nullable(),
    daily_meal_push_enabled: z.boolean(),
    daily_meal_morning_enabled: z.boolean(),
    daily_meal_morning_hour: z.number(),
    daily_meal_evening_enabled: z.boolean(),
    daily_meal_evening_hour: z.number(),
    shopping_reminder_enabled: z.boolean(),
    shopping_reminder_day: z.number(),
    shopping_reminder_hour: z.number(),
    weekly_review_enabled: z.boolean(),
    weekly_review_day: z.number(),
    weekly_review_hour: z.number(),
  })
  .passthrough();
export type NotificationPreferences = z.infer<
  typeof NotificationPreferencesSchema
>;

/** Response of GET /api/me/notifications (success case). */
export const NotificationPreferencesResponseSchema = z.object({
  ok: z.boolean().optional(),
  preferences: NotificationPreferencesSchema.optional(),
});
export type NotificationPreferencesResponse = z.infer<
  typeof NotificationPreferencesResponseSchema
>;
