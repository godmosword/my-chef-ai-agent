import type { ShoppingCategory } from "./meal-plan";

export const DEFAULT_BASE_SERVINGS = 2;

export const UNIT_CONVERSIONS = {
  weight: {
    g: 1,
    kg: 1000,
    斤: 600,
    台斤: 600,
    公斤: 1000,
    公克: 1,
  },
  volume: {
    ml: 1,
    cc: 1,
    l: 1000,
    L: 1000,
    公升: 1000,
    毫升: 1,
    cup: 240,
    杯: 240,
    tbsp: 15,
    大匙: 15,
    湯匙: 15,
    tsp: 5,
    小匙: 5,
    茶匙: 5,
  },
  countable: [
    "顆",
    "個",
    "根",
    "條",
    "片",
    "瓣",
    "尾",
    "塊",
    "包",
    "盒",
    "罐",
    "支",
    "把",
  ],
  fuzzy: ["適量", "少許", "酌量", "些許", "一撮", "看個人喜好"],
} as const;

const FUZZY_SET = new Set<string>(UNIT_CONVERSIONS.fuzzy);
const COUNTABLE_SET = new Set<string>(UNIT_CONVERSIONS.countable);

export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "")
    .replace(/[（(].*?[)）]/g, "")
    .toLowerCase();
}

export function isFuzzyAmount(amount: string): boolean {
  const t = amount.trim();
  return FUZZY_SET.has(t) || UNIT_CONVERSIONS.fuzzy.some((f) => t.includes(f));
}

export type ParsedAmount =
  | { kind: "numeric"; value: number; unit: string; family: "weight" | "volume" }
  | { kind: "countable"; value: number; unit: string }
  | { kind: "fuzzy"; display: string }
  | { kind: "text"; display: string };

export function parseAmountUnit(
  amount: string | number | undefined,
  unit?: string,
): ParsedAmount | null {
  if (amount == null) return null;
  if (typeof amount === "number") {
    const u = (unit ?? "g").trim();
    const family = weightUnitFactor(u) != null ? "weight" : "volume";
    return { kind: "numeric", value: amount, unit: u, family };
  }
  const raw = String(amount).trim();
  if (!raw) return null;
  if (isFuzzyAmount(raw)) return { kind: "fuzzy", display: "適量" };

  const combined = unit ? `${raw}${unit}`.replace(/\s+/g, "") : raw.replace(/\s+/g, "");
  const numMatch = combined.match(/^([\d.]+)(.*)$/);
  if (!numMatch) return { kind: "text", display: combined };

  const numericText = numMatch[1];
  if (!numericText) return { kind: "text", display: combined };

  const value = parseFloat(numericText);
  const u = (numMatch[2] || unit || "").trim();
  if (!Number.isFinite(value)) return { kind: "text", display: combined };

  if (FUZZY_SET.has(u) || isFuzzyAmount(raw)) return { kind: "fuzzy", display: "適量" };
  if (COUNTABLE_SET.has(u)) return { kind: "countable", value, unit: u };

  const wf = weightUnitFactor(u);
  if (wf != null) return { kind: "numeric", value: value * wf, unit: "g", family: "weight" };
  const vf = volumeUnitFactor(u);
  if (vf != null) return { kind: "numeric", value: value * vf, unit: "ml", family: "volume" };

  return { kind: "text", display: unit ? `${raw} ${unit}`.trim() : raw };
}

function weightUnitFactor(unit: string): number | null {
  const key = unit as keyof typeof UNIT_CONVERSIONS.weight;
  return UNIT_CONVERSIONS.weight[key] ?? null;
}

function volumeUnitFactor(unit: string): number | null {
  const key = unit as keyof typeof UNIT_CONVERSIONS.volume;
  return UNIT_CONVERSIONS.volume[key] ?? null;
}

export function scaleNumericValue(value: number, factor: number): number {
  if (factor === 1) return value;
  return value * factor;
}

export function formatAmount(value: number, unit: string): string {
  if (unit === "g" && value >= 1000) return `${(value / 1000).toFixed(1)}kg`;
  if (unit === "ml" && value >= 1000) return `${(value / 1000).toFixed(1)}L`;
  if (Number.isInteger(value)) return `${value}${unit}`;
  return `${value.toFixed(1)}${unit}`;
}

export type MergeLine = {
  display: string;
  amount: number | string;
  unit?: string;
};

export type MergeInput = {
  name: string;
  normalizedName: string;
  parsed: ParsedAmount;
};

export function mergeParsedItems(inputs: MergeInput[]): {
  name: string;
  amount: number | string;
  unit?: string;
  category: ShoppingCategory;
} {
  if (!inputs.length) {
    return { name: "", amount: "", category: "other" };
  }
  const first = inputs[0];
  if (!first) {
    return { name: "", amount: "", category: "other" };
  }
  const name = first.name;
  const hasFuzzy = inputs.some((i) => i.parsed.kind === "fuzzy");
  if (hasFuzzy) {
    return { name, amount: "適量", category: "other" };
  }

  const numeric = inputs.filter((i) => i.parsed.kind === "numeric") as Array<
    MergeInput & { parsed: { kind: "numeric"; value: number; unit: string; family: "weight" | "volume" } }
  >;
  const firstNumeric = numeric[0];
  if (numeric.length === inputs.length && firstNumeric) {
    const family = firstNumeric.parsed.family;
    const sameFamily = numeric.every((n) => n.parsed.family === family);
    if (sameFamily) {
      const total = numeric.reduce((s, n) => s + n.parsed.value, 0);
      const unit = family === "weight" ? "g" : "ml";
      return { name, amount: total, unit, category: "other" };
    }
  }

  const countable = inputs.filter((i) => i.parsed.kind === "countable") as Array<
    MergeInput & { parsed: { kind: "countable"; value: number; unit: string } }
  >;
  const firstCountable = countable[0];
  if (countable.length === inputs.length && firstCountable) {
    const unit = firstCountable.parsed.unit;
    const sameUnit = countable.every((c) => c.parsed.unit === unit);
    if (sameUnit) {
      const total = countable.reduce((s, c) => s + c.parsed.value, 0);
      return { name, amount: total, unit, category: "other" };
    }
    const parts = countable.map((c) => `${c.parsed.value} ${c.parsed.unit}`);
    return { name, amount: parts.join(" + "), category: "other" };
  }

  const lines: string[] = [];
  for (const i of inputs) {
    if (i.parsed.kind === "numeric") {
      lines.push(formatAmount(i.parsed.value, i.parsed.unit));
    } else if (i.parsed.kind === "countable") {
      lines.push(`${i.parsed.value} ${i.parsed.unit}`);
    } else if (i.parsed.kind === "fuzzy") {
      lines.push(i.parsed.display);
    } else {
      lines.push(i.parsed.display);
    }
  }
  const unique = [...new Set(lines)];
  return {
    name,
    amount: unique.join(" + "),
    category: "other",
  };
}

export function toDisplayAmount(amount: number | string, unit?: string): string {
  if (typeof amount === "string") return amount;
  if (unit) return formatAmount(amount, unit);
  return String(amount);
}
