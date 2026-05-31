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
