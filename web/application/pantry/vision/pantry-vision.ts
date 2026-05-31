import { aiVisionTimeoutSec } from "@/platform/config/pantry-vision-config";
import {
  callGeminiVisionJson,
  extractJsonObject,
} from "./gemini-vision-client";

type FridgeRecognitionItem = {
  raw_name: string;
  quantity_guess: string | null;
  confidence: number;
  notes: string | null;
};

export type FridgeRecognitionResult = {
  items: FridgeRecognitionItem[];
  overall_quality:
    | "good"
    | "poor_lighting"
    | "too_dark"
    | "unclear"
    | "no_food_detected";
  advice: string | null;
};

const FRIDGE_PROMPT = `你是冰箱食材辨識助手。看這張冰箱照片，列出所有能辨識的食材。

只回 JSON：
{
  "items": [
    {"raw_name": "番茄", "quantity_guess": "3 顆", "confidence": 0.9, "notes": null},
    ...
  ],
  "overall_quality": "good|poor_lighting|too_dark|unclear|no_food_detected",
  "advice": null 或 字串
}

規則：
- 每個獨立品項一個 entry（不要把「番茄 3 顆」拆成 3 個 entry）
- quantity_guess 用最自然的中文表達，無法判斷就寫 "未知"
- confidence 對「看得清楚 + 認得出來」高，模糊或半遮蔽就低
- 已開封的調味料、瓶罐也要列（醬油、辣椒醬、番茄醬等）
- 包裝紙盒看得到品名就列（如「牛奶 1L」「雞蛋盒」）
- 看不清楚的物體不要硬猜
- 最多列 30 個 entries（按 confidence 高到低）
- 如果整張照片看不到食物，items 回空陣列，overall_quality="no_food_detected"`;

function emptyFridgeResult(advice: string): FridgeRecognitionResult {
  return {
    items: [],
    overall_quality: "unclear",
    advice,
  };
}

export async function recognizeFridge(
  imageBytes: Buffer,
  mimeType: string,
): Promise<FridgeRecognitionResult> {
  try {
    const raw = await callGeminiVisionJson({
      systemPrompt: "你是冰箱食材辨識助手。只回 JSON。",
      userPrompt: FRIDGE_PROMPT,
      imageBytes,
      mimeType,
      maxTokens: 1500,
      temperature: 0.1,
      timeoutMs: aiVisionTimeoutSec() * 1000,
    });
    const parsed = extractJsonObject(raw) as {
      items?: Array<Record<string, unknown>>;
      overall_quality?: string;
      advice?: string | null;
    };
    const items: FridgeRecognitionItem[] = [];
    for (const row of parsed.items ?? []) {
      const raw_name = String(row.raw_name ?? "").trim();
      if (!raw_name) continue;
      const confidence = Number(row.confidence);
      items.push({
        raw_name,
        quantity_guess:
          row.quantity_guess == null
            ? null
            : String(row.quantity_guess),
        confidence: Number.isFinite(confidence) ? confidence : 0.5,
        notes: row.notes == null ? null : String(row.notes),
      });
    }
    items.sort((a, b) => b.confidence - a.confidence);
    const quality = (parsed.overall_quality ??
      "unclear") as FridgeRecognitionResult["overall_quality"];
    return {
      items: items.slice(0, 30),
      overall_quality: quality,
      advice: parsed.advice == null ? null : String(parsed.advice),
    };
  } catch {
    return emptyFridgeResult("辨識失敗，請重試或手動輸入");
  }
}
