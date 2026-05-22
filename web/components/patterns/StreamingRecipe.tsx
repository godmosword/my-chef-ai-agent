"use client";

import { Skeleton } from "@/components/primitives/Skeleton";
import type { RecipePayload } from "@chef/shared-types";
import { formatIngredient, formatStep } from "@/lib/recipe-steps";

export type StreamingRecipeProps = {
  recipe: RecipePayload | null;
  streaming: boolean;
  error?: string | null;
};

export function StreamingRecipe({ recipe, streaming, error }: StreamingRecipeProps) {
  if (error) {
    return (
      <div
        className="rounded-lg border border-danger/30 bg-surface-default p-4 text-danger"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!recipe && streaming) {
    return (
      <div className="space-y-3 rounded-lg border border-border-default bg-surface-default p-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  if (!recipe) return null;

  return (
    <article className="rounded-lg border border-border-default bg-surface-default p-4 shadow-card">
      <h2 className="font-serif text-2xl text-text-ink">
        {recipe.recipe_name ?? (streaming ? "生成中…" : "未命名食譜")}
      </h2>
      {recipe.summary && <p className="mt-2 text-sm text-text-muted">{recipe.summary}</p>}
      {recipe.cuisine && (
        <p className="mt-1 text-sm text-text-muted">菜系：{recipe.cuisine}</p>
      )}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <section className="mt-4">
          <h3 className="text-sm font-medium text-text-ink">食材</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-text-muted">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>{formatIngredient(ing)}</li>
            ))}
          </ul>
        </section>
      )}
      {recipe.steps && recipe.steps.length > 0 && (
        <section className="mt-4">
          <h3 className="text-sm font-medium text-text-ink">步驟</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-text-muted">
            {recipe.steps.map((step, i) => (
              <li key={i}>{formatStep(step)}</li>
            ))}
          </ol>
        </section>
      )}
      {streaming && !recipe.steps?.length && (
        <p className="mt-4 text-xs text-text-muted">正在組裝步驟…</p>
      )}
    </article>
  );
}
