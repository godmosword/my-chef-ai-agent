import type { AiRecipePayload } from "@/domain/recipe/ai-recipe-payload";
import type { LastRecipeContext } from "./last-recipe-context";

export type RecipeMemoryMessage = {
  role: string;
  content: string;
  timestamp?: string;
};

export function parseLastRecipeContextFromMemory(
  history: RecipeMemoryMessage[],
): LastRecipeContext | null {
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
