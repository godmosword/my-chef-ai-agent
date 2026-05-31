import type { LastRecipeContext } from "@/domain/recipe/last-recipe-context";
import { parseLastRecipeContextFromMemory } from "@/domain/recipe/parse-recipe-memory";
import { getUserMemory } from "@/platform/db/memory";

export async function getLastRecipeContextFromMemory(
  userId: string,
  tenantId: string,
): Promise<LastRecipeContext | null> {
  const history = await getUserMemory(userId, tenantId);
  return parseLastRecipeContextFromMemory(history);
}
