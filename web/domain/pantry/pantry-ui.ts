/**
 * Shared pantry display logic (PT-3) — used by Web UI and API responses.
 */
import { PANTRY_UNITS } from "./pantry-types";
import { convertToBase } from "./pantry-normalization";

export type PantryDisplayItem = {
  id?: number | null;
  item_key: string;
  display_name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  quantity_text: string | null;
  location: string;
  expires_at: string | null;
  confidence: number;
};

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  vegetable: ["蔬菜", "青菜", "菜"],
  fruit: ["水果", "果類"],
  meat: ["肉", "肉類", "雞肉", "豬肉", "牛肉"],
  seafood: ["海鮮", "魚", "蝦"],
  egg_dairy: ["蛋", "奶", "蛋奶", "牛奶", "雞蛋"],
  seasoning: ["調味料", "調味"],
  sauce: ["醬料", "醬"],
  spice: ["香料"],
  frozen: ["冷凍", "冰庫"],
  grain: ["米", "麵", "主食"],
  dry_goods: ["乾貨"],
};

const LOCATION_ZH: Record<string, string> = {
  fridge_main: "冷藏",
  fridge_door: "冷藏門邊",
  freezer: "冷凍",
  pantry: "常溫櫃",
  counter: "料理台",
  other: "其他",
};

const CATEGORY_ZH: Record<string, string> = {
  vegetable: "蔬菜",
  fruit: "水果",
  meat: "肉類",
  seafood: "海鮮",
  egg_dairy: "蛋奶",
  bean_tofu: "豆製品",
  seasoning: "調味料",
  oil: "油",
  sauce: "醬料",
  spice: "香料",
  dry_goods: "乾貨",
  frozen: "冷凍",
  beverage: "飲料",
  snack: "零食",
  other: "其他",
};

export type ExpiryUrgency =
  | "expired"
  | "urgent"
  | "soon"
  | "normal"
  | "unknown";

export function getLocationZh(location: string): string {
  return LOCATION_ZH[location] ?? location;
}

export function getCategoryZh(category: string | null): string {
  if (!category) return "其他";
  return CATEGORY_ZH[category] ?? category;
}

export function parseCategoryFromKeyword(text: string): string | null {
  const t = text.trim();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (t.includes(kw)) return cat;
    }
  }
  return null;
}

export function formatQuantityForDisplay(item: PantryDisplayItem): string {
  if (item.quantity_text?.trim()) return item.quantity_text.trim();
  if (item.quantity != null && item.unit) {
    const unitMeta = PANTRY_UNITS[item.unit];
    const label = unitMeta?.labelZh ?? item.unit;
    if (item.unit === "g" && item.quantity >= 1000) {
      return `${(item.quantity / 1000).toLocaleString("zh-TW", { maximumFractionDigits: 2 })} 公斤`;
    }
    if (item.unit === "ml" && item.quantity >= 1000) {
      return `${(item.quantity / 1000).toLocaleString("zh-TW", { maximumFractionDigits: 2 })} 公升`;
    }
    const q =
      Number.isInteger(item.quantity) ? item.quantity : item.quantity;
    return `${q} ${label}`;
  }
  return "未知";
}

export function expiryLabel(
  item: PantryDisplayItem,
  today: string,
  warnDays: number,
): { text: string; urgency: ExpiryUrgency } {
  if (!item.expires_at) {
    return { text: "效期未知", urgency: "unknown" };
  }
  const t0 = new Date(`${today}T12:00:00Z`).getTime();
  const t1 = new Date(`${item.expires_at}T12:00:00Z`).getTime();
  const diffDays = Math.round((t1 - t0) / 86400000);
  if (diffDays < 0) {
    return {
      text: `已過期 ${Math.abs(diffDays)} 天`,
      urgency: "expired",
    };
  }
  if (diffDays === 0) {
    return { text: "今天到期", urgency: "urgent" };
  }
  if (diffDays <= warnDays) {
    return { text: `${diffDays} 天內過期`, urgency: "urgent" };
  }
  if (diffDays <= 7) {
    return { text: `約 ${diffDays} 天`, urgency: "soon" };
  }
  return { text: `約 ${diffDays} 天`, urgency: "normal" };
}

export type PantryDisplayGroup = {
  id: string;
  title: string;
  emoji: string;
  items: PantryDisplayItem[];
};

export function categorizeForDisplay(
  items: PantryDisplayItem[],
  today: string,
  warnDays: number,
): PantryDisplayGroup[] {
  const visible = items.filter((i) => (i.confidence ?? 1) >= 0.5);
  const expired: PantryDisplayItem[] = [];
  const expiring: PantryDisplayItem[] = [];
  const buckets: Record<string, PantryDisplayItem[]> = {
    veg_fruit: [],
    meat_seafood: [],
    egg_bean: [],
    seasoning: [],
    grain_dry: [],
    frozen: [],
    other: [],
  };

  for (const item of visible) {
    const { urgency } = expiryLabel(item, today, warnDays);
    if (urgency === "expired") {
      expired.push(item);
      continue;
    }
    if (urgency === "urgent") {
      expiring.push(item);
      continue;
    }
    const cat = item.category ?? "other";
    if (cat === "vegetable" || cat === "fruit") buckets.veg_fruit.push(item);
    else if (cat === "meat" || cat === "seafood") buckets.meat_seafood.push(item);
    else if (cat === "egg_dairy" || cat === "bean_tofu") buckets.egg_bean.push(item);
    else if (
      cat === "seasoning" ||
      cat === "sauce" ||
      cat === "spice" ||
      cat === "oil"
    )
      buckets.seasoning.push(item);
    else if (cat === "grain" || cat === "dry_goods") buckets.grain_dry.push(item);
    else if (cat === "frozen") buckets.frozen.push(item);
    else buckets.other.push(item);
  }

  const sortByExpiry = (a: PantryDisplayItem, b: PantryDisplayItem) => {
    if (!a.expires_at && !b.expires_at) return 0;
    if (!a.expires_at) return 1;
    if (!b.expires_at) return -1;
    return a.expires_at.localeCompare(b.expires_at);
  };

  expired.sort(sortByExpiry);
  expiring.sort(sortByExpiry);

  const groups: PantryDisplayGroup[] = [];
  if (expired.length) {
    groups.push({
      id: "expired",
      title: "已過期",
      emoji: "🚨",
      items: expired,
    });
  }
  if (expiring.length) {
    groups.push({
      id: "expiring",
      title: `${warnDays} 天內要過期`,
      emoji: "⚠️",
      items: expiring,
    });
  }
  const defs: Array<{ id: string; title: string; emoji: string; key: keyof typeof buckets }> = [
    { id: "veg_fruit", title: "蔬果類", emoji: "🥬", key: "veg_fruit" },
    { id: "meat_seafood", title: "肉類海鮮", emoji: "🍖", key: "meat_seafood" },
    { id: "egg_bean", title: "蛋奶豆製品", emoji: "🥚", key: "egg_bean" },
    { id: "seasoning", title: "調味料", emoji: "🌶", key: "seasoning" },
    { id: "grain_dry", title: "主食／乾貨", emoji: "🌾", key: "grain_dry" },
    { id: "frozen", title: "冷凍庫", emoji: "❄️", key: "frozen" },
    { id: "other", title: "其他", emoji: "📦", key: "other" },
  ];
  for (const d of defs) {
    const list = buckets[d.key];
    if (!list.length) continue;
    list.sort((a, b) => a.display_name.localeCompare(b.display_name, "zh-Hant"));
    groups.push({ id: d.id, title: d.title, emoji: d.emoji, items: list });
  }
  return groups;
}

export function itemToCleanFridgeLine(item: PantryDisplayItem): string {
  const qty = formatQuantityForDisplay(item);
  return `${item.display_name}(${qty})`;
}
