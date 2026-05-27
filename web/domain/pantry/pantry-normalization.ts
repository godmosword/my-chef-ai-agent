/**
 * Ingredient name + quantity/unit normalization for pantry inventory (PT-1).
 */
import {
  INGREDIENT_DICTIONARY,
  type IngredientDictEntry,
} from "./ingredient-dictionary";
import { PANTRY_CATEGORIES, PANTRY_UNITS, type PantryCategory } from "./pantry-types";

/** 簡體 → 繁體 (subset for pantry lookup). Applied before dictionary match. */
const SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
  葱: "蔥",
  蒜: "蒜",
  姜: "薑",
  酱: "醬",
  蕃: "番",
  茄: "茄",
  西红柿: "番茄",
  土豆: "馬鈴薯",
  胡萝卜: "紅蘿蔔",
  白萝卜: "白蘿蔔",
  黄瓜: "小黃瓜",
  洋葱: "洋蔥",
  鸡肉: "雞肉",
  猪肉: "豬肉",
  鸡蛋: "雞蛋",
  酱油: "醬油",
  蚝油: "蠔油",
  盐: "鹽",
  糖: "糖",
  面粉: "麵粉",
  面条: "麵條",
  苹果: "蘋果",
  柠檬: "檸檬",
  菠萝: "鳳梨",
  猕猴桃: "奇異果",
  三文鱼: "鮭魚",
  干贝: "干貝",
};

const TAIWAN_WEIGHT_CONVERSIONS: Record<string, number> = {
  tael: 37.5,
  catty: 600,
};

const UNIT_ALIASES: Record<string, string> = {
  克: "g",
  公克: "g",
  g: "g",
  G: "g",
  gm: "g",
  公斤: "kg",
  kg: "kg",
  Kg: "kg",
  毫升: "ml",
  ml: "ml",
  cc: "ml",
  CC: "ml",
  公升: "l",
  l: "l",
  L: "l",
  升: "l",
  茶匙: "tsp",
  小匙: "tsp",
  tsp: "tsp",
  湯匙: "tbsp",
  大匙: "tbsp",
  tbsp: "tbsp",
  杯: "cup",
  cup: "cup",
  個: "piece",
  颗: "head",
  顆: "head",
  片: "slice",
  塊: "block",
  块: "block",
  把: "bunch",
  束: "bunch",
  瓣: "clove",
  根: "stick",
  支: "stick",
  罐: "can",
  瓶: "bottle",
  包: "pack",
  盒: "box",
  兩: "tael",
  两: "tael",
  斤: "catty",
  適量: "some",
  适量: "some",
  少許: "some",
  少许: "some",
  酌量: "some",
  依個人喜好: "some",
};

const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  兩: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

const FRACTION_CHARS: Record<string, number> = {
  "½": 0.5,
  "¼": 0.25,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
};

function djb2Hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, "0");
}

function applyTraditionalVariants(text: string): string {
  let out = text.trim();
  for (const [simp, trad] of Object.entries(SIMPLIFIED_TO_TRADITIONAL)) {
    if (out.includes(simp)) out = out.replaceAll(simp, trad);
  }
  return out;
}

function lookupIngredient(raw: string): IngredientDictEntry | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const direct = INGREDIENT_DICTIONARY[trimmed];
  if (direct) return direct;
  const traditional = applyTraditionalVariants(trimmed);
  if (traditional !== trimmed) {
    return INGREDIENT_DICTIONARY[traditional] ?? null;
  }
  return null;
}

function stableUnknownKey(raw: string): string {
  const norm = raw.trim().replace(/\s+/g, "");
  const hash = djb2Hash(norm);
  const slug =
    norm
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 32) || "item";
  return `custom_${hash}_${slug}`;
}

/**
 * Normalize ingredient surface form → (item_key, canonical_zh, category).
 */
export function normalizeIngredientName(
  raw: string,
): [itemKey: string, canonicalZh: string, category: PantryCategory] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return ["unknown_empty", "（未命名）", "other"];
  }

  const lowerAscii = trimmed.replace(/[A-Za-z]+/g, (m) => m.toLowerCase());
  const forLookup = lowerAscii === trimmed ? trimmed : trimmed;

  const hit = lookupIngredient(forLookup) ?? lookupIngredient(trimmed);
  if (hit) {
    const [itemKey, canonicalZh, category] = hit;
    if ((PANTRY_CATEGORIES as readonly string[]).includes(category)) {
      return [itemKey, canonicalZh, category as PantryCategory];
    }
    return [itemKey, canonicalZh, "other"];
  }

  const key = stableUnknownKey(trimmed);
  return [key, trimmed, "other"];
}

function parseChineseNumber(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (t === "半") return 0.5;
  if (FRACTION_CHARS[t] != null) return FRACTION_CHARS[t];

  if (/^[\d.]+$/.test(t)) {
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }

  if (/^[\d.]+\/[\d.]+$/.test(t)) {
    const [a, b] = t.split("/").map(Number);
    if (b && Number.isFinite(a) && Number.isFinite(b)) return a / b;
  }

  if (t.length === 1 && CHINESE_DIGITS[t] != null) {
    return CHINESE_DIGITS[t];
  }

  if (t === "十") return 10;
  if (t.startsWith("十") && t.length === 2 && CHINESE_DIGITS[t[1]] != null) {
    return 10 + CHINESE_DIGITS[t[1]]!;
  }
  if (t.endsWith("十") && t.length === 2 && CHINESE_DIGITS[t[0]] != null) {
    return CHINESE_DIGITS[t[0]]! * 10;
  }
  if (t.length === 3 && t[1] === "十") {
    const tens = CHINESE_DIGITS[t[0]];
    const ones = CHINESE_DIGITS[t[2]];
    if (tens != null && ones != null) return tens * 10 + ones;
  }

  return null;
}

function resolveUnitAlias(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  return UNIT_ALIASES[t] ?? UNIT_ALIASES[t.toLowerCase()] ?? null;
}

function unitDimension(unit: string): string | null {
  return PANTRY_UNITS[unit]?.dimension ?? null;
}

/** Convert Taiwan 兩/斤 into grams when quantity uses tael/catty units. */
function applyTaiwanWeight(
  quantity: number,
  unit: string,
): { quantity: number; unit: string } {
  if (unit === "tael") {
    return { quantity: quantity * TAIWAN_WEIGHT_CONVERSIONS.tael, unit: "g" };
  }
  if (unit === "catty") {
    return { quantity: quantity * TAIWAN_WEIGHT_CONVERSIONS.catty, unit: "g" };
  }
  return { quantity, unit };
}

/**
 * Normalize quantity + unit → canonical storage + display text.
 */
export function normalizeQuantityAndUnit(
  rawQuantity: string | number | null | undefined,
  rawUnit: string | null | undefined,
): [quantity: number | null, unit: string | null, displayText: string] {
  const qtyRaw =
    rawQuantity == null
      ? ""
      : typeof rawQuantity === "number"
        ? String(rawQuantity)
        : String(rawQuantity).trim();
  const unitRaw = rawUnit?.trim() ?? "";

  const combined = `${qtyRaw}${unitRaw}`.replace(/\s+/g, "");
  if (!qtyRaw && !unitRaw) {
    return [null, null, ""];
  }

  const fuzzyOnly =
    ["適量", "适量", "少許", "少许", "酌量", "依個人喜好"].includes(qtyRaw) ||
    ["適量", "适量", "少許", "少许", "酌量"].includes(unitRaw) ||
    combined === "適量" ||
    combined === "适量";
  if (fuzzyOnly || qtyRaw === "適量" || qtyRaw === "适量") {
    return [null, "some", "適量"];
  }

  // "一把" style: quantity embedded in unit word
  const bunchMatch = combined.match(/^(一|二|兩|两|半|[\d.]+)?(把|束|顆|颗|個|个|片|根|支|瓣|罐|瓶|包|盒|塊|块)$/);
  if (bunchMatch && !qtyRaw) {
    const numPart = bunchMatch[1] ?? "一";
    const unitPart = bunchMatch[2]!;
    const n = parseChineseNumber(numPart) ?? (numPart === "" ? 1 : null);
    const canonical = resolveUnitAlias(unitPart);
    if (n != null && canonical) {
      const display = numPart === "一" || numPart === "" ? `一${unitPart}` : `${numPart}${unitPart}`;
      return [n, canonical, display === "一把" ? "一把" : display];
    }
  }

  // Single token like "一把"
  if (!unitRaw && qtyRaw.length >= 2) {
    const embedded = qtyRaw.match(
      /^(半|一|二|兩|两|[\d.]+)?(把|束|顆|颗|個|个|片|根|支|瓣|罐|瓶|包|盒|塊|块)$/,
    );
    if (embedded) {
      const numPart = embedded[1] ?? "一";
      const unitPart = embedded[2]!;
      const n = parseChineseNumber(numPart) ?? 1;
      const canonical = resolveUnitAlias(unitPart);
      if (canonical) {
        if ((numPart === "一" || !embedded[1]) && unitPart === "把") {
          return [n, canonical, "一把"];
        }
        const display =
          numPart === "一" || !embedded[1] ? `一${unitPart}` : `${numPart}${unitPart}`;
        return [n, canonical, display];
      }
    }
  }

  let quantity: number | null = null;
  if (typeof rawQuantity === "number") {
    quantity = rawQuantity;
  } else {
    quantity = parseChineseNumber(qtyRaw);
    if (quantity == null && /^[\d.]+$/.test(qtyRaw)) {
      quantity = parseFloat(qtyRaw);
    }
    if (quantity == null && /^[\d.]+\/[\d.]+$/.test(qtyRaw)) {
      const [a, b] = qtyRaw.split("/").map(Number);
      if (b) quantity = a / b;
    }
    if (quantity == null && FRACTION_CHARS[qtyRaw] != null) {
      quantity = FRACTION_CHARS[qtyRaw];
    }
  }

  const canonicalUnit = resolveUnitAlias(unitRaw);
  if (qtyRaw === "一" && unitRaw === "把" && canonicalUnit === "bunch") {
    return [1, "bunch", "一把"];
  }
  if (qtyRaw === "半" && unitRaw === "斤") {
    return [300, "g", "半斤"];
  }
  const displayParts = [qtyRaw, unitRaw].filter(Boolean).join(" ").trim();
  const displayText = displayParts || combined;

  if (canonicalUnit === "some") {
    return [null, "some", displayText || "適量"];
  }

  if (quantity == null || !canonicalUnit) {
    return [null, null, displayText];
  }

  let q = quantity;
  let u = canonicalUnit;
  ({ quantity: q, unit: u } = applyTaiwanWeight(q, u));

  const converted = convertToBase(q, u);
  const display =
    converted.unit === u
      ? displayText
      : `${converted.quantity} ${PANTRY_UNITS[converted.unit]?.labelZh ?? converted.unit}`;

  return [converted.quantity, converted.unit, displayText || display];
}

export function unitsComparable(unitA: string, unitB: string): boolean {
  const dA = unitDimension(unitA);
  const dB = unitDimension(unitB);
  if (!dA || !dB) return false;
  if (dA === "vague" || dB === "vague") return dA === dB;
  if (dA === "count" && dB === "count") return true;
  return dA === dB;
}

export function convertToBase(
  quantity: number,
  unit: string,
): { quantity: number; unit: string } {
  if (unit === "kg") return { quantity: quantity * 1000, unit: "g" };
  if (unit === "g" || unit === "oz") return { quantity, unit: unit === "oz" ? "oz" : "g" };
  if (unit === "l") return { quantity: quantity * 1000, unit: "ml" };
  if (unit === "ml" || unit === "tsp" || unit === "tbsp" || unit === "cup") {
    return { quantity, unit };
  }
  return { quantity, unit };
}

/** Add two quantities when units are comparable; result in base unit of the dimension. */
export function addQuantities(
  qA: number,
  uA: string,
  qB: number,
  uB: string,
): { quantity: number; unit: string } {
  if (!unitsComparable(uA, uB)) {
    throw new Error(`Units not comparable: ${uA} vs ${uB}`);
  }
  const baseA = convertToBase(qA, uA);
  const baseB = convertToBase(qB, uB);
  return {
    quantity: baseA.quantity + baseB.quantity,
    unit: baseA.unit,
  };
}

/** Subtract amount from stored quantity; may soft-delete when <= 0. */
export function subtractQuantity(
  storedQty: number,
  storedUnit: string,
  amount: number,
  amountUnit: string,
): number {
  if (!unitsComparable(storedUnit, amountUnit)) {
    throw new Error(
      `Cannot consume ${amount} ${amountUnit} from ${storedQty} ${storedUnit}: incompatible units`,
    );
  }
  const baseStored = convertToBase(storedQty, storedUnit);
  const baseAmount = convertToBase(amount, amountUnit);
  return baseStored.quantity - baseAmount.quantity;
}
