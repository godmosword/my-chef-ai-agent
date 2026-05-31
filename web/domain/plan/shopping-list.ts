import type {
  AggregatedShoppingItem,
  AggregatedShoppingList,
  ShoppingCategory,
  ShoppingSource,
  Slot,
} from "@chef/shared-types";
import { ShoppingCategoryEnum } from "@chef/shared-types";
import {
  mergeParsedItems,
  parseAmountUnit,
  parseShoppingList,
  toDisplayAmount,
} from "@chef/shared-types";

const EMPTY_GROUPS = (): Record<ShoppingCategory, AggregatedShoppingItem[]> => ({
  produce: [],
  protein: [],
  dairy: [],
  pantry: [],
  spice: [],
  other: [],
});

type LineItem = {
  name: string;
  normalizedName: string;
  nameKey: string;
  amount: number | string;
  unit?: string;
  category: ShoppingCategory;
  parsed: ReturnType<typeof parseAmountUnit>;
  source: ShoppingSource;
};

export type PlanShoppingRow = {
  planDate: string;
  slot: Slot;
  servings: number;
  recipeTitle: string;
  shoppingList: unknown[];
};

export function aggregateShoppingListFromPlans(
  week_of: string,
  plans: PlanShoppingRow[],
): AggregatedShoppingList {
  const lines: LineItem[] = [];

  for (const plan of plans) {
    const parsedRows = parseShoppingList(plan.shoppingList, plan.servings);
    for (const row of parsedRows) {
      if (!row.name) continue;
      const parsed =
        row.parsed ??
        parseAmountUnit(
          typeof row.amount === "number" ? row.amount : String(row.amount),
          row.unit,
        );
      lines.push({
        name: row.name,
        normalizedName: row.normalizedName,
        nameKey: row.normalizedName,
        amount: row.amount,
        unit: row.unit,
        category: row.category,
        parsed,
        source: {
          date: plan.planDate,
          slot: plan.slot,
          recipe_title: plan.recipeTitle,
          servings: plan.servings,
        },
      });
    }
  }

  const bucket = new Map<string, LineItem[]>();
  for (const line of lines) {
    const mergeKey = line.nameKey;
    if (!bucket.has(mergeKey)) bucket.set(mergeKey, []);
    bucket.get(mergeKey)!.push(line);
  }

  const items: AggregatedShoppingItem[] = [];

  for (const [, group] of bucket) {
    const category = group[0].category;
    const sources = group.map((g) => g.source);

    const unitGroups = new Map<string, LineItem[]>();
    for (const g of group) {
      const u =
        g.parsed?.kind === "numeric"
          ? `${g.parsed.family}:${g.parsed.unit}`
          : g.parsed?.kind === "countable"
            ? `count:${g.parsed.unit}`
            : g.parsed?.kind === "fuzzy"
              ? "fuzzy"
              : `text:${g.unit ?? ""}`;
      if (!unitGroups.has(u)) unitGroups.set(u, []);
      unitGroups.get(u)!.push(g);
    }

    if (unitGroups.size === 1) {
      const g = [...group];
      const merged = mergeParsedItems(
        g.map((line) => ({
          name: line.name,
          normalizedName: line.normalizedName,
          parsed:
            line.parsed ??
            ({ kind: "text", display: String(line.amount) } as const),
        })),
      );
      items.push({
        name: merged.name || group[0].name,
        amount: merged.amount,
        unit: merged.unit,
        category,
        sources,
      });
      continue;
    }

    for (const [, sub] of unitGroups) {
      const merged = mergeParsedItems(
        sub.map((line) => ({
          name: line.name,
          normalizedName: line.normalizedName,
          parsed:
            line.parsed ??
            ({ kind: "text", display: String(line.amount) } as const),
        })),
      );
      items.push({
        name: merged.name || sub[0].name,
        amount: merged.amount,
        unit: merged.unit,
        category: sub[0].category,
        sources: sub.map((s) => s.source),
      });
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));

  const groups = EMPTY_GROUPS();
  for (const item of items) {
    const cat = ShoppingCategoryEnum.safeParse(item.category).success
      ? item.category
      : "other";
    groups[cat].push({
      ...item,
      amount:
        typeof item.amount === "number"
          ? item.amount
          : item.amount,
    });
  }

  return { week_of, items, groups };
}

export function formatItemAmount(item: AggregatedShoppingItem): string {
  return toDisplayAmount(item.amount, item.unit);
}
