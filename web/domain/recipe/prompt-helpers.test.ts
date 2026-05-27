import { describe, expect, it } from "vitest";
import {
  buildScenarioPrefix,
  buildSystemPrompt,
  condenseAssistantMessage,
} from "./prompt-helpers";

describe("prompt helpers", () => {
  it("keeps the base system prompt free of scenario-only rules", () => {
    const prompt = buildSystemPrompt(null, null);

    expect(prompt).not.toContain("預算方案");
    expect(prompt).not.toContain("心情點餐");
  });

  it("uses compact scenario labels in the user prefix", () => {
    expect(buildScenarioPrefix("冰箱有雞腿，給小孩吃，預算100")).toBe(
      "情境：清冰箱、兒童餐、預算方案。\n\n",
    );
  });

  it("condenses saved assistant recipe JSON to a memory marker", () => {
    const raw = JSON.stringify({ recipe_name: "番茄炒蛋", steps: ["打蛋"] });

    expect(condenseAssistantMessage(raw)).toBe("【上次食譜】番茄炒蛋");
  });
});
