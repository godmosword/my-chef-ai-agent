import OpenAI from "openai";
import { resolveModelName } from "@/lib/config";
import {
  AI_RETRY_EXTRA_PROMPT,
  AI_TRUNCATION_RECOVERY_PROMPT,
} from "./prompts";

function formatAiError(err: unknown, model: string): Error {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 404) {
      return new Error(
        `AI 模型「${model}」不存在或無法使用，請在 Vercel 將 MODEL_NAME 設為 gemini-3.1-flash-lite-preview（或有效 Gemini 模型）。`,
      );
    }
    if (err.status === 401 || err.status === 403) {
      return new Error("GEMINI_API_KEY 無效或未設定，請檢查 Vercel 環境變數。");
    }
    if (err.status === 400) {
      return new Error(
        "Gemini 拒絕請求（400）。請確認 API 金鑰有效、MODEL_NAME 正確，且已啟用 Generative Language API。",
      );
    }
    return new Error(
      `AI 服務錯誤（HTTP ${err.status}）${err.message ? `：${err.message}` : ""}`,
    );
  }
  if (err instanceof Error) return err;
  return new Error(String(err));
}

export type KitchenTalk = { role: string; content: string };
export type Ingredient = { name: string; price?: string };

export type RecipePayload = {
  kitchen_talk?: KitchenTalk[];
  theme?: string;
  recipe_name?: string;
  ingredients?: Ingredient[];
  steps?: string[];
  shopping_list?: string[];
  estimated_total_cost?: string;
};

function getClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    maxRetries: 1,
  });
}

function parseRecipeJson(raw: string): RecipePayload {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("No JSON object in model output");
  }
  const parsed = JSON.parse(trimmed.slice(start, end + 1)) as RecipePayload;
  if (!parsed.recipe_name) {
    throw new Error("Missing recipe_name in JSON");
  }
  return parsed;
}

export async function generateRecipe(
  apiMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  userId: string,
): Promise<{ raw: string; recipe: RecipePayload }> {
  const model = resolveModelName();
  const maxTokens = Math.max(
    512,
    parseInt(process.env.MAX_COMPLETION_TOKENS || "1024", 10) || 1024,
  );
  const maxRetries = 1;
  const client = getClient();

  const baseMessages = apiMessages;

  const extraUser: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  let lastRaw = "";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const messages = [...baseMessages, ...extraUser];
    if (attempt > 0) {
      messages.push({ role: "user", content: AI_RETRY_EXTRA_PROMPT });
    }

    let response: OpenAI.Chat.ChatCompletion;
    try {
      response = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      });
    } catch (err) {
      throw formatAiError(err, model);
    }

    const choice = response.choices[0];
    const content = choice?.message?.content?.trim() || "";
    lastRaw = content;
    const finish = (choice?.finish_reason || "").toLowerCase();

    try {
      const recipe = parseRecipeJson(content);
      return { raw: content, recipe };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (finish === "length" && attempt < maxRetries) {
        extraUser.push({ role: "user", content: AI_TRUNCATION_RECOVERY_PROMPT });
        continue;
      }
    }
  }

  throw (
    lastError ??
    new Error(`無法解析 AI 回傳的食譜 JSON（user=${userId}）`)
  );
}
