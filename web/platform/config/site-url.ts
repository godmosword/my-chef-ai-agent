/** Canonical site URL for share links and OG metadata. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function buildShareUrl(token: string, medium?: string): string {
  const url = new URL(`/r/${token}`, getSiteUrl());
  url.searchParams.set("ref", "share");
  if (medium) url.searchParams.set("medium", medium);
  return url.toString();
}
