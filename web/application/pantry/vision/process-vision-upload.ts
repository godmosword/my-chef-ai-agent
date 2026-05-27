import { isPantryEnabled } from "@/platform/config/pantry-config";
import {
  isPantryVisionEnabled,
  pantryVisionHighConfidenceThreshold,
} from "@/platform/config/pantry-vision-config";
import {
  consumePantryVisionQuota,
  PantryVisionQuotaExceededError,
} from "@/platform/db/pantry-vision-quota";
import { createPantryReviewSession } from "@/platform/db/pantry-vision-session";
import { recordPantryVisionCall } from "@/platform/observability/pantry-vision-metrics";
import { classifyImageIntent, type ImageIntent } from "./image-intent";
import {
  enrichFridgeItems,
  enrichReceiptItems,
  receiptToPantryInputs,
  toPantryInputs,
} from "./map-to-pantry-inputs";
import { recognizeFridge } from "./pantry-vision";
import { parseReceipt } from "./receipt-ocr";
import { getVisionCache, hashImageBytes, setVisionCache } from "./vision-cache";

export type VisionIntentMarker =
  | "fridge"
  | "receipt"
  | "recipe"
  | "auto";

export type VisionUploadResult =
  | {
      status: "review";
      session_id: string;
      session_type: "fridge" | "receipt";
      payload: Awaited<ReturnType<typeof createPantryReviewSession>> extends string
        ? import("./review-types").PantryReviewSessionPayload
        : never;
    }
  | { status: "recipe"; message: string }
  | {
      status: "clarify";
      message: string;
      options: Array<"recipe" | "fridge" | "receipt">;
    }
  | { status: "error"; message: string };

function markerToIntent(marker: VisionIntentMarker): ImageIntent | null {
  if (marker === "fridge") return "fridge_contents";
  if (marker === "receipt") return "receipt";
  if (marker === "recipe") return "food_for_recipe";
  return null;
}

export async function processPantryVisionUpload(
  tenantId: string,
  userId: string,
  imageBytes: Buffer,
  mimeType: string,
  marker: VisionIntentMarker = "auto",
): Promise<VisionUploadResult> {
  if (!isPantryEnabled() || !isPantryVisionEnabled()) {
    return { status: "error", message: "冰箱庫存功能未開啟" };
  }

  try {
    await consumePantryVisionQuota(userId, tenantId);
  } catch (e) {
    if (e instanceof PantryVisionQuotaExceededError) {
      return {
        status: "error",
        message: `已達今日掃描上限（${process.env.PANTRY_VISION_USER_DAILY_LIMIT || 20} 張）`,
      };
    }
    throw e;
  }

  const hash = hashImageBytes(imageBytes);
  const cached = getVisionCache<VisionUploadResult>(`result:${hash}`);
  if (cached) return cached;

  let intent: ImageIntent | null = markerToIntent(marker);
  let confidence = 1;

  if (!intent) {
    const [classified, conf] = await classifyImageIntent(imageBytes, mimeType);
    intent = classified;
    confidence = conf;
    recordPantryVisionCall(
      "classifier",
      intent === "other" ? "low_quality" : "ok",
    );
    if (intent === "other" || confidence < pantryVisionHighConfidenceThreshold()) {
      const clarify: VisionUploadResult = {
        status: "clarify",
        message: "這張照片想做什麼？",
        options: ["recipe", "fridge", "receipt"],
      };
      setVisionCache(`result:${hash}`, clarify);
      return clarify;
    }
  }

  if (intent === "food_for_recipe") {
    const recipe: VisionUploadResult = {
      status: "recipe",
      message: "若要從食材照片生成食譜，請在首頁輸入描述；冰箱登錄請選「盤點冰箱」。",
    };
    setVisionCache(`result:${hash}`, recipe);
    return recipe;
  }

  if (intent === "fridge_contents") {
    const fridge = await recognizeFridge(imageBytes, mimeType);
    const quality =
      fridge.overall_quality === "no_food_detected" ||
      fridge.overall_quality === "unclear"
        ? "low_quality"
        : "ok";
    recordPantryVisionCall("fridge", quality, fridge.items.length);

    const inputs = toPantryInputs(fridge);
    const enriched = enrichFridgeItems(inputs, fridge);
    const sessionId = await createPantryReviewSession(tenantId, userId, "fridge", {
      type: "fridge",
      items: enriched,
      overall_quality: fridge.overall_quality,
      advice: fridge.advice,
    });
    const payload = {
      kind: "pantry_review" as const,
      type: "fridge" as const,
      items: enriched,
      overall_quality: fridge.overall_quality,
      advice: fridge.advice,
      user_edits_count: 0,
      created_at: new Date().toISOString(),
    };
    const result: VisionUploadResult = {
      status: "review",
      session_id: sessionId,
      session_type: "fridge",
      payload,
    };
    setVisionCache(`result:${hash}`, result);
    return result;
  }

  if (intent === "receipt") {
    const receipt = await parseReceipt(imageBytes, mimeType);
    recordPantryVisionCall(
      "receipt",
      receipt.items.length ? "ok" : "low_quality",
      receipt.items.length,
    );
    const inputs = receiptToPantryInputs(receipt, { only_food: false });
    const enriched = enrichReceiptItems(inputs, receipt.items);
    const sessionId = await createPantryReviewSession(tenantId, userId, "receipt", {
      type: "receipt",
      items: enriched,
      store_name: receipt.store_name,
      purchased_at: receipt.purchased_at,
      total_amount: receipt.total_amount,
      overall_quality: receipt.overall_quality,
      advice: receipt.advice,
    });
    const payload = {
      kind: "pantry_review" as const,
      type: "receipt" as const,
      items: enriched,
      store_name: receipt.store_name,
      purchased_at: receipt.purchased_at,
      total_amount: receipt.total_amount,
      overall_quality: receipt.overall_quality,
      advice: receipt.advice,
      user_edits_count: 0,
      created_at: new Date().toISOString(),
    };
    const result: VisionUploadResult = {
      status: "review",
      session_id: sessionId,
      session_type: "receipt",
      payload,
    };
    setVisionCache(`result:${hash}`, result);
    return result;
  }

  return {
    status: "clarify",
    message: "這張照片想做什麼？",
    options: ["recipe", "fridge", "receipt"],
  };
}
