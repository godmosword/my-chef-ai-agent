import { z } from "zod";

/**
 * Meal-planning dashboard payload (built by application dashboard-service).
 * Lenient (passthrough): the UI reads a fixed subset; extra metrics are
 * tolerated without failing validation.
 */
export const DashboardSchema = z
  .object({
    streak_weeks: z.number(),
    avg_cook_rate: z.number(),
    avg_weekly_cost: z.number().nullable(),
    waste_rate: z.number(),
    active_plan: z
      .object({
        id: z.number(),
        start_date: z.string(),
        end_date: z.string(),
        name: z.string().nullable(),
      })
      .nullable(),
    last_completed_insights: z
      .object({
        plan_id: z.number(),
        plan_name: z.string(),
        cook_rate: z.number(),
        slots_cooked: z.number(),
        slots_total: z.number(),
      })
      .nullable(),
    cook_rate_history: z.array(
      z.object({
        plan_id: z.number(),
        end_date: z.string(),
        cook_rate: z.number(),
      }),
    ),
  })
  .passthrough();
export type Dashboard = z.infer<typeof DashboardSchema>;

/** Response of GET /api/me/dashboard (success case). */
export const DashboardResponseSchema = z.object({
  ok: z.boolean().optional(),
  dashboard: DashboardSchema.optional(),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
