import { pantryVisionLowConfidenceThreshold } from "@/platform/config/pantry-vision-config";
import { bulkAddPantryItems, type PantryItemInput } from "@/platform/db/pantry";
import type { EnrichedPantryInput } from "./map-to-pantry-inputs";
import type { PantryReviewSessionPayload } from "./review-types";

export function itemsEligibleForCommit(
  items: EnrichedPantryInput[],
): EnrichedPantryInput[] {
  const low = pantryVisionLowConfidenceThreshold();
  return items.filter((item) => {
    if (item.selected === false) return false;
    const conf = item.recognition_confidence ?? item.confidence ?? 1;
    if (conf < low && !item.user_edited) return false;
    return true;
  });
}

export function confidenceLabel(confidence: number): "高信心" | "中信心" | "低信心" {
  if (confidence >= 0.8) return "高信心";
  if (confidence >= 0.5) return "中信心";
  return "低信心";
}

export async function commitPantryReviewSession(
  tenantId: string,
  userId: string,
  payload: PantryReviewSessionPayload,
): Promise<{ committed: number; items: Awaited<ReturnType<typeof bulkAddPantryItems>> }> {
  const eligible = itemsEligibleForCommit(payload.items);
  const inputs: PantryItemInput[] = eligible.map((item) => ({
    raw_name: item.raw_name,
    raw_quantity: item.raw_quantity,
    raw_unit: item.raw_unit,
    expires_at: item.expires_at,
    location: item.location as PantryItemInput["location"],
    source: item.source as PantryItemInput["source"],
    confidence: item.confidence,
    notes: item.notes,
    purchased_at: item.purchased_at,
  }));
  const rows = await bulkAddPantryItems(tenantId, userId, inputs, {
    merge_strategy: "merge_if_same_expiry",
  });
  return { committed: rows.length, items: rows };
}
