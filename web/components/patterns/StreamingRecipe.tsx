"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/primitives/Skeleton";
import { Chip } from "@/components/primitives/Chip";
import { RecipeDecisionCard } from "@/components/recipe/RecipeDecisionCard";
import { RecipeResultHero } from "@/components/recipe/RecipeResultHero";
import { RecipeSafetyNotice } from "@/components/recipe/RecipeSafetyNotice";
import { buildDecisionSummary } from "@/domain/recipe/decision-summary";
import type { RecipePayload } from "@chef/shared-types";
import { formatStepForPantry } from "@/domain/pantry/step-note";
import { isPantryMatch, pantryNameKeys } from "@/domain/pantry/tonight";
import { formatIngredient, formatStep, formatStepTip } from "@/domain/recipe/recipe-steps";
import { dietaryAvoidDisplayLabels } from "@/platform/db/dietary-preferences";
import type { DietaryPreferences } from "@/platform/db/dietary-preferences";

function isQuotaError(message: string): boolean {
  return message.includes("額度") || message.includes("429");
}

export type StreamingRecipeProps = {
  recipe: RecipePayload | null;
  streaming: boolean;
  error?: string | null;
  pantryItems?: string[];
};

export function StreamingRecipe({
  recipe,
  streaming,
  error,
  pantryItems = [],
}: StreamingRecipeProps) {
  const [avoidLabels, setAvoidLabels] = useState<string[]>([]);

  useEffect(() => {
    if (!recipe?.id || streaming) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/dietary-preferences");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { preferences: DietaryPreferences };
        if (!cancelled) {
          setAvoidLabels(dietaryAvoidDisplayLabels(data.preferences));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipe?.id, streaming]);

  if (error) {
    return (
      <div
        className="rounded-lg border border-danger/30 bg-surface-default p-4 text-danger"
        role="alert"
      >
        <p>{error}</p>
        {isQuotaError(error) && (
          <p className="mt-2 text-sm">
            <Link href="/app/me" className="text-brand-primary underline hover:no-underline">
              查看配額
            </Link>
          </p>
        )}
      </div>
    );
  }

  if (!recipe && streaming) {
    return (
      <div
        className="space-y-3 rounded-lg border border-border-default bg-surface-default p-4"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-text-body">正在幫你安排今晚的料理，稍等一下就好。</p>
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
      {!streaming && recipe.id && <RecipeResultHero recipe={recipe} />}
      {!streaming && recipe.id && (
        <RecipeDecisionCard summary={buildDecisionSummary(recipe)} />
      )}
      <h2 className="font-serif text-2xl text-text-ink">
        {recipe.recipe_name ?? (streaming ? "生成中…" : "未命名食譜")}
      </h2>
      {recipe.summary && <p className="mt-2 text-sm text-text-muted">{recipe.summary}</p>}
      {recipe.cuisine && (
        <div className="mt-2">
          <Chip label={recipe.cuisine} />
        </div>
      )}
      {!streaming && recipe.id && (
        <RecipeSafetyNotice avoidLabels={avoidLabels} />
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
      {recipe.shopping_list &&
        Array.isArray(recipe.shopping_list) &&
        recipe.shopping_list.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-medium text-text-ink">還需採買</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-text-muted">
              {(recipe.shopping_list as unknown[]).map((row, i) => {
                const label =
                  typeof row === "string"
                    ? row
                    : row && typeof row === "object" && "name" in row
                      ? String((row as { name: string }).name)
                      : String(row);
                const atHome =
                  pantryItems.length > 0 &&
                  isPantryMatch(label, pantryNameKeys(pantryItems));
                return (
                  <li
                    key={i}
                    className={atHome ? "text-text-muted/60 line-through" : undefined}
                  >
                    {label}
                    {atHome ? "（家裡已有）" : null}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      {recipe.steps && recipe.steps.length > 0 && (
        <section className="mt-4">
          <h3 className="text-sm font-medium text-text-ink">步驟</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-text-muted">
            {recipe.steps.map((step, i) => {
              const tip = formatStepTip(step);
              return (
                <li key={i}>
                  {pantryItems.length
                    ? formatStepForPantry(step, pantryItems)
                    : formatStep(step)}
                  {tip ? (
                    <p className="mt-1 text-xs italic text-text-muted">💡 {tip}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {streaming && !recipe.steps?.length && (
        <p className="mt-4 text-xs text-text-muted">正在組裝步驟…</p>
      )}
    </article>
  );
}
