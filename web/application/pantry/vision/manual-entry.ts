import {
  normalizeIngredientName,
  normalizeQuantityAndUnit,
} from "@/domain/pantry/pantry-normalization";
import type { PantryItemInput } from "@/platform/db/pantry";
import { estimateExpiresAt } from "./map-to-pantry-inputs";

const SEGMENT_SPLIT = /[、,，。;；\n]+/;

/** Parse one segment like "番茄 3 顆" or "香菇 200g". */
function parseManualSegment(segment: string): PantryItemInput | null {
  const trimmed = segment.trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^(.+?)\s+([\d./½¼¾⅓⅔一二三四五六七八九十两半]+)\s*(.*)$/u,
  );
  if (!match) {
    return {
      raw_name: trimmed,
      source: "manual",
      confidence: 1,
    };
  }

  const name = match[1]!.trim();
  const qtyRaw = match[2]!.trim();
  const unitRaw = match[3]?.trim() || undefined;
  const [, , category] = normalizeIngredientName(name);
  const purchasedAt = new Date().toISOString().slice(0, 10);

  return {
    raw_name: name,
    raw_quantity: qtyRaw,
    raw_unit: unitRaw,
    expires_at: estimateExpiresAt(category, purchasedAt),
    source: "manual",
    confidence: 1,
    purchased_at: purchasedAt,
  };
}

export function parseManualPantryText(text: string): {
  items: PantryItemInput[];
  invalid: string[];
} {
  const segments = text.split(SEGMENT_SPLIT).map((s) => s.trim()).filter(Boolean);
  const items: PantryItemInput[] = [];
  const invalid: string[] = [];
  for (const seg of segments) {
    const item = parseManualSegment(seg);
    if (!item) continue;
    if (!item.raw_name) {
      invalid.push(seg);
      continue;
    }
    items.push(item);
  }
  return { items, invalid };
}

export function formatManualSummary(items: PantryItemInput[]): string[] {
  return items.map((item) => {
    const [, canonical] = normalizeIngredientName(item.raw_name);
    const [, , quantityText] = normalizeQuantityAndUnit(
      item.raw_quantity,
      item.raw_unit,
    );
    const qty = quantityText || item.raw_quantity || "適量";
    const days = item.expires_at
      ? `約 ${Math.max(1, Math.round((new Date(item.expires_at).getTime() - Date.now()) / 86400000))} 天內`
      : "";
    return `• ${canonical} · ${qty}${days ? ` · ${days}` : ""}`;
  });
}
