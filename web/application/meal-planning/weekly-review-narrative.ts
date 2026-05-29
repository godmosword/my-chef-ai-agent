/**
 * MP-4: friendly weekly review narrative (template fallback; LLM optional later).
 */
import type { WeeklyReviewInsights } from "./weekly-review-insights";

function buildReviewNarrativeFallback(
  insights: WeeklyReviewInsights,
): string {
  const pct = Math.round(insights.cook_rate * 100);
  const skipTotal = Object.values(insights.skip_reasons_summary).reduce(
    (a, b) => a + b,
    0,
  );
  const waste =
    insights.expiring_items_wasted.length > 0
      ? `有 ${insights.expiring_items_wasted[0]} 放到過期，下週清單可以更精準。`
      : "快過期的食材用得還不錯。";
  const positive =
    pct >= 80
      ? "這週節奏很好"
      : pct >= 50
        ? "這週有照計畫煮了幾餐"
        : "實際生活總有變數，能記錄下來就很棒";
  const skipLine =
    skipTotal > 0 ? `外食或跳過 ${skipTotal} 次也沒關係。` : "";
  return `${positive}，煮了 ${insights.slots_cooked}/${insights.slots_total} 餐（${pct}%）。${skipLine}${waste}下週繼續看著冰箱規劃，會更順！`.slice(
    0,
    120,
  );
}

export async function generateReviewNarrative(
  insights: WeeklyReviewInsights,
): Promise<{ narrative: string; fallback_used: boolean }> {
  // Template-only for reliability; LLM hook can be added when text client exists.
  return {
    narrative: buildReviewNarrativeFallback(insights),
    fallback_used: true,
  };
}
