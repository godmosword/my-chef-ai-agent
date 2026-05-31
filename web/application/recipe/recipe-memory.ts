import type { AiRecipePayload } from "@/domain/recipe/ai-recipe-payload";
import type { LastRecipeContext } from "@/domain/recipe/last-recipe-context";
import { parseLastRecipeContextFromMemory } from "@/domain/recipe/parse-recipe-memory";
import { getUserMemory } from "@/platform/db/memory";

function lastRecipeContextToPayload(
  context: LastRecipeContext | null,
): AiRecipePayload | undefined {
  if (!context?.recipe_name) return undefined;
  return {
    recipe_name: context.recipe_name,
    theme: context.cuisine,
  };
}

export async function getLastRecipePayloadFromMemory(
  userId: string,
  tenantId: string,
): Promise<AiRecipePayload | null> {
  return (
    lastRecipeContextToPayload(
      await getLastRecipeContextFromMemory(userId, tenantId),
    ) ?? null
  );
}

export async function getLastRecipeContextFromMemory(
  userId: string,
  tenantId: string,
): Promise<LastRecipeContext | null> {
  const history = await getUserMemory(userId, tenantId);
  return parseLastRecipeContextFromMemory(history);
}
