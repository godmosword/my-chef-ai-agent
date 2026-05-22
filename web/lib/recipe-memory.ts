import type { RecipePayload } from "@/lib/ai/generate-recipe";
import { getUserMemory } from "@/lib/db/memory";

export async function getLastRecipeFromMemory(
  userId: string,
  tenantId: string,
): Promise<RecipePayload | null> {
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
      ) as RecipePayload;
      if (parsed.recipe_name) return parsed;
    } catch {
      continue;
    }
  }
  return null;
}
