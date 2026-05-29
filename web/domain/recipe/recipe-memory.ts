import type { AiRecipePayload } from "@/domain/recipe/generate-recipe";
import type { LastRecipeContext } from "./last-recipe-context";
import { getUserMemory } from "@/platform/db/memory";

export async function getLastRecipeFromMemory(
  userId: string,
  tenantId: string,
): Promise<AiRecipePayload | null> {
  const ctx = await getLastRecipeContextFromMemory(userId, tenantId);
  if (!ctx?.recipe_name) return null;
  return {
    recipe_name: ctx.recipe_name,
    theme: ctx.cuisine,
  };
}

export async function getLastRecipeContextFromMemory(
  userId: string,
  tenantId: string,
): Promise<LastRecipeContext | null> {
  const history = await getUserMemory(userId, tenantId);
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role !== "assistant" || !msg.content) continue;
    try {
      const start = msg.content.indexOf("{");
      const end = msg.content.lastIndexOf("}");
      if (start < 0 || end <= start) continue;
      const parsed = JSON.parse(
        msg.content.slice(start, end + 1),
      ) as AiRecipePayload;
      if (parsed.recipe_name) {
        return {
          recipe_name: parsed.recipe_name,
          cuisine:
            (parsed as { cuisine?: string }).cuisine ?? parsed.theme,
          generated_at: msg.timestamp,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}
