import type { RecipePayload } from "@chef/shared-types";

export function cuisineToEnglish(label: string): string {
  if (label.includes("日")) return "Japanese";
  if (label.includes("義")) return "Italian";
  if (label.includes("韓")) return "Korean";
  if (label.includes("泰")) return "Thai";
  if (label.includes("中")) return "Chinese";
  if (label.includes("西") && !label.includes("中式")) return "Western";
  return "Taiwanese home-style";
}

/** Editorial food-photo prompt aligned with Chef design tokens. */
export function buildHeroPrompt(recipe: RecipePayload): string {
  const cuisineLabel = (recipe.cuisine ?? recipe.theme ?? "台式").trim();
  const cuisineEn = cuisineToEnglish(cuisineLabel);
  const dish = (recipe.recipe_name ?? "homestyle dish").trim() || "homestyle dish";
  const ingredients = (recipe.ingredients ?? [])
    .slice(0, 4)
    .map((i: unknown) => {
      if (typeof i === "string") return i;
      if (i && typeof i === "object" && "name" in i) {
        return String((i as { name?: string }).name ?? "");
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");

  return [
    `Professional overhead food photography of ${dish}, ${cuisineEn} cuisine.`,
    ingredients ? `Key ingredients visible: ${ingredients}.` : "",
    "Warm inviting home kitchen, natural window side light, soft shadows.",
    "Earthy palette: warm cream, deep amber, forest green accents.",
    "Rustic ceramic plate, simple linen napkin, shallow depth of field, 45-degree top-down.",
    "Editorial cookbook, ultra-realistic, 4k.",
    "STRICT: no people, no faces, food only.",
    // Crucial: gpt-image-2 frequently hallucinates CJK-looking glyphs that the",
    // browser can't render. Forbid every text surface explicitly.",
    "STRICT: zero text of any kind in the image — no Chinese characters, no Japanese kanji or kana, no Korean hangul, no Latin letters, no numbers, no calligraphy, no signature marks, no menu cards, no recipe pages, no chalkboards, no book covers, no plate labels, no napkin embroidery, no chef's hat logos with words.",
    "If the model would otherwise place any character or letter anywhere in the frame, replace it with a clean unmarked surface.",
  ]
    .filter(Boolean)
    .join(" ");
}
