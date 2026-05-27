/**
 * MP-1: Lazy expand meal slot to full recipe JSON.
 */
import { buildCleanFridgeSystemBlock } from "@/domain/pantry/clean-fridge-prompt";
import { generateRecipe, type RecipePayload } from "@/domain/recipe/generate-recipe";
import {
  getMealSlot,
  saveSlotFullRecipe,
} from "@/platform/db/meal-planning";
import type { MealSlotRow } from "@/platform/db/meal-planning";
import {
  loadPersonalizationContext,
  renderPersonalizationBlock,
} from "@/application/personalization/personalization-context";
import { recordMealSlotExpansion } from "@/platform/observability/meal-planning-metrics";

export async function expandSlotToFullRecipe(
  slotId: number,
  tenantId: string,
  userId: string,
): Promise<MealSlotRow | null> {
  const slot = await getMealSlot(slotId, tenantId, userId);
  if (!slot) return null;

  if (slot.full_recipe_json) {
    recordMealSlotExpansion("cache_hit");
    return slot;
  }

  const priorityLines = slot.key_ingredients
    .filter((k) => k.from_pantry)
    .map((k) => {
      const q = k.approx_quantity != null ? `${k.approx_quantity}` : "";
      const u = k.approx_unit ?? "";
      return `${k.display_name}${q || u ? ` ${q}${u}` : ""}`;
    });

  const cleanBlock = buildCleanFridgeSystemBlock(
    priorityLines.length ? priorityLines : slot.key_ingredients.map((k) => k.display_name),
  );
  const personalization = await loadPersonalizationContext(tenantId, userId);
  const userMessage = `請給我「${slot.dish_title}」的食譜，${slot.cuisine ?? "家常"}風味，約 ${slot.estimated_time_min ?? 30} 分鐘完成。`;

  try {
    const { recipe } = await generateRecipe(
      [
        {
          role: "system",
          content: [cleanBlock, renderPersonalizationBlock(personalization)]
            .filter(Boolean)
            .join("\n\n"),
        },
        { role: "user", content: userMessage },
      ],
      userId,
    );
    const saved = await saveSlotFullRecipe(
      slotId,
      tenantId,
      userId,
      recipe as unknown as Record<string, unknown>,
    );
    recordMealSlotExpansion("ok");
    return saved;
  } catch {
    recordMealSlotExpansion("error");
    return null;
  }
}

export type { RecipePayload };
