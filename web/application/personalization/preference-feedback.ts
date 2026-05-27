import {
  addLovedDish,
  addRegeneratedDish,
  getTasteProfile,
  upsertTasteProfile,
} from "@/platform/db/personalization";
import { isPreferenceExtractionEnabled } from "@/platform/config/preference-extraction-config";

function clampScale(n: number): number {
  return Math.min(4, Math.max(0, n));
}

/** Explicit collect / favorite → loved dish. */
export async function handleCollectLovedDish(
  tenantId: string,
  userId: string,
  dishName: string,
  cuisine?: string | null,
): Promise<void> {
  if (!isPreferenceExtractionEnabled()) return;
  const name = dishName.trim();
  if (!name) return;
  await addLovedDish(tenantId, userId, name, cuisine ?? null);
}

/** User tapped regenerate / 「再來一道」 on previous recipe. */
export async function handleRegenerateFeedback(
  tenantId: string,
  userId: string,
  dishName: string,
  cuisine?: string | null,
): Promise<void> {
  if (!isPreferenceExtractionEnabled()) return;
  const name = dishName.trim();
  if (!name) return;
  await addRegeneratedDish(tenantId, userId, name, cuisine ?? null);
}

const TASTE_ADJUSTMENTS: Record<
  string,
  "spice_tolerance" | "saltiness_preference" | "sweetness_preference" | "oil_preference"
> = {
  太辣: "spice_tolerance",
  太鹹: "saltiness_preference",
  太甜: "sweetness_preference",
  太油: "oil_preference",
  太膩: "oil_preference",
};

/** Short feedback within recipe window (太辣 / 太鹹 / …). */
export async function handleRecipeTasteFeedback(
  tenantId: string,
  userId: string,
  feedbackText: string,
): Promise<boolean> {
  if (!isPreferenceExtractionEnabled()) return false;
  const key = Object.keys(TASTE_ADJUSTMENTS).find((k) => feedbackText.includes(k));
  if (!key) return false;

  const field = TASTE_ADJUSTMENTS[key];
  const profile = await getTasteProfile(tenantId, userId);
  const current = profile?.[field] ?? 2;
  await upsertTasteProfile(tenantId, userId, {
    [field]: clampScale(current - 1),
  });
  return true;
}
