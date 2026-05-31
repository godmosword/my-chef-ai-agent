import { ShoppingItemSchema } from "./recipe";
import type { ShoppingCategory } from "./meal-plan";
import {
  DEFAULT_BASE_SERVINGS,
  isFuzzyAmount,
  normalizeName,
  parseAmountUnit,
  scaleNumericValue,
  type ParsedAmount,
} from "./unit-normalizer";

type ParsedLine = { name: string; amount?: string; unit?: string };

const SECTION_PREFIX =
  /^(蔬菜|蛋白質|肉類|海鮮|調味|醬料|乳品|主食|其他)[：:]\s*/i;

const CATEGORY_KEYWORDS: Record<string, ShoppingCategory> = {
  蔬菜: "produce",
  番茄: "produce",
  洋蔥: "produce",
  蒜: "produce",
  雞: "protein",
  豬: "protein",
  牛: "protein",
  魚: "protein",
  蝦: "protein",
  肉: "protein",
  奶: "dairy",
  乳: "dairy",
  蛋: "protein",
  鹽: "spice",
  糖: "spice",
  醬: "spice",
  胡椒: "spice",
  油: "pantry",
  米: "pantry",
  麵: "pantry",
};

export type ParsedShoppingRow = {
  name: string;
  normalizedName: string;
  amount: string | number;
  unit?: string;
  category: ShoppingCategory;
  parsed: ParsedAmount | null;
};

export function guessCategory(name: string): ShoppingCategory {
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (name.includes(kw)) return cat;
  }
  return "other";
}

function stripSectionPrefix(line: string): string {
  return line.replace(SECTION_PREFIX, "").trim();
}

function parsedLine(name: string, amount?: string, unit?: string): ParsedLine {
  const row: ParsedLine = { name };
  if (amount !== undefined) row.amount = amount;
  if (unit !== undefined) row.unit = unit;
  return row;
}

function parsedShoppingRow(
  name: string,
  amount: string | number,
  unit: string | undefined,
  category: ShoppingCategory,
  parsed: ParsedAmount | null,
): ParsedShoppingRow {
  const row: ParsedShoppingRow = {
    name,
    normalizedName: normalizeName(name),
    amount,
    category,
    parsed,
  };
  if (unit !== undefined) row.unit = unit;
  return row;
}

/** Parse trailing "300g", "3 顆", "2 大匙" from a shopping string line. */
function parseStringLine(line: string): ParsedLine {
  const cleaned = stripSectionPrefix(line);
  const rangeMatch = cleaned.match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s*(.+)$/);
  if (rangeMatch) {
    const [, name, from, to, unit] = rangeMatch;
    if (name && from && to && unit) {
      return parsedLine(name.trim(), `${from}-${to} ${unit.trim()}`);
    }
  }

  const fuzzyOnly = cleaned.match(/^(.+?)\s+(適量|少許|酌量|些許|一撮)$/);
  if (fuzzyOnly) {
    const [, name, amount] = fuzzyOnly;
    if (name && amount) return parsedLine(name.trim(), amount);
  }

  const glued = cleaned.match(/^(.+?)\s*([\d.]+)\s*([a-zA-Z\u4e00-\u9fff]+)$/);
  if (glued) {
    const [, name, amount, unit] = glued;
    if (name && amount && unit) return parsedLine(name.trim(), amount, unit);
  }

  const spaced = cleaned.match(/^(.+?)\s+([\d.]+)\s+(.+)$/);
  if (spaced) {
    const [, name, amount, rawTail] = spaced;
    if (!name || !amount || !rawTail) return { name: cleaned };
    const tail = rawTail.trim();
    const parts = tail.split(/\s+/);
    const firstPart = parts[0];
    if (parts.length >= 2 && firstPart && /^[\d.]+$/.test(firstPart)) {
      return parsedLine(name.trim(), `${firstPart} ${parts.slice(1).join(" ")}`);
    }
    return parsedLine(name.trim(), amount, tail);
  }

  return { name: cleaned };
}

export function parseShoppingListItem(raw: unknown): ParsedShoppingRow | null {
  if (typeof raw === "string") {
    const line = raw.trim();
    if (!line) return null;
    const { name, amount, unit } = parseStringLine(line);
    if (!name) return null;
    const category = guessCategory(name);
    const parsed = parseAmountUnit(amount, unit);
    return parsedShoppingRow(
      name,
      amount ?? (parsed?.kind === "fuzzy" ? "適量" : ""),
      unit,
      category,
      parsed,
    );
  }

  const obj = ShoppingItemSchema.safeParse(raw);
  if (!obj.success) return null;
  const data = obj.data;
  const name = typeof data === "string" ? data : data.name;
  if (!name?.trim()) return null;
  const category =
    (typeof data === "object" && data.category) || guessCategory(name);
  const amount = typeof data === "object" ? data.amount : undefined;
  const unit = typeof data === "object" ? data.unit : undefined;
  const parsed = parseAmountUnit(amount, unit);
  return parsedShoppingRow(
    name.trim(),
    amount ?? (parsed?.kind === "fuzzy" ? "適量" : ""),
    unit,
    category,
    parsed,
  );
}

export function applyServingsScale(
  row: ParsedShoppingRow,
  servings: number,
  baseServings = DEFAULT_BASE_SERVINGS,
): ParsedShoppingRow {
  const factor = servings / baseServings;
  if (factor === 1) return row;
  if (!row.parsed) return row;
  if (row.parsed.kind === "fuzzy") return row;
  if (row.parsed.kind === "text") return row;
  if (row.parsed.kind === "countable") {
    return {
      ...row,
      parsed: {
        kind: "countable",
        value: scaleNumericValue(row.parsed.value, factor),
        unit: row.parsed.unit,
      },
      amount: scaleNumericValue(
        typeof row.amount === "number" ? row.amount : row.parsed.value,
        factor,
      ),
    };
  }
  if (row.parsed.kind === "numeric") {
    const scaled = scaleNumericValue(row.parsed.value, factor);
    return {
      ...row,
      parsed: { ...row.parsed, value: scaled },
      amount: scaled,
    };
  }
  return row;
}

export function parseShoppingList(
  rawList: unknown[],
  servings: number,
): ParsedShoppingRow[] {
  const out: ParsedShoppingRow[] = [];
  for (const raw of rawList) {
    const row = parseShoppingListItem(raw);
    if (!row) continue;
    if (typeof row.amount === "string" && isFuzzyAmount(row.amount)) {
      out.push({ ...row, amount: "適量", parsed: { kind: "fuzzy", display: "適量" } });
      continue;
    }
    out.push(applyServingsScale(row, servings));
  }
  return out;
}
