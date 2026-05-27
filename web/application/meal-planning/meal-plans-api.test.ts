import { describe, expect, it } from "vitest";
import { mealPlanConstraintsSchema } from "./meal-plans-api";
import { countExpectedMeals } from "./meal-plan-ui";

describe("mealPlanConstraintsSchema", () => {
  it("accepts valid constraints", () => {
    const parsed = mealPlanConstraintsSchema.parse({
      start_date: "2026-05-27",
      end_date: "2026-06-02",
      meal_pattern: { breakfast: false, lunch: true, dinner: true },
      budget_total_twd: 1500,
    });
    expect(parsed.start_date).toBe("2026-05-27");
  });
});

describe("countExpectedMeals", () => {
  it("counts lunch+dinner for 7 days", () => {
    const n = countExpectedMeals({
      start_date: "2026-05-27",
      end_date: "2026-06-02",
      meal_pattern: { breakfast: false, lunch: true, dinner: true },
    });
    expect(n).toBe(14);
  });
});
