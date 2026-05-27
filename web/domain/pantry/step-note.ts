import { formatStep } from "@/domain/recipe/recipe-steps";
import { isPantryMatch, pantryNameKeys } from "./tonight";

export function formatStepForPantry(step: unknown, pantryItems: string[]): string {
  const text = formatStep(step);
  if (!pantryItems.length) return text;
  const keys = pantryNameKeys(pantryItems);
  const hits = pantryItems.filter(
    (p) => text.includes(p) || isPantryMatch(p, keys),
  );
  if (!hits.length) return text;
  const unique = [...new Set(hits)];
  return `${text}（用冰箱的 ${unique.join("、")}）`;
}
