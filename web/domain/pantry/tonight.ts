export const PANTRY_TONIGHT_MAX = 5;
export const PANTRY_STORAGE_KEY = "chef_pantry_tonight_v1";

/** Normalize for dedupe / match (no I/O). */
export function normalizePantryName(name: string): string {
  return name.trim().replace(/\s+/g, "").toLowerCase();
}

export function sanitizeTonightPantry(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 40) continue;
    const key = normalizePantryName(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= PANTRY_TONIGHT_MAX) break;
  }
  return out;
}

export function pantryNameKeys(items: string[]): Set<string> {
  return new Set(items.map(normalizePantryName));
}

export function isPantryMatch(ingredientName: string, keys: Set<string>): boolean {
  const key = normalizePantryName(ingredientName);
  if (keys.has(key)) return true;
  for (const k of keys) {
    if (key.includes(k) || k.includes(key)) return true;
  }
  return false;
}
