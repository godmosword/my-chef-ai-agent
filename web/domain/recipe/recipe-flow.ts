import type OpenAI from "openai";
import { DEFAULT_TENANT_ID, MAX_HISTORY_TURNS } from "@/platform/config/app-config";
import { getUserCuisineContext } from "@/platform/db/cuisine";
import {
  getUserMemory,
  saveUserMemory,
  type MemoryMessage,
} from "@/platform/db/memory";
import { getUserPreferences } from "@/platform/db/preferences";
import { consumeQuota } from "@/platform/db/quota";
import { buildPantryUserPrefix } from "@/domain/pantry/prompt";
import {
  buildScenarioPrefix,
  buildScenarioSystemAddendum,
  buildSystemPrompt,
  condenseAssistantMessage,
  filterHistoryAfterContext,
} from "./prompt-helpers";
import { generateRecipe, type RecipePayload } from "./generate-recipe";

import type { QuotaBucket } from "@/platform/db/quota";

export type RecipeFlowResult = {
  recipe: RecipePayload;
  raw: string;
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
};

export async function runRecipeFlow(
  userId: string,
  userMessage: string,
  tenantId: string = DEFAULT_TENANT_ID,
  _options?: RecipeFlowOptions,
): Promise<RecipeFlowResult> {
  const quota = await consumeQuota(
    userId,
    tenantId,
    1,
    "text_recipe_generation",
    "text",
  );
  if (!quota.allowed) {
    throw new QuotaExceededError(quota);
  }

  const scenarioPrefix = buildScenarioPrefix(userMessage);
  const pantryPrefix = buildPantryUserPrefix(_options?.pantryItems ?? []);
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
  const systemPrompt = buildSystemPrompt(
    prefs,
    cuisineCtx.active_cuisine,
    scenarioAddendum,
  );

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

  return {
    recipe,
    raw,
    quota: {
      plan_key: quota.plan_key,
      limit: quota.limit,
      used: quota.used,
      remaining: quota.remaining,
      text: quota.text,
      image: quota.image,
    },
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
