import type { PersonalizationBlock } from "./personalization-context";

export type AppliedPersonalization = {
  hard_constraints_applied: string[];
  soft_preferences_applied: string[];
  household_considered: string[];
};

export function emptyAppliedPersonalization(): AppliedPersonalization {
  return {
    hard_constraints_applied: [],
    soft_preferences_applied: [],
    household_considered: [],
  };
}

function toUserFacingHard(line: string): string {
  if (line.startsWith("不可含") && line.includes("過敏")) {
    const m = line.match(/不可含(.+?)（(.+?) 過敏）/);
    if (m) return `你對${m[1]}過敏 → 已避開`;
    const m2 = line.match(/不可含(.+?)（過敏）/);
    if (m2) return `你對${m2[1]}過敏 → 已避開`;
  }
  if (line.startsWith("需")) return `${line} → 已納入`;
  if (line.includes("糖尿病") || line.includes("高血壓") || line.includes("痛風")) {
    return `${line} → 已納入`;
  }
  return `${line} → 已考慮`;
}

function toUserFacingSoft(line: string): string {
  if (line.startsWith("完全不吃辣")) return "你偏好不吃辣";
  if (line.startsWith("偏好微辣")) return "你偏好微辣 → 用較低辣度";
  if (line.startsWith("偏辣") || line.startsWith("嗜辣")) return `${line} → 已調整辣度`;
  if (line.startsWith("不喜歡 ")) return `${line} → 已避開`;
  if (line.startsWith("偏好食材")) return `${line} → 已優先`;
  if (line.startsWith("偏好菜系")) return `${line} → 已偏向`;
  if (line.startsWith("避免菜系")) return `${line} → 已避開`;
  return line;
}

/** Deterministic summary from injected block — no LLM. */
export function buildAppliedPersonalization(
  block: PersonalizationBlock,
): AppliedPersonalization {
  if (block.is_empty) return emptyAppliedPersonalization();

  return {
    hard_constraints_applied: block.hard_constraints.map(toUserFacingHard),
    soft_preferences_applied: block.soft_preferences.map(toUserFacingSoft),
    household_considered: block.household_notes.map((n) => `${n} → 已考慮`),
  };
}

export function appliedPersonalizationIsEmpty(
  applied: AppliedPersonalization,
): boolean {
  return (
    applied.hard_constraints_applied.length === 0 &&
    applied.soft_preferences_applied.length === 0 &&
    applied.household_considered.length === 0
  );
}
