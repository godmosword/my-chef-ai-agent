import type { LastRecipeContext } from "@/domain/recipe/last-recipe-context";
import type { PreferenceSignal } from "./preference-extractor-types";
import type { TasteProfile } from "@/platform/db/personalization";

const RECIPE_FEEDBACK_MARKERS =
  /上次|剛剛那道|你做的|這道|剛才|上一道/;

const FEEDBACK_WINDOW_MS = 5 * 60 * 1000;

function isRecentRecipeContext(lastRecipe?: LastRecipeContext | null): boolean {
  if (!lastRecipe?.recipe_name) return false;
  if (!lastRecipe.generated_at) return true;
  const t = Date.parse(lastRecipe.generated_at);
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= FEEDBACK_WINDOW_MS;
}

function clampScale(n: number): number {
  return Math.min(4, Math.max(0, n));
}

function adjustPref(
  current: number | null | undefined,
  delta: number,
): number {
  const base = current ?? 2;
  return clampScale(base + delta);
}

/** Tier 1: regex / rule-based extraction. */
export function ruleBasedExtract(
  message: string,
  lastRecipe?: LastRecipeContext | null,
  profile?: TasteProfile | null,
): PreferenceSignal[] {
  const text = message.trim();
  if (!text) return [];

  const signals: PreferenceSignal[] = [];
  const recentRecipe = isRecentRecipeContext(lastRecipe);

  const dislikePatterns: Array<{ re: RegExp; confidence: number }> = [
    { re: /不吃([^，,。！!？?\s]{1,12})/g, confidence: 0.85 },
    { re: /討厭([^，,。！!？?\s]{1,12})/g, confidence: 0.85 },
    { re: /不愛([^，,。！!？?\s]{1,12})/g, confidence: 0.85 },
    { re: /怕([^，,。！!？?\s]{1,12})/g, confidence: 0.85 },
  ];
  for (const { re, confidence } of dislikePatterns) {
    for (const match of text.matchAll(re)) {
      const item = match[1]?.trim();
      if (!item || /辣|甜|鹹|油/.test(item)) continue;
      signals.push({
        signal_type: "dislike",
        value: item,
        confidence,
        evidence: match[0],
      });
    }
  }

  for (const match of text.matchAll(/對([^，,。！!？?\s]{1,12})過敏/g)) {
    const item = match[1]?.trim();
    if (!item) continue;
    signals.push({
      signal_type: "allergy",
      value: item,
      confidence: 0.95,
      evidence: match[0],
    });
  }
  for (const match of text.matchAll(/([^，,。！!？?\s]{1,12})過敏/g)) {
    const item = match[1]?.trim();
    if (!item || item.includes("對")) continue;
    signals.push({
      signal_type: "allergy",
      value: item,
      confidence: 0.9,
      evidence: match[0],
    });
  }

  if (recentRecipe) {
    if (/太辣/.test(text)) {
      signals.push({
        signal_type: "spice_pref",
        value: adjustPref(profile?.spice_tolerance, -1),
        confidence: 0.7,
        evidence: "太辣",
      });
    }
    if (/太鹹/.test(text)) {
      signals.push({
        signal_type: "saltiness_pref",
        value: adjustPref(profile?.saltiness_preference, -1),
        confidence: 0.7,
        evidence: "太鹹",
      });
    }
    if (/太甜/.test(text)) {
      signals.push({
        signal_type: "sweetness_pref",
        value: adjustPref(profile?.sweetness_preference, -1),
        confidence: 0.7,
        evidence: "太甜",
      });
    }
    if (/太油|太膩/.test(text)) {
      signals.push({
        signal_type: "oil_pref",
        value: adjustPref(profile?.oil_preference, -1),
        confidence: 0.7,
        evidence: text.match(/太油|太膩/)?.[0] ?? "太油",
      });
    }
    if (/不夠辣|再辣一點|辣一點/.test(text)) {
      signals.push({
        signal_type: "spice_pref",
        value: adjustPref(profile?.spice_tolerance, 1),
        confidence: 0.7,
        evidence: text.match(/不夠辣|再辣一點|辣一點/)?.[0] ?? "不夠辣",
      });
    }
  }

  if (/我吃素|全素/.test(text)) {
    const restriction = /全素/.test(text) ? "vegan" : "vegetarian";
    signals.push({
      signal_type: "dietary_restriction",
      value: restriction,
      confidence: 0.95,
      evidence: text.match(/我吃素|全素/)?.[0] ?? "我吃素",
    });
  }
  if (/奶蛋素/.test(text)) {
    signals.push({
      signal_type: "dietary_restriction",
      value: "vegetarian",
      confidence: 0.95,
      evidence: "奶蛋素",
    });
  }

  const CN_AGE: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };

  const childAge = text.match(
    /(?:我)?(?:小孩|兒子|女兒|孩子)(?:大概|約)?(\d{1,2}|[一二三四五六七八九十])歲/,
  );
  if (childAge) {
    const token = childAge[1];
    const age = /^\d+$/.test(token) ? parseInt(token, 10) : (CN_AGE[token] ?? 5);
    const age_group =
      age <= 1 ? "infant" : age <= 3 ? "toddler" : age <= 12 ? "child" : "teen";
    const nameMatch = text.match(/(兒子|女兒|小孩|孩子)/);
    signals.push({
      signal_type: "household_member_info",
      value: {
        name: nameMatch?.[1] ?? "孩子",
        age_group,
        allergies: [],
        dislikes: [],
      },
      confidence: 0.88,
      evidence: childAge[0],
    });
  }

  const memberAllergy = text.match(
    /([^\s，,。]{1,6})(?:對|會)([^，,。！!？?\s]{1,10})過敏/,
  );
  if (memberAllergy) {
    signals.push({
      signal_type: "allergy",
      value: memberAllergy[2],
      confidence: 0.9,
      evidence: memberAllergy[0],
      member_name: memberAllergy[1],
    });
  }

  return dedupeSignals(signals);
}

export function messageHasRecipeFeedbackMarker(message: string): boolean {
  return RECIPE_FEEDBACK_MARKERS.test(message);
}

export function shouldRunLlmTier(
  message: string,
  ruleSignals: PreferenceSignal[],
  llmTierEnabled: boolean,
): boolean {
  if (!llmTierEnabled) return false;
  const trimmed = message.trim();
  if (messageHasRecipeFeedbackMarker(trimmed)) return true;
  if (trimmed.length >= 15 && ruleSignals.length === 0) return true;
  return false;
}

function dedupeSignals(signals: PreferenceSignal[]): PreferenceSignal[] {
  const seen = new Set<string>();
  const out: PreferenceSignal[] = [];
  for (const s of signals) {
    const key = `${s.signal_type}:${JSON.stringify(s.value)}:${s.member_name ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
