import { describe, expect, it } from "vitest";
import {
  buildAppliedPersonalization,
  appliedPersonalizationIsEmpty,
} from "./applied-personalization";
import type { PersonalizationBlock } from "./personalization-context";

describe("buildAppliedPersonalization", () => {
  const block: PersonalizationBlock = {
    hard_constraints: ["不可含花生（過敏）"],
    soft_preferences: ["偏好微辣"],
    household_notes: ["家中有 女兒（兒童），需 不辣、軟食、小份量"],
    recent_dishes_to_avoid: [],
    skill_and_time: null,
    confidence: 0.8,
    token_estimate: 100,
    is_empty: false,
  };

  it("maps hard and soft deterministically", () => {
    const a = buildAppliedPersonalization(block);
    const b = buildAppliedPersonalization(block);
    expect(a).toEqual(b);
    expect(a.hard_constraints_applied.some((x) => x.includes("花生"))).toBe(true);
    expect(a.soft_preferences_applied.length).toBeGreaterThan(0);
    expect(a.household_considered.length).toBe(1);
  });

  it("empty block → empty applied", () => {
    const empty = buildAppliedPersonalization({
      ...block,
      is_empty: true,
      hard_constraints: [],
      soft_preferences: [],
      household_notes: [],
    });
    expect(appliedPersonalizationIsEmpty(empty)).toBe(true);
  });
});
