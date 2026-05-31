import { describe, expect, it } from "vitest";
import { emptyPersonalizationBlock } from "@/domain/personalization/personalization-block";
import { validatePlan } from "./validate-plan";
import type { CandidateSlot, MealPlanConstraints } from "./types";

function slot(
  title: string,
  overrides: Partial<CandidateSlot> = {},
): CandidateSlot {
  return {
    slot_date: "2026-05-27",
    meal_type: "dinner",
    slot_index: 0,
    dish_title: title,
    cuisine: "台式",
    estimated_time_min: 20,
    effort_level: "quick",
    key_ingredients: [],
    estimated_cost: 50,
    tags: [],
    rationale: null,
    ...overrides,
  };
}

const baseConstraints: MealPlanConstraints = {
  start_date: "2026-05-27",
  end_date: "2026-05-28",
  meal_pattern: { breakfast: false, lunch: true, dinner: true },
  budget_total_twd: 500,
  weekday_max_time_min: 30,
  weekend_max_time_min: 60,
  max_same_cuisine_in_row: 2,
  max_same_protein_in_row: 2,
};

function ctx(overrides: Partial<ReturnType<typeof baseCtx>> = {}) {
  return { ...baseCtx(), ...overrides };
}

function baseCtx() {
  return {
    constraints: baseConstraints,
    personalization: emptyPersonalizationBlock(),
    userAllergies: [] as string[],
    householdAllergies: [] as string[],
    dietaryRestrictions: [] as string[],
  };
}

describe("validatePlan", () => {
  it("allergy violation critical", () => {
    const violations = validatePlan(
      [
        slot("花生醬麵", {
          key_ingredients: [
            {
              item_key: "peanut",
              display_name: "花生",
              approx_quantity: null,
              approx_unit: null,
              from_pantry: false,
              urgency: "none",
            },
          ],
        }),
      ],
      ctx({ userAllergies: ["花生"] }),
    );
    expect(violations.some((v) => v.code === "allergy_violation")).toBe(true);
  });

  it("household allergy caught", () => {
    const violations = validatePlan(
      [slot("蝦仁炒飯", { key_ingredients: [{ item_key: "shrimp", display_name: "蝦仁", approx_quantity: null, approx_unit: null, from_pantry: false, urgency: "none" }] })],
      ctx({ householdAllergies: ["蝦"] }),
    );
    expect(violations.some((v) => v.code === "allergy_violation")).toBe(true);
  });

  it("vegetarian + chicken critical", () => {
    const violations = validatePlan(
      [slot("宮保雞丁")],
      ctx({ dietaryRestrictions: ["vegetarian"] }),
    );
    expect(violations.some((v) => v.code === "dietary_violation")).toBe(true);
  });

  it("budget within no violation", () => {
    const violations = validatePlan(
      [slot("A", { estimated_cost: 100 }), slot("B", { estimated_cost: 100 })],
      ctx({ constraints: { ...baseConstraints, budget_total_twd: 500 } }),
    );
    expect(violations.filter((v) => v.code === "budget_exceeded")).toHaveLength(0);
  });

  it("budget 5% over warning", () => {
    const violations = validatePlan(
      [slot("A", { estimated_cost: 300 })],
      ctx({ constraints: { ...baseConstraints, budget_total_twd: 250 } }),
    );
    const b = violations.find((v) => v.code === "budget_exceeded");
    expect(b?.severity).toBe("warning");
  });

  it("budget 30% over critical", () => {
    const violations = validatePlan(
      [slot("A", { estimated_cost: 400 })],
      ctx({ constraints: { ...baseConstraints, budget_total_twd: 250 } }),
    );
    const b = violations.find((v) => v.code === "budget_exceeded");
    expect(b?.severity).toBe("critical");
  });

  it("cuisine repeat warning", () => {
    const violations = validatePlan(
      [
        slot("A", { cuisine: "台式" }),
        slot("B", { cuisine: "台式" }),
        slot("C", { cuisine: "台式" }),
      ],
      ctx(),
    );
    expect(violations.some((v) => v.code === "cuisine_repeat")).toBe(true);
  });

  it("protein repeat warning", () => {
    const violations = validatePlan(
      [slot("雞肉飯"), slot("三杯雞"), slot("雞湯")],
      ctx(),
    );
    expect(violations.some((v) => v.code === "protein_repeat")).toBe(true);
  });

  it("time exceeded weekday warning", () => {
    const violations = validatePlan(
      [slot("慢燉", { estimated_time_min: 45, slot_date: "2026-05-27" })],
      ctx({ constraints: { ...baseConstraints, weekday_max_time_min: 30 } }),
    );
    expect(violations.some((v) => v.code === "time_exceeded")).toBe(true);
  });

  it("duplicate dish critical", () => {
    const violations = validatePlan([slot("番茄炒蛋"), slot("番茄炒蛋")], ctx());
    expect(violations.some((v) => v.code === "duplicate_dish")).toBe(true);
  });

  it("missing slot critical", () => {
    const violations = validatePlan([slot("only one")], ctx());
    expect(violations.some((v) => v.code === "slot_incomplete")).toBe(true);
  });
});
