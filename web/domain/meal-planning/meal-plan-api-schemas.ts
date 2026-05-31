import { z } from "zod";

export const MealPlanSlotSkippedSchema = z.object({
  reason: z.string().min(1).max(64),
});

export const MealPlanSlotConsumeSchema = z.object({
  consume_all: z.boolean().optional(),
});
