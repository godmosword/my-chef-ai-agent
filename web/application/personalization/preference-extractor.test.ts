import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractAndPersist,
  extractSignals,
  persistSignals,
} from "./preference-extractor";
import {
  ruleBasedExtract,
} from "./preference-extractor-rules";
import * as llm from "./extract-preferences-llm";
import * as personalization from "@/platform/db/personalization";

vi.mock("./extract-preferences-llm", () => ({
  extractPreferencesViaLlm: vi.fn(),
  isLlmRateLimited: vi.fn(() => false),
  resetLlmRateLimitForTests: vi.fn(),
}));

vi.mock("@/platform/config/preference-extraction-config", () => ({
  isPreferenceExtractionEnabled: vi.fn(() => true),
  isPreferenceExtractionLlmTierEnabled: vi.fn(() => true),
  preferenceConfidenceThreshold: vi.fn(() => 0.7),
  preferenceExtractionTimeoutMs: vi.fn(() => 8000),
}));

describe("ruleBasedExtract", () => {
  it('"我不吃香菜" → dislike ≥ 0.8', () => {
    const signals = ruleBasedExtract("我不吃香菜", null, null);
    expect(signals.some((s) => s.signal_type === "dislike" && s.value === "香菜")).toBe(
      true,
    );
    const dislike = signals.find((s) => s.signal_type === "dislike");
    expect(dislike?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('"對花生過敏" → allergy ≥ 0.9', () => {
    const signals = ruleBasedExtract("我對花生過敏", null, null);
    const allergy = signals.find((s) => s.signal_type === "allergy");
    expect(allergy?.value).toBe("花生");
    expect(allergy?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('"太辣" with last_recipe and spice_tolerance=3 → spice_pref=2', () => {
    const signals = ruleBasedExtract(
      "太辣了",
      { recipe_name: "麻婆豆腐", generated_at: new Date().toISOString() },
      {
        tenant_id: "default",
        user_id: "u1",
        spice_tolerance: 3,
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
        confidence_score: 0,
        created_at: "",
        updated_at: "",
      },
    );
    const spice = signals.find((s) => s.signal_type === "spice_pref");
    expect(spice?.value).toBe(2);
  });

  it('"太辣" without last_recipe → no spice signal', () => {
    const signals = ruleBasedExtract("太辣", null, null);
    expect(signals.some((s) => s.signal_type === "spice_pref")).toBe(false);
  });

  it('"我女兒五歲" → household_member_info child', () => {
    const signals = ruleBasedExtract("我女兒五歲", null, null);
    const hh = signals.find((s) => s.signal_type === "household_member_info");
    expect(hh).toBeDefined();
    const value = hh?.value as Record<string, unknown>;
    expect(value.age_group).toBe("child");
  });
});

describe("extractSignals LLM tier", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mock LLM [] for "今天天氣真好"', async () => {
    vi.mocked(llm.extractPreferencesViaLlm).mockResolvedValue({
      signals: [],
      raw_response: "[]",
    });
    const result = await extractSignals("今天天氣真好，想出去走走", null, {
      userId: "u-llm-1",
      tenantId: "default",
    });
    expect(result.signals).toHaveLength(0);
  });

  it("malformed JSON from LLM → no raise", async () => {
    vi.mocked(llm.extractPreferencesViaLlm).mockResolvedValue({
      signals: [],
      raw_response: "not-json",
    });
    await expect(
      extractSignals("我女兒五歲，對花生過敏，不喜歡香菜", null, {
        userId: "u-llm-2",
        tenantId: "default",
      }),
    ).resolves.toBeDefined();
  });
});

describe("persistSignals", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips confidence 0.5 at threshold 0.7", async () => {
    const addDislike = vi
      .spyOn(personalization, "addDislike")
      .mockResolvedValue(undefined);
    const result = await persistSignals(
      [
        {
          signal_type: "dislike",
          value: "芹菜",
          confidence: 0.5,
          evidence: "不吃芹菜",
        },
      ],
      "default",
      "u1",
      0.7,
    );
    expect(result.written).toBe(0);
    expect(result.skipped_low_confidence).toBe(1);
    expect(addDislike).not.toHaveBeenCalled();
  });

  it("writes 3 valid signals", async () => {
    const addDislike = vi
      .spyOn(personalization, "addDislike")
      .mockResolvedValue(undefined);
    const addAllergy = vi
      .spyOn(personalization, "addAllergy")
      .mockResolvedValue(undefined);
    const addLoved = vi
      .spyOn(personalization, "addLovedDish")
      .mockResolvedValue(undefined);

    const result = await persistSignals(
      [
        {
          signal_type: "dislike",
          value: "香菜",
          confidence: 0.9,
          evidence: "不吃香菜",
        },
        {
          signal_type: "allergy",
          value: "蝦",
          confidence: 0.95,
          evidence: "對蝦過敏",
        },
        {
          signal_type: "loved_dish",
          value: "滷肉飯",
          confidence: 0.85,
          evidence: "喜歡滷肉飯",
        },
      ],
      "default",
      "u1",
      0.7,
    );
    expect(result.written).toBe(3);
    expect(addDislike).toHaveBeenCalledOnce();
    expect(addAllergy).toHaveBeenCalledOnce();
    expect(addLoved).toHaveBeenCalledOnce();
  });

  it("member_name without match falls back to profile", async () => {
    vi.spyOn(personalization, "listHouseholdMembers").mockResolvedValue([]);
    const addAllergy = vi
      .spyOn(personalization, "addAllergy")
      .mockResolvedValue(undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await persistSignals(
      [
        {
          signal_type: "allergy",
          value: "蝦",
          confidence: 0.9,
          evidence: "小明對蝦過敏",
          member_name: "小明",
        },
      ],
      "default",
      "u1",
      0.7,
    );

    expect(warn).toHaveBeenCalled();
    expect(addAllergy).toHaveBeenCalledWith("default", "u1", "蝦");
  });
});

describe("handleRegenerateFeedback", () => {
  it("calls add_regenerated_dish", async () => {
    const { handleRegenerateFeedback } = await import("./preference-feedback");
    const addRegenerated = vi
      .spyOn(personalization, "addRegeneratedDish")
      .mockResolvedValue(undefined);
    await handleRegenerateFeedback("default", "u1", "番茄炒蛋", "台式");
    expect(addRegenerated).toHaveBeenCalledWith(
      "default",
      "u1",
      "番茄炒蛋",
      "台式",
    );
  });
});

describe("feature flag off", () => {
  it("extract_and_persist returns zeros without DB calls", async () => {
    const config = await import("@/platform/config/preference-extraction-config");
    vi.mocked(config.isPreferenceExtractionEnabled).mockReturnValue(false);
    const persistSpy = vi.spyOn(personalization, "addDislike");

    const result = await extractAndPersist("我不吃香菜", "default", "u-off");
    expect(result.written).toBe(0);
    expect(persistSpy).not.toHaveBeenCalled();
  });
});

describe("tenant isolation", () => {
  it("persist calls use provided tenant_id", async () => {
    vi.spyOn(personalization, "listHouseholdMembers").mockResolvedValue([]);
    const addDislike = vi
      .spyOn(personalization, "addDislike")
      .mockResolvedValue(undefined);

    await persistSignals(
      [
        {
          signal_type: "dislike",
          value: "苦瓜",
          confidence: 0.9,
          evidence: "不吃苦瓜",
        },
      ],
      "tenant-b",
      "user-b",
      0.7,
    );

    expect(addDislike).toHaveBeenCalledWith("tenant-b", "user-b", "苦瓜");
  });
});
