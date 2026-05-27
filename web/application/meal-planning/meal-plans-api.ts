import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isMealPlanUiEnabled } from "@/platform/config/meal-planning-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { getSessionUserId } from "@/platform/identity/session";

export const mealPlanConstraintsSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_pattern: z.object({
    breakfast: z.boolean(),
    lunch: z.boolean(),
    dinner: z.boolean(),
    snack: z.boolean().optional(),
  }),
  budget_total_twd: z.number().nullable().optional(),
  weekday_max_time_min: z.number().optional(),
  weekend_max_time_min: z.number().optional(),
  max_same_cuisine_in_row: z.number().optional(),
  max_same_protein_in_row: z.number().optional(),
  target_household_member_ids: z.array(z.number()).optional(),
  allow_leftover_repurposing: z.boolean().optional(),
  batch_cooking_preferred: z.boolean().optional(),
});

export type MealPlansApiContext =
  | { ok: true; userId: string; tenantId: string }
  | { ok: false; response: NextResponse };

export async function requireMealPlansApi(): Promise<MealPlansApiContext> {
  if (!isMealPlanUiEnabled()) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Meal plan UI disabled" },
        { status: 503 },
      ),
    };
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Unauthorized" }, {
        status: 401,
      }),
    };
  }
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Database not configured" },
        { status: 503 },
      ),
    };
  }
  return { ok: true, userId, tenantId: DEFAULT_TENANT_ID };
}

export function planForbidden() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}
