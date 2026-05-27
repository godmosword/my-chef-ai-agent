import OpenAI from "openai";
import { resolveModelName } from "@/platform/config/app-config";
import { preferenceExtractionTimeoutMs } from "@/platform/config/preference-extraction-config";
import type { LastRecipeContext } from "@/domain/recipe/last-recipe-context";
import { SIGNAL_TYPES, type PreferenceSignal } from "./preference-extractor-types";

const SYSTEM_PROMPT = `你是一個飲食偏好抽取器。從使用者訊息中找出**確定**的飲食偏好訊號。

只輸出 JSON 陣列，**不要任何解釋**。每個訊號格式：
{"signal_type": "...", "value": "...", "confidence": 0.0–1.0, "evidence": "原文片段"}

signal_type 必須是以下之一：
dislike, allergy, loved_dish, loved_ingredient, spice_pref, sweetness_pref,
saltiness_pref, oil_pref, dietary_restriction, preferred_cuisine,
disliked_cuisine, cooking_skill, cooking_time, household_member_info

規則：
- 模稜兩可的訊號（confidence < 0.6）直接不輸出
- 只抽當下訊息中的明確訊號，不要推測
- evidence 必須是原文片段，方便除錯
- spice_pref 等 0–4 的，value 給整數
- household_member_info 的 value 是 dict：{"name": ..., "age_group": ..., "allergies": [...]}
- 如果沒有任何訊號，回傳 []`;

const llmLastCallByUser = new Map<string, number>();
const LLM_RATE_LIMIT_MS = 30_000;

export function isLlmRateLimited(userId: string): boolean {
  const last = llmLastCallByUser.get(userId);
  if (!last) return false;
  return Date.now() - last < LLM_RATE_LIMIT_MS;
}

function markLlmCall(userId: string): void {
  llmLastCallByUser.set(userId, Date.now());
}

function getClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    maxRetries: 0,
  });
}

function parseSignalsFromJson(raw: string): PreferenceSignal[] {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  const jsonText =
    start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  const parsed = JSON.parse(jsonText) as unknown;
  if (!Array.isArray(parsed)) return [];

  const validTypes = new Set<string>(SIGNAL_TYPES);
  const out: PreferenceSignal[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const signal_type = String(o.signal_type ?? "");
    if (!validTypes.has(signal_type)) continue;
    const confidence = Number(o.confidence);
    if (!Number.isFinite(confidence) || confidence < 0.6) continue;
    const evidence = typeof o.evidence === "string" ? o.evidence : "";
    if (!evidence) continue;
    out.push({
      signal_type: signal_type as PreferenceSignal["signal_type"],
      value: o.value as string | number | Record<string, unknown>,
      confidence,
      evidence,
      member_name:
        typeof o.member_name === "string" ? o.member_name : undefined,
    });
  }
  return out;
}

export async function extractPreferencesViaLlm(
  message: string,
  lastRecipe: LastRecipeContext | null | undefined,
  userId: string,
): Promise<{ signals: PreferenceSignal[]; raw_response: string | null }> {
  if (isLlmRateLimited(userId)) {
    return { signals: [], raw_response: null };
  }

  const client = getClient();
  const model = resolveModelName();
  const timeoutMs = preferenceExtractionTimeoutMs();

  const userContent = lastRecipe?.recipe_name
    ? `上一道菜：${lastRecipe.recipe_name}${lastRecipe.cuisine ? `（${lastRecipe.cuisine}）` : ""}\n使用者訊息：${message}`
    : message;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    markLlmCall(userId);
    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 300,
      },
      { signal: controller.signal },
    );
    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
    try {
      return { signals: parseSignalsFromJson(raw), raw_response: raw };
    } catch {
      return { signals: [], raw_response: raw };
    }
  } catch {
    return { signals: [], raw_response: null };
  } finally {
    clearTimeout(timer);
  }
}

/** Test helper */
export function resetLlmRateLimitForTests(): void {
  llmLastCallByUser.clear();
}
