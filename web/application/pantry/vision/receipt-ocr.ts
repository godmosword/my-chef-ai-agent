import { aiVisionTimeoutSec } from "@/platform/config/pantry-vision-config";
import {
  callGeminiVisionJson,
  extractJsonObject,
} from "./gemini-vision-client";

type ReceiptLineItem = {
  raw_name: string;
  quantity_text: string | null;
  unit_price: number | null;
  total_price: number | null;
  confidence: number;
  is_likely_food: boolean;
};

export type ReceiptParseResult = {
  items: ReceiptLineItem[];
  store_name: string | null;
  purchased_at: string | null;
  total_amount: number | null;
  overall_quality: string;
  advice: string | null;
};

const RECEIPT_PROMPT = `你是發票/收據解析助手。讀這張收據，抽出購物明細。

只回 JSON：
{
  "store_name": "全聯" 或 null,
  "purchased_at": "YYYY-MM-DD" 或 null,
  "total_amount": 數字 或 null,
  "items": [
    {
      "raw_name": "牛番茄",
      "quantity_text": "1 包",
      "unit_price": 49,
      "total_price": 49,
      "confidence": 0.9,
      "is_likely_food": true
    }
  ],
  "overall_quality": "good|blurry|partial|unclear",
  "advice": null 或 字串
}

規則：
- 只抽真正能讀出來的品項
- is_likely_food: 食材/食品/飲料 = true；衛生紙、塑膠袋、抹布、洗衣精等 = false
- 條碼編號、店內代碼 不要當品名（如果只看到代碼，confidence < 0.5）
- 折扣行、合計行、找零行 不要當品項
- purchased_at 從收據日期欄抽，台灣常見格式 YYY/MM/DD 民國年要轉西元（民國 115 = 2026）`;

/** Convert ROC / mixed date strings to YYYY-MM-DD. */
export function parseReceiptDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const rocSlash = s.match(/^(?:民國\s*)?(\d{2,3})[./](\d{1,2})[./](\d{1,2})$/);
  if (rocSlash) {
    const year = 1911 + parseInt(rocSlash[1]!, 10);
    const m = rocSlash[2]!.padStart(2, "0");
    const d = rocSlash[3]!.padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  const rocZh = s.match(/民國\s*(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (rocZh) {
    const year = 1911 + parseInt(rocZh[1]!, 10);
    return `${year}-${String(rocZh[2]).padStart(2, "0")}-${String(rocZh[3]).padStart(2, "0")}`;
  }

  return null;
}

function emptyReceipt(advice: string): ReceiptParseResult {
  return {
    items: [],
    store_name: null,
    purchased_at: null,
    total_amount: null,
    overall_quality: "unclear",
    advice,
  };
}

export async function parseReceipt(
  imageBytes: Buffer,
  mimeType: string,
): Promise<ReceiptParseResult> {
  try {
    const raw = await callGeminiVisionJson({
      systemPrompt: "你是收據解析助手。只回 JSON。",
      userPrompt: RECEIPT_PROMPT,
      imageBytes,
      mimeType,
      maxTokens: 2500,
      temperature: 0,
      timeoutMs: aiVisionTimeoutSec() * 1000,
    });
    const parsed = extractJsonObject(raw) as Record<string, unknown>;
    const items: ReceiptLineItem[] = [];
    for (const row of (parsed.items as Array<Record<string, unknown>>) ?? []) {
      const raw_name = String(row.raw_name ?? "").trim();
      if (!raw_name) continue;
      const confidence = Number(row.confidence);
      items.push({
        raw_name,
        quantity_text:
          row.quantity_text == null ? null : String(row.quantity_text),
        unit_price:
          row.unit_price == null ? null : Number(row.unit_price),
        total_price:
          row.total_price == null ? null : Number(row.total_price),
        confidence: Number.isFinite(confidence) ? confidence : 0.5,
        is_likely_food: Boolean(row.is_likely_food),
      });
    }
    const purchased = parseReceiptDate(
      parsed.purchased_at == null ? null : String(parsed.purchased_at),
    );
    return {
      items,
      store_name:
        parsed.store_name == null ? null : String(parsed.store_name),
      purchased_at: purchased,
      total_amount:
        parsed.total_amount == null ? null : Number(parsed.total_amount),
      overall_quality: String(parsed.overall_quality ?? "unclear"),
      advice: parsed.advice == null ? null : String(parsed.advice),
    };
  } catch {
    return emptyReceipt("收據辨識失敗，請重試或手動輸入");
  }
}
