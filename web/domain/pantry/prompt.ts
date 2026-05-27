import { sanitizeTonightPantry } from "./tonight";

export function buildPantryUserPrefix(items: string[]): string {
  const clean = sanitizeTonightPantry(items);
  if (!clean.length) return "";
  return `【今晚要清掉的食材】${clean.join("、")}。請優先使用這些食材；shopping_list 只列還需購買的項目。\n\n`;
}
