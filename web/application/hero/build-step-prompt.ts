import type { RecipePayload } from "@chef/shared-types";
import { cuisineToEnglish } from "@/application/hero/build-prompt";

/** Instructional cooking photo for a single step (not a finished dish hero shot). */
export function buildStepImagePrompt(
  recipe: RecipePayload,
  stepText: string,
  stepIndex: number,
  totalSteps: number,
): string {
  const cuisineLabel = (recipe.cuisine ?? recipe.theme ?? "台式").trim();
  const cuisineEn = cuisineToEnglish(cuisineLabel);
  const dish = (recipe.recipe_name ?? "homestyle dish").trim() || "homestyle dish";

  return [
    `Cooking process photo for step ${stepIndex + 1} of ${totalSteps} making ${dish}, ${cuisineEn} cuisine.`,
    `This step: ${stepText.slice(0, 200)}.`,
    "Close-up hands-in-action or pan/pot mid-cook, warm kitchen light, realistic editorial style.",
    "No finished plated dish hero shot; show the cooking action for this step only.",
    "No people faces, no readable text, no logo, no watermark.",
  ].join(" ");
}
