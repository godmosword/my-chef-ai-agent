/** Human-readable quantity strings for shopping lists (MP-3). */

const UNIT_ZH: Record<string, string> = {
  g: "克",
  kg: "公斤",
  ml: "毫升",
  l: "公升",
  piece: "顆",
  head: "顆",
  bunch: "把",
  pack: "包",
  box: "盒",
  bottle: "瓶",
  can: "罐",
  slice: "片",
  clove: "瓣",
  catty: "斤",
  tael: "兩",
};

export function formatQuantityDisplay(
  quantity: number | null,
  unit: string | null,
  quantityText?: string | null,
): string {
  if (quantityText?.trim()) return quantityText.trim();
  if (quantity == null && !unit) return "依需要";
  if (quantity == null) return unit === "some" || unit === "適量" ? "適量" : String(unit);

  const u = unit?.trim() ?? "";
  if (u === "some" || u === "適量" || u === "少許") return u;

  if (u === "g" && quantity >= 1000) {
    const kg = quantity / 1000;
    return kg === 1 ? "1 公斤" : `${stripTrailingZeros(kg)} 公斤`;
  }

  if (u === "bunch" && quantity > 0 && quantity < 1) {
    return "半把";
  }

  const zh = UNIT_ZH[u] ?? u;
  const q = stripTrailingZeros(quantity);
  return zh ? `${q} ${zh}` : String(q);
}

function stripTrailingZeros(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}
