import { describe, expect, it } from "vitest";
import { CreateMealPlanSchema } from "./meal-plan-api-schemas";

describe("CreateMealPlanSchema", () => {
  it("accepts minimal week range", () => {
    const parsed = CreateMealPlanSchema.safeParse({
      start_date: "2026-05-26",
      end_date: "2026-06-01",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid dates", () => {
    const parsed = CreateMealPlanSchema.safeParse({
      start_date: "2026/05/26",
      end_date: "2026-06-01",
    });
    expect(parsed.success).toBe(false);
  });
});
