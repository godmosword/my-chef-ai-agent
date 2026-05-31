import { z } from "zod";

export const NotificationSnoozeSchema = z.object({
  days: z.number().int().min(1).max(90),
});

export const NotificationInboxMarkReadSchema = z.object({
  id: z.number().int().positive(),
});
