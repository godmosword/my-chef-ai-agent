import type { RecipePayload } from "./generate-recipe";
import { SYSTEM_PROMPT } from "./prompts";

const SCENARIO_CLEAR_FRIDGE = ["清冰箱", "冰箱", "剩食"];
const SCENARIO_KIDS = ["小孩", "兒童", "兒子"];
const SCENARIO_BUDGET = ["預算", "便宜", "省錢", "方案"];
const SCENARIO_MOOD = ["心情", "壓力", "開心", "難過"];

const SCENARIO_RULES: Array<[string[], string]> = [
  [
    SCENARIO_CLEAR_FRIDGE,
    "清冰箱模式：優先使用現有食材，減少額外採買，步驟務實可執行。",
  ],
  [
    SCENARIO_KIDS,
    "四歲兒童餐：溫和不辣、好咀嚼、營養均衡。",
  ],
  [
    SCENARIO_BUDGET,
    "預算方案：行政主廚需討論 CP 值，食材總管嚴格控管 NT$ 預算。",
  ],
  [
    SCENARIO_MOOD,
    "心情點餐：副主廚需根據情緒推薦溫暖或清爽的口感，提供情緒支持。",
  ],
];

const LABELED_SCENARIOS: Array<[string, string[], string]> = [
  ["清冰箱", SCENARIO_CLEAR_FRIDGE, SCENARIO_RULES[0][1]],
  ["兒童餐", SCENARIO_KIDS, SCENARIO_RULES[1][1]],
  ["預算方案", SCENARIO_BUDGET, SCENARIO_RULES[2][1]],
  ["心情點餐", SCENARIO_MOOD, SCENARIO_RULES[3][1]],
];

export function buildScenarioPrefix(text: string): string {
  const parts: string[] = [];
  for (const [label, keys, instruction] of LABELED_SCENARIOS) {
    if (keys.some((k) => text.includes(k))) {
      parts.push(`【${label}模式】${instruction}`);
    }
  }
  return parts.length ? `${parts.join("\n\n")}\n\n` : "";
}

export function buildSystemPrompt(
  prefs: string | null,
  currentCuisine: string | null,
): string {
  let base = SYSTEM_PROMPT;
  base +=
    "\n若涉及「預算方案」，請在 kitchen_talk 中討論 CP 值與採買策略，並嚴格控制 estimated_total_cost。";
  base +=
    "\n若涉及「心情點餐」，請副主廚針對該心情提供具情緒價值與儀式感的料理建議。";
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
  if (!content || content.length <= maxChars) return content;
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(content.slice(start, end + 1)) as RecipePayload;
      if (parsed.recipe_name) return `【上次食譜】${parsed.recipe_name}`;
    }
  } catch {
    /* ignore */
  }
  return `${content.slice(0, maxChars - 2)}…`;
}

export function filterHistoryAfterContext<T extends { timestamp?: string }>(
  history: T[],
  contextUpdatedAt: string | null,
): T[] {
  if (!contextUpdatedAt) return history;
  return history.filter((m) => (m.timestamp || "") > contextUpdatedAt);
}
