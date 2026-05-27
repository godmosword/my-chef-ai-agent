import { imageIntentClassifierTimeoutSec } from "@/platform/config/pantry-vision-config";
import {
  callGeminiVisionJson,
  extractJsonObject,
} from "./gemini-vision-client";

export type ImageIntent =
  | "food_for_recipe"
  | "fridge_contents"
  | "receipt"
  | "other";

const CLASSIFIER_PROMPT = `判斷照片類型，回 JSON：
{"intent": "...", "confidence": 0.0-1.0}

intent 必須是以下之一：
- food_for_recipe: 食材特寫、桌上幾樣食材、想用來做菜的食材
- fridge_contents: 打開的冰箱、冰箱內部、貨架上很多品項
- receipt: 收據、發票、購物明細
- other: 其他

範例：
- 番茄特寫 → food_for_recipe
- 打開的冰箱有很多瓶瓶罐罐 → fridge_contents
- 全聯紙本收據 → receipt`;

export async function classifyImageIntent(
  imageBytes: Buffer,
  mimeType: string,
): Promise<[ImageIntent, number]> {
  try {
    const raw = await callGeminiVisionJson({
      systemPrompt: "你是圖片分類器。只回 JSON，不要其他文字。",
      userPrompt: CLASSIFIER_PROMPT,
      imageBytes,
      mimeType,
      maxTokens: 60,
      temperature: 0,
      timeoutMs: imageIntentClassifierTimeoutSec() * 1000,
    });
    const parsed = extractJsonObject(raw) as {
      intent?: string;
      confidence?: number;
    };
    const intent = parsed.intent as ImageIntent;
    const confidence = Number(parsed.confidence);
    const valid: ImageIntent[] = [
      "food_for_recipe",
      "fridge_contents",
      "receipt",
      "other",
    ];
    if (!valid.includes(intent) || !Number.isFinite(confidence)) {
      return ["other", 0];
    }
    return [intent, Math.min(1, Math.max(0, confidence))];
  } catch {
    return ["other", 0];
  }
}
