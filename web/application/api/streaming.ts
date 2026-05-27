import type { RecipePayload } from "@chef/shared-types";
import { generateRecipe } from "./recipes";

type StreamField =
  | "title"
  | "cuisine"
  | "ingredients"
  | "steps"
  | "kitchen_talk"
  | "shopping_list";

export type StreamEvent =
  | { type: "meta"; id?: string; version_no?: number }
  | { type: "field"; path: StreamField; value: unknown }
  | { type: "done"; recipe: RecipePayload; persisted: boolean }
  | { type: "error"; message: string };

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fake progressive stream until POST /api/recipes?stream=1 exists (Prompt 2.5). */
export async function* fakeRecipeStream(
  body: Parameters<typeof generateRecipe>[0],
): AsyncGenerator<StreamEvent> {
  try {
    const res = await generateRecipe(body);
    const recipe = res.recipe;
    yield {
      type: "meta",
      id: recipe.id,
      version_no: recipe.version_no,
    };
    await delay(180);
    if (recipe.recipe_name) {
      yield { type: "field", path: "title", value: recipe.recipe_name };
      await delay(200);
    }
    const cuisine = recipe.cuisine ?? recipe.theme;
    if (cuisine) {
      yield { type: "field", path: "cuisine", value: cuisine };
      await delay(160);
    }
    if (recipe.ingredients?.length) {
      yield { type: "field", path: "ingredients", value: recipe.ingredients };
      await delay(240);
    }
    if (recipe.steps?.length) {
      yield { type: "field", path: "steps", value: recipe.steps };
      await delay(200);
    }
    yield { type: "done", recipe, persisted: Boolean(recipe.id) };
  } catch (e) {
    yield {
      type: "error",
      message: e instanceof Error ? e.message : "生成失敗",
    };
  }
}
