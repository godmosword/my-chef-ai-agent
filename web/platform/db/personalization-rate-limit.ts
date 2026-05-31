const patchCounts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PATCHES = 60;

export function checkPersonalizationPatchRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = patchCounts.get(userId);
  if (!entry || now > entry.resetAt) {
    patchCounts.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PATCHES) return false;
  entry.count += 1;
  return true;
}
