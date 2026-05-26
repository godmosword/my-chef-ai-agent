export type CookAnalyticsSource =
  | "detail"
  | "sticky_cta"
  | "demo"
  | "library_list";

const VALID: CookAnalyticsSource[] = [
  "detail",
  "sticky_cta",
  "demo",
  "library_list",
];

export function parseCookSource(
  value: string | null | undefined,
): CookAnalyticsSource | undefined {
  if (!value) return undefined;
  return VALID.includes(value as CookAnalyticsSource)
    ? (value as CookAnalyticsSource)
    : undefined;
}

/** Append `source` query for cook-mode analytics (preserves existing params). */
export function cookHrefWithSource(
  href: string,
  source: CookAnalyticsSource,
): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("source", source);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : `${path}?source=${source}`;
}
