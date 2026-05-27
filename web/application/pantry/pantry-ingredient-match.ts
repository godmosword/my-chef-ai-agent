import { normalizeIngredientName } from "@/domain/pantry/pantry-normalization";
import type { PantryItem } from "@/platform/db/pantry";
import { findByItemKey } from "@/platform/db/pantry";

export type PantryIngredientAnnotation = {
  name: string;
  in_pantry: boolean;
  pantry_label?: string;
};

export async function annotateRecipeIngredients(
  tenantId: string,
  userId: string,
  ingredients: Array<{ name?: string } | string>,
  timeoutMs: number,
): Promise<{
  annotations: PantryIngredientAnnotation[];
  match_count: number;
  total: number;
  timed_out: boolean;
}> {
  const names = ingredients.map((ing) =>
    typeof ing === "string" ? ing : String(ing.name ?? ""),
  );
  const total = names.length;
  if (!total) {
    return { annotations: [], match_count: 0, total: 0, timed_out: false };
  }

  const keys = [
    ...new Set(
      names
        .map((n) => normalizeIngredientName(n)[0])
        .filter(Boolean),
    ),
  ];

  let map: Record<string, PantryItem[]> = {};
  let timed_out = false;
  try {
    map = await Promise.race([
      findByItemKey(tenantId, userId, keys),
      new Promise<Record<string, PantryItem[]>>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs),
      ),
    ]);
  } catch {
    timed_out = true;
    return {
      annotations: names.map((name) => ({ name, in_pantry: false })),
      match_count: 0,
      total,
      timed_out: true,
    };
  }

  let match_count = 0;
  const annotations = names.map((name) => {
    const key = normalizeIngredientName(name)[0];
    const rows = map[key];
    if (rows?.length) {
      match_count += 1;
      return {
        name,
        in_pantry: true,
        pantry_label: "冰箱有",
      };
    }
    return { name, in_pantry: false };
  });

  return { annotations, match_count, total, timed_out: false };
}
