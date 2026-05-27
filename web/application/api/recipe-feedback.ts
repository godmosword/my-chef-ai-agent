import { apiFetch } from "./client";

export async function reportRegenerateFeedback(
  recipeName: string,
  cuisine?: string,
): Promise<void> {
  try {
    await apiFetch("/api/recipes/feedback", {
      method: "POST",
      body: JSON.stringify({
        action: "regenerate",
        recipe_name: recipeName,
        cuisine,
      }),
    });
  } catch {
    /* best-effort */
  }
}
