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
