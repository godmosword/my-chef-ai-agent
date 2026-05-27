import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CandidateSlot } from "@/domain/meal-planning/types";

const mockSlots: CandidateSlot[] = (() => {
  const out: CandidateSlot[] = [];
  const start = new Date("2026-05-27T12:00:00Z");
  for (let d = 0; d < 7; d++) {
    const dt = new Date(start);
    dt.setUTCDate(dt.getUTCDate() + d);
    const slot_date = dt.toISOString().slice(0, 10);
    for (const meal_type of ["lunch", "dinner"] as const) {
      out.push({
        slot_date,
        meal_type,
        slot_index: 0,
        dish_title: `菜色-${slot_date}-${meal_type}`,
        cuisine: "台式",
        estimated_time_min: 20,
        effort_level: "quick",
        key_ingredients: [
          {
            item_key: "tomato",
            display_name: "番茄",
            approx_quantity: 2,
            approx_unit: "顆",
            from_pantry: true,
            urgency: "urgent",
          },
        ],
        estimated_cost: 50,
        tags: ["uses_expiring"],
        rationale: "test",
      });
    }
  }
  return out;
})();

vi.mock("./generate-candidate-plan", () => ({
  generateCandidatePlan: vi.fn(),
}));

vi.mock("@/platform/db/pantry", () => ({
  listPantryItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      item_key: "tomato",
      display_name: "番茄",
      quantity: 3,
      unit: "顆",
    },
  ]),
  findExpiringSoon: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/platform/db/personalization", () => ({
  getTasteProfile: vi.fn().mockResolvedValue({
    allergies: [],
    dietary_restrictions: [],
    regenerated_dishes: [],
  }),
  listHouseholdMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/application/personalization/personalization-context", () => ({
  loadPersonalizationContext: vi.fn().mockResolvedValue({
    hard_constraints: [],
    soft_preferences: [],
    household_notes: [],
    recent_dishes_to_avoid: [],
    skill_and_time: null,
    confidence: 0,
    token_estimate: 0,
    is_empty: true,
  }),
  renderPersonalizationBlock: vi.fn().mockReturnValue(""),
}));

const createPlan = vi.fn().mockResolvedValue({
  id: 99,
  tenant_id: "default",
  user_id: "u1",
});
const bulkInsert = vi.fn().mockResolvedValue([]);
const saveSnapshot = vi.fn().mockResolvedValue(undefined);
const updateMeta = vi.fn().mockResolvedValue(undefined);

vi.mock("@/platform/db/meal-planning", () => ({
  createMealPlan: (...args: unknown[]) => createPlan(...args),
  bulkInsertMealSlots: (...args: unknown[]) => bulkInsert(...args),
  savePantrySnapshot: (...args: unknown[]) => saveSnapshot(...args),
  updateMealPlanMeta: (...args: unknown[]) => updateMeta(...args),
  deleteSlotsForPlan: vi.fn().mockResolvedValue(undefined),
  activateMealPlan: vi.fn(),
}));

import { generateCandidatePlan } from "./generate-candidate-plan";
import { generateMealPlan } from "./meal-planner";

describe("generateMealPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateCandidatePlan).mockResolvedValue({
      slots: mockSlots,
      total_estimated_cost: 700,
    });
  });

  it("succeeds with 14 slots and persists", async () => {
    const result = await generateMealPlan({
      tenant_id: "default",
      user_id: "u1",
      constraints: {
        start_date: "2026-05-27",
        end_date: "2026-06-02",
        meal_pattern: { breakfast: false, lunch: true, dinner: true },
        budget_total_twd: 1500,
      },
    });
    expect(result.plan_id).toBe(99);
    expect(bulkInsert).toHaveBeenCalled();
    expect(saveSnapshot).toHaveBeenCalled();
    expect(result.pantry_reuse_score).toBeGreaterThan(0);
  });

  it("invokes repair when allergy violation on first pass", async () => {
    const badSlot = {
      ...mockSlots[0]!,
      dish_title: "花生豆腐",
      key_ingredients: [
        {
          item_key: "peanut",
          display_name: "花生",
          approx_quantity: null,
          approx_unit: null,
          from_pantry: false,
          urgency: "none" as const,
        },
      ],
    };
    vi.mocked(generateCandidatePlan)
      .mockResolvedValueOnce({ slots: [badSlot, ...mockSlots.slice(1)] })
      .mockResolvedValueOnce({ slots: mockSlots });

    const { getTasteProfile } = await import("@/platform/db/personalization");
    vi.mocked(getTasteProfile).mockResolvedValue({
      allergies: ["花生"],
      dietary_restrictions: [],
      regenerated_dishes: [],
    } as never);

    const result = await generateMealPlan({
      tenant_id: "default",
      user_id: "u1",
      constraints: {
        start_date: "2026-05-27",
        end_date: "2026-06-02",
        meal_pattern: { breakfast: false, lunch: true, dinner: true },
      },
    });
    expect(generateCandidatePlan).toHaveBeenCalledTimes(2);
    expect(result.validation_iterations).toBeGreaterThanOrEqual(1);
  });
});
