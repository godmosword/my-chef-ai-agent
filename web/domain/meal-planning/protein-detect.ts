/** Detect main protein category from dish title + ingredients (MP-1). */

const PROTEIN_KEYWORDS: Record<string, string[]> = {
  chicken: ["雞", "雞肉", "雞胸", "雞腿", "雞翅"],
  pork: ["豬", "豬肉", "豬排", "排骨", "肉絲", "五花"],
  beef: ["牛", "牛肉", "牛排"],
  fish: ["魚", "鮭魚", "鯛魚", "鯖魚", "虱目魚"],
  shrimp: ["蝦", "蝦仁"],
  tofu: ["豆腐"],
  egg: ["蛋", "雞蛋"],
};

function detectProtein(text: string): string | null {
  const t = text.toLowerCase();
  for (const [protein, keywords] of Object.entries(PROTEIN_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k))) return protein;
  }
  return null;
}

export function detectSlotProtein(
  dishTitle: string,
  ingredientNames: string[],
): string | null {
  const combined = [dishTitle, ...ingredientNames].join(" ");
  return detectProtein(combined);
}
