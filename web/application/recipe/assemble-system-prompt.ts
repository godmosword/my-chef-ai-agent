import type { PersonalizationBlock } from "@/application/personalization/personalization-context";
import { renderPersonalizationBlock } from "@/application/personalization/personalization-context";
import { SYSTEM_PROMPT } from "@/domain/recipe/prompts";

/** base → personalization → deep research (PM-3 ordering). */
export function assembleRecipeSystemPrompt(options: {
  prefs: string | null;
  currentCuisine: string | null;
  scenarioAddendum?: string;
  personalizationBlock?: PersonalizationBlock | null;
  deepResearchSummary?: string | null;
}): string {
  let base = SYSTEM_PROMPT;
  if (options.scenarioAddendum) base += `\n${options.scenarioAddendum}`;
  base += "\n步驟請保持精簡：steps 最多 6 步，每步儘量不超過 24 字。";
  if (options.prefs) {
    base += `\n【家庭飲食限制】${options.prefs}。`;
    base +=
      "\n主要食材、調味料、醬料、裝飾與替代建議皆不可包含上述需避開項目。";
  }
  if (options.currentCuisine && options.currentCuisine !== "不拘") {
    base += `\n料理情境：${options.currentCuisine}。聚焦此風格。`;
  }

  const parts = [base];
  const personalizationText = options.personalizationBlock
    ? renderPersonalizationBlock(options.personalizationBlock)
    : "";
  if (personalizationText) parts.push(personalizationText);
  if (options.deepResearchSummary?.trim()) {
    parts.push(options.deepResearchSummary.trim());
  }
  return parts.join("\n\n");
}
