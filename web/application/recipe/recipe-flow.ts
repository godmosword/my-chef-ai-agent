import type OpenAI from "openai";
import {
  buildAppliedPersonalization,
  type AppliedPersonalization,
} from "@/application/personalization/applied-personalization";
import { loadPersonalizationContext } from "@/application/personalization/personalization-context";
import { showAppliedPersonalization } from "@/platform/config/personalization-ui-config";
import { assembleRecipeSystemPrompt } from "@/application/recipe/assemble-system-prompt";
import { buildCleanFridgeSystemBlock } from "@/domain/pantry/clean-fridge-prompt";
import { buildPantryUserPrefix } from "@/domain/pantry/prompt";
import {
  buildScenarioPrefix,
  buildScenarioSystemAddendum,
  condenseAssistantMessage,
  filterHistoryAfterContext,
} from "@/domain/recipe/prompt-helpers";
import {
  generateRecipe,
  type AiRecipePayload,
} from "@/domain/recipe/generate-recipe";
import { DEFAULT_TENANT_ID, MAX_HISTORY_TURNS } from "@/platform/config/app-config";
import { getUserCuisineContext } from "@/platform/db/cuisine";
import {
  getUserMemory,
  saveUserMemory,
  type MemoryMessage,
} from "@/platform/db/memory";
import { getUserPreferences } from "@/platform/db/preferences";
import {
  checkQuota,
  consumeQuota,
  quotaDecisionToBuckets,
  type QuotaBucket,
} from "@/platform/db/quota";
import { recordPersonalizationInject } from "@/platform/observability/personalization-metrics";

export type RecipeFlowResult = {
  recipe: AiRecipePayload;
  raw: string;
  applied_personalization?: AppliedPersonalization;
  quota: {
    plan_key: string;
    limit: number;
    used: number;
    remaining: number;
    text: QuotaBucket;
    image: QuotaBucket;
  };
};

export type RecipeFlowOptions = {
  deepResearch?: boolean;
  pantryItems?: string[];
  /** PT-3: full clean-fridge lines for system prompt block */
  cleanFridgeItems?: string[];
  cleanFridgeMode?: boolean;
  /** Metrics label for inject counter (default text). */
  injectionPath?: "text" | "image" | "random" | "cuisine_switch";
};

export async function runRecipeFlow(
  userId: string,
  userMessage: string,
  tenantId: string = DEFAULT_TENANT_ID,
  options?: RecipeFlowOptions,
): Promise<RecipeFlowResult> {
  const preQuota = await checkQuota(userId, tenantId, "text");
  if (!preQuota.allowed) {
    throw new QuotaExceededError(quotaDecisionToBuckets(preQuota));
  }

  const scenarioPrefix = buildScenarioPrefix(userMessage);
  const useCleanFridgeBlock =
    Boolean(options?.cleanFridgeMode) &&
    (options?.cleanFridgeItems?.length ?? 0) > 0;
  const pantryPrefix = useCleanFridgeBlock
    ? ""
    : buildPantryUserPrefix(options?.pantryItems ?? []);
  const cleanFridgeBlock = useCleanFridgeBlock
    ? buildCleanFridgeSystemBlock(options!.cleanFridgeItems!)
    : null;
  const scenarioAddendum = buildScenarioSystemAddendum(userMessage);
  const effectiveMessage = `${pantryPrefix}${scenarioPrefix}${userMessage}`;

  const [fullHistory, prefs, cuisineCtx] = await Promise.all([
    getUserMemory(userId, tenantId),
    getUserPreferences(userId, tenantId),
    getUserCuisineContext(userId, tenantId),
  ]);

  const filtered = filterHistoryAfterContext(
    fullHistory,
    cuisineCtx.context_updated_at,
  );

  const personalizationBlock = await loadPersonalizationContext(
    tenantId,
    userId,
  );
  if (!personalizationBlock.is_empty) {
    recordPersonalizationInject(
      options?.injectionPath ?? "text",
      personalizationBlock.token_estimate,
      personalizationBlock.hard_constraints.length,
    );
  }

  const deepResearchSummary = options?.deepResearch
    ? "【深度研究】請在符合使用者限制的前提下，盡量引用常見做法與食材搭配。"
    : null;

  const systemPrompt = assembleRecipeSystemPrompt({
    prefs,
    currentCuisine: cuisineCtx.active_cuisine,
    scenarioAddendum,
    cleanFridgeBlock,
    personalizationBlock,
    deepResearchSummary,
  });

  const nowIso = new Date().toISOString();
  let history: MemoryMessage[] = [...filtered];
  if (!history.length) {
    history = [{ role: "system", content: systemPrompt }];
  } else if (history[0]?.role === "system") {
    history[0] = { role: "system", content: systemPrompt };
  } else {
    history = [{ role: "system", content: systemPrompt }, ...history];
  }

  history.push({
    role: "user",
    content: effectiveMessage,
    timestamp: nowIso,
  });

  if (history.length > MAX_HISTORY_TURNS + 1) {
    history = [history[0], ...history.slice(-MAX_HISTORY_TURNS)];
  }

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = history.map(
    (m) => ({
      role: m.role as "system" | "user" | "assistant",
      content:
        m.role === "assistant"
          ? condenseAssistantMessage(m.content)
          : m.content,
    }),
  );

  const { raw, recipe } = await generateRecipe(apiMessages, userId);

  const charged = await consumeQuota(
    userId,
    tenantId,
    1,
    "text_recipe_generation",
    "text",
  );
  if (!charged.allowed) {
    throw new QuotaExceededError(quotaDecisionToBuckets(charged));
  }

  const toSave: MemoryMessage[] = [
    ...fullHistory,
    { role: "user", content: effectiveMessage, timestamp: nowIso },
    {
      role: "assistant",
      content: condenseAssistantMessage(raw),
      timestamp: nowIso,
    },
  ];
  let trimmed = toSave;
  if (trimmed.length > MAX_HISTORY_TURNS + 1) {
    trimmed = [trimmed[0], ...trimmed.slice(-MAX_HISTORY_TURNS)];
  }
  await saveUserMemory(userId, tenantId, trimmed);

  const applied_personalization = showAppliedPersonalization()
    ? buildAppliedPersonalization(personalizationBlock)
    : undefined;

  return {
    recipe,
    raw,
    applied_personalization,
    quota: quotaDecisionToBuckets(charged),
  };
}

export class QuotaExceededError extends Error {
  readonly quota: RecipeFlowResult["quota"];

  constructor(quota: RecipeFlowResult["quota"]) {
    super("Daily quota exceeded");
    this.name = "QuotaExceededError";
    this.quota = quota;
  }
}
