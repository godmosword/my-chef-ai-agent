import { track } from "@/lib/analytics/track";

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

const BLOCKED_PROP_KEYS = new Set([
  "prompt",
  "message",
  "input",
  "ingredients",
  "ingredient_text",
  "custom_allergen",
  "avoid_custom",
  "allergen",
  "allergens",
  "preferences",
  "preference_text",
  "session_id",
  "share_token",
  "token",
]);

export function sanitizeAnalyticsProps(props?: AnalyticsProps): AnalyticsProps {
  const safe: AnalyticsProps = {};
  if (!props) return safe;
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    if (BLOCKED_PROP_KEYS.has(k)) continue;
    safe[k] = v;
  }
  return safe;
}

export function sanitizeAnalyticsPath(pathname: string): string {
  return pathname.replace(/^\/r\/[^/?#]+/, "/r/[token]");
}

/** Strip undefined; never pass free-text user content. */
export function capture(event: string, props?: AnalyticsProps): void {
  track(event, sanitizeAnalyticsProps(props));
}

export function timeCategoryFromMinutes(minutes?: number | null): string | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  if (minutes <= 20) return "under_20";
  if (minutes <= 30) return "under_30";
  return "over_30";
}

export function recipeGenerationCoarseProps(message: string): AnalyticsProps {
  const match = message.match(/(\d{1,3})\s*分/);
  const minutes = match ? Number(match[1]) : undefined;
  return sanitizeAnalyticsProps({
    is_kids_mode: /孩子|小孩|兒童|幼兒/.test(message),
    is_quick_mode: Boolean(minutes && minutes <= 30),
    time_category: timeCategoryFromMinutes(minutes),
  });
}
