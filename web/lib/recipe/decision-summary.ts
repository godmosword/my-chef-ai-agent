import type { RecipePayload } from "@chef/shared-types";

export type DecisionSummary = {
  totalMinutes: number | null;
  servings: number | null;
  shoppingCount: number;
};

export function buildDecisionSummary(
  recipe: Partial<RecipePayload>,
): DecisionSummary {
  const prep = recipe.prep_minutes ?? 0;
  const cook = recipe.cook_minutes ?? 0;
  const totalMinutes = prep > 0 || cook > 0 ? prep + cook : null;
  const list = recipe.shopping_list ?? [];
  return {
    totalMinutes,
    servings: recipe.servings ?? null,
    shoppingCount: list.length,
  };
}
