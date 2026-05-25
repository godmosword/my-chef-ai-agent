import { track } from "@/lib/analytics/track";

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

/** Strip undefined; never pass free-text user content. */
export function capture(event: string, props?: AnalyticsProps): void {
  const safe: AnalyticsProps = {};
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined) safe[k] = v;
    }
  }
  track(event, safe);
}

export function timeCategoryFromMinutes(minutes?: number | null): string | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  if (minutes <= 20) return "under_20";
  if (minutes <= 30) return "under_30";
  return "over_30";
}
