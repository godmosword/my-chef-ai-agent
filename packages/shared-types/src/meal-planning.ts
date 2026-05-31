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

/**
 * Completed meal-plan review insights. Lenient (passthrough) so added
 * metrics don't break the review page.
 */
export const MealPlanInsightsSchema = z
  .object({
    plan_name: z.string(),
    date_range: z.tuple([z.string(), z.string()]),
    slots_cooked: z.number(),
    slots_skipped: z.number(),
    slots_swapped: z.number(),
    slots_total: z.number(),
    cook_rate: z.number(),
    estimated_total_cost: z.number().nullable(),
    actual_total_cost: z.number().nullable(),
    skip_reasons_summary: z.record(z.string(), z.number()),
    expiring_items_wasted: z.array(z.string()),
    new_dishes_tried: z.array(z.string()),
  })
  .passthrough();
export type MealPlanInsights = z.infer<typeof MealPlanInsightsSchema>;

/** Response of GET /api/me/meal-plans/[planId]/insights (success case). */
export const MealPlanInsightsResponseSchema = z.object({
  ok: z.boolean().optional(),
  insights: MealPlanInsightsSchema.optional(),
});
export type MealPlanInsightsResponse = z.infer<
  typeof MealPlanInsightsResponseSchema
>;
