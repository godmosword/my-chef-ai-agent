import { z } from "zod";

export const MealPatternSchema = z.object({
  breakfast: z.boolean(),
  lunch: z.boolean(),
  dinner: z.boolean(),
  snack: z.boolean().optional(),
});
export type MealPattern = z.infer<typeof MealPatternSchema>;

export const CreateMealPlanSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_pattern: MealPatternSchema.optional(),
  budget_total_twd: z.number().int().positive().optional(),
  weekday_max_time_min: z.number().int().positive().optional(),
  weekend_max_time_min: z.number().int().positive().optional(),
  prioritize_pantry: z.boolean().optional(),
  prioritize_expiring: z.boolean().optional(),
  activate: z.boolean().optional(),
});
export type CreateMealPlan = z.infer<typeof CreateMealPlanSchema>;

export const MealPlanSlotSkippedSchema = z.object({
  reason: z.string().min(1).max(64),
});
export type MealPlanSlotSkipped = z.infer<typeof MealPlanSlotSkippedSchema>;

export const MealPlanSlotConsumeSchema = z.object({
  consume_all: z.boolean().optional(),
});
export type MealPlanSlotConsume = z.infer<typeof MealPlanSlotConsumeSchema>;
