import { describe, expect, it } from "vitest";
import { formatIngredient, formatIngredientQuantity } from "@/lib/recipe-steps";

describe("formatIngredientQuantity", () => {
  it("joins amount and unit", () => {
    expect(formatIngredientQuantity("1.5", "杯")).toBe("1.5 杯");
  });

  it("shows qualitative unit only", () => {
    expect(formatIngredientQuantity("少許", "")).toBe("少許");
  });
});

describe("formatIngredient", () => {
  it("formats structured demo rows", () => {
    expect(
      formatIngredient({ name: "白米", amount: "1.5", unit: "杯" }),
    ).toBe("白米 — 1.5 杯");
    expect(
      formatIngredient({ name: "白胡椒", amount: "少許", unit: "" }),
    ).toBe("白胡椒 — 少許");
  });
});
