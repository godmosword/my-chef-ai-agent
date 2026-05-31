import type { AiRecipePayload } from "./ai-recipe-payload";
import { SYSTEM_PROMPT } from "./prompts";

const SCENARIO_HINTS = [
  {
    label: "清冰箱",
    keys: ["清冰箱", "冰箱", "剩食"],
    instruction: "用現有食材、少採買",
  },
  {
    label: "兒童餐",
    keys: ["小孩", "兒童", "兒子"],
    instruction: "溫和不辣、好咀嚼",
  },
  {
    label: "預算方案",
    keys: ["預算", "便宜", "省錢", "方案"],
    instruction: "重 CP 值並控制 NT$",
  },
  {
    label: "心情點餐",
    keys: ["心情", "壓力", "開心", "難過"],
    instruction: "提供情緒支持與儀式感",
  },
];

function scenarioHints(text: string): typeof SCENARIO_HINTS {
  return SCENARIO_HINTS.filter((hint) =>
    hint.keys.some((keyword) => text.includes(keyword)),
  );
}

export function buildScenarioPrefix(text: string): string {
  const labels = scenarioHints(text).map((hint) => hint.label);
  return labels.length ? `情境：${labels.join("、")}。\n\n` : "";
}

export function buildScenarioSystemAddendum(text: string): string {
  const rules = scenarioHints(text).map(
    (hint) => `${hint.label}=${hint.instruction}`,
  );
  return rules.length ? `情境規則：${rules.join("；")}。` : "";
}

export function buildSystemPrompt(
  prefs: string | null,
  currentCuisine: string | null,
  scenarioAddendum = "",
): string {
  let base = SYSTEM_PROMPT;
  if (scenarioAddendum) base += `\n${scenarioAddendum}`;
  base += "\n步驟請保持精簡：steps 最多 6 步，每步儘量不超過 24 字。";
  if (prefs) {
    base += `\n【家庭飲食限制】${prefs}。`;
    base +=
      "\n主要食材、調味料、醬料、裝飾與替代建議皆不可包含上述需避開項目。";
  }
  if (currentCuisine && currentCuisine !== "不拘") {
    base += `\n料理情境：${currentCuisine}。聚焦此風格。`;
  }
  return base;
}

export function condenseAssistantMessage(content: string, maxChars = 80): string {
  if (!content) return content;
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(content.slice(start, end + 1)) as AiRecipePayload;
      if (parsed.recipe_name) return `【上次食譜】${parsed.recipe_name}`;
    }
  } catch {
    /* ignore */
  }
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars - 2)}…`;
}

export function filterHistoryAfterContext<T extends { timestamp?: string }>(
  history: T[],
  contextUpdatedAt: string | null,
): T[] {
  if (!contextUpdatedAt) return history;
  return history.filter((m) => (m.timestamp || "") > contextUpdatedAt);
}
