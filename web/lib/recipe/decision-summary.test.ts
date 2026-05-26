import { describe, expect, it } from "vitest";
import { buildDecisionSummary } from "./decision-summary";

describe("buildDecisionSummary", () => {
  it("sums prep and cook minutes", () => {
    const s = buildDecisionSummary({
      prep_minutes: 10,
      cook_minutes: 20,
      servings: 2,
      shopping_list: ["調味：醬油"],
      ingredients: [{ name: "雞蛋" }],
    });
    expect(s.totalMinutes).toBe(30);
    expect(s.servings).toBe(2);
    expect(s.shoppingCount).toBe(1);
  });

  it("handles missing fields", () => {
    const s = buildDecisionSummary({});
    expect(s.totalMinutes).toBeNull();
    expect(s.shoppingCount).toBe(0);
  });
});
