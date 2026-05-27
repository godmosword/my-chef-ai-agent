import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTokenBudget,
  buildPersonalizationBlock,
  emptyPersonalizationBlock,
  loadPersonalizationContext,
  renderPersonalizationBlock,
} from "./personalization-context";
import type { HouseholdMember, TasteProfile } from "@/platform/db/personalization";
import * as personalization from "@/platform/db/personalization";
import * as injectionConfig from "@/platform/config/personalization-injection-config";

function baseProfile(overrides: Partial<TasteProfile> = {}): TasteProfile {
  return {
    tenant_id: "default",
    user_id: "u1",
    spice_tolerance: null,
    sweetness_preference: null,
    saltiness_preference: null,
    oil_preference: null,
    allergies: [],
    dislikes: [],
    loved_ingredients: [],
    loved_dishes: [],
    regenerated_dishes: [],
    dietary_restrictions: [],
    preferred_cuisines: [],
    disliked_cuisines: [],
    cooking_skill_level: null,
    typical_cooking_time_min: null,
    notes: null,
    confidence_score: 0.5,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("PersonalizationBlock", () => {
  it("empty profile → is_empty and render ''", () => {
    const block = buildPersonalizationBlock(null, []);
    expect(block.is_empty).toBe(true);
    expect(renderPersonalizationBlock(block)).toBe("");
  });

  it("peanut allergy in hard_constraints and render", () => {
    const block = buildPersonalizationBlock(
      baseProfile({ allergies: ["花生"] }),
      [],
    );
    expect(block.hard_constraints).toContain("不可含花生（過敏）");
    expect(renderPersonalizationBlock(block)).toContain("不可含花生（過敏）");
  });

  it("child household note with derived constraints", () => {
    const members: HouseholdMember[] = [
      {
        id: 1,
        tenant_id: "default",
        user_id: "u1",
        name: "女兒",
        relation: "child",
        age_group: "child",
        dietary_restrictions: [],
        allergies: [],
        dislikes: [],
        medical_conditions: [],
        texture_needs: [],
        notes: null,
        created_at: "",
        updated_at: "",
      },
    ];
    const block = buildPersonalizationBlock(null, members);
    expect(block.household_notes.some((n) => n.includes("女兒"))).toBe(true);
    expect(block.household_notes.some((n) => n.includes("不辣"))).toBe(true);
  });

  it("household diabetes → hard constraint phrase", () => {
    const members: HouseholdMember[] = [
      {
        id: 1,
        tenant_id: "default",
        user_id: "u1",
        name: "爸爸",
        relation: "parent",
        age_group: "adult",
        dietary_restrictions: [],
        allergies: [],
        dislikes: [],
        medical_conditions: ["diabetes"],
        texture_needs: [],
        notes: null,
        created_at: "",
        updated_at: "",
      },
    ];
    const block = buildPersonalizationBlock(null, members);
    expect(block.hard_constraints).toContain(
      "家中有糖尿病患，避免高糖高 GI 食材",
    );
  });

  it("token budget drops P3 before P0", () => {
    const block = buildPersonalizationBlock(
      baseProfile({
        allergies: ["花生"],
        dislikes: ["香菜", "芹菜", "苦瓜", "茄子", "青椒"],
        regenerated_dishes: Array.from({ length: 12 }, (_, i) => ({
          name: `菜${i}`,
          cuisine: null,
          regenerated_at: new Date().toISOString(),
        })),
        cooking_skill_level: 1,
        typical_cooking_time_min: 30,
      }),
      [],
      120,
    );
    expect(block.hard_constraints.length).toBeGreaterThan(0);
    expect(block.recent_dishes_to_avoid.length).toBe(0);
    expect(block.skill_and_time).toBeNull();
  });

  it("extreme budget still keeps all hard constraints", () => {
    const allergies = Array.from({ length: 10 }, (_, i) => `過敏物${i}`);
    const block = buildPersonalizationBlock(
      baseProfile({ allergies }),
      [],
      50,
    );
    expect(block.hard_constraints.length).toBe(10);
  });

  it("carries confidence from profile", () => {
    const block = buildPersonalizationBlock(
      baseProfile({ confidence_score: 0.77 }),
      [],
    );
    expect(block.confidence).toBe(0.77);
  });

  it("regenerated_dishes uses last 10 then caps render at 8", () => {
    const dishes = Array.from({ length: 15 }, (_, i) => ({
      name: `菜${i}`,
      cuisine: null,
      regenerated_at: new Date().toISOString(),
    }));
    const block = buildPersonalizationBlock(
      baseProfile({ regenerated_dishes: dishes }),
      [],
    );
    expect(block.recent_dishes_to_avoid.length).toBeLessThanOrEqual(8);
    expect(block.recent_dishes_to_avoid[0]).toBe("菜7");
  });
});

describe("loadPersonalizationContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("timeout → empty block, no throw", async () => {
    vi.spyOn(personalization, "getTasteProfile").mockImplementation(
      () => new Promise(() => {}),
    );
    vi.spyOn(personalization, "listHouseholdMembers").mockResolvedValue([]);
    const block = await loadPersonalizationContext("default", "u1", {
      timeout_sec: 0.01,
    });
    expect(block.is_empty).toBe(true);
  });

  it("DB error → empty block", async () => {
    vi.spyOn(personalization, "getTasteProfile").mockRejectedValue(
      new Error("db down"),
    );
    vi.spyOn(personalization, "listHouseholdMembers").mockRejectedValue(
      new Error("db down"),
    );
    const block = await loadPersonalizationContext("default", "u1");
    expect(block).toEqual(emptyPersonalizationBlock());
  });

  it("feature flag off → empty, no DB", async () => {
    vi.spyOn(injectionConfig, "isPersonalizationInjectionEnabled").mockReturnValue(
      false,
    );
    const getSpy = vi.spyOn(personalization, "getTasteProfile");
    const block = await loadPersonalizationContext("default", "u1");
    expect(block.is_empty).toBe(true);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("tenant isolation via DB call args", async () => {
    vi.spyOn(injectionConfig, "isPersonalizationInjectionEnabled").mockReturnValue(
      true,
    );
    const getSpy = vi
      .spyOn(personalization, "getTasteProfile")
      .mockResolvedValue(null);
    vi.spyOn(personalization, "listHouseholdMembers").mockResolvedValue([]);
    await loadPersonalizationContext("tenant-x", "user-a");
    expect(getSpy).toHaveBeenCalledWith("tenant-x", "user-a");
  });
});
