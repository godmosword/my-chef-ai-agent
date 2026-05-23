"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchRecipeWithOffline } from "@/lib/offline/recipes";
import type { RecipePayload } from "@chef/shared-types";
import { formatIngredient, formatStep } from "@/lib/recipe-steps";
import { Skeleton } from "@/components/primitives/Skeleton";
import { Button } from "@/components/primitives/Button";
import { ArrowLeft, ChefHat } from "lucide-react";
import { FLAGS } from "@/lib/flags";
import { RecipeShareMenu } from "@/components/sharing/RecipeShareMenu";
import { track } from "@/lib/analytics/track";

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [recipe, setRecipe] = useState<RecipePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchRecipeWithOffline(id);
        if (!cancelled) {
          setRecipe(res.recipe);
          setFromCache(res.fromCache);
          if (res.recipe.id) {
            track("recipe_viewed", {
              recipe_id: res.recipe.id,
              source: res.fromCache ? "library_offline" : "library",
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "載入失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/app/library" className="inline-flex items-center gap-2">
          <ArrowLeft className="size-4" aria-hidden />
          返回料理書
        </Link>
      </Button>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      )}

      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}

      {fromCache && recipe && !loading && (
        <p className="text-sm text-text-muted" role="status">
          離線快取版本
        </p>
      )}

      {recipe && !loading && (
        <article>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="font-serif text-3xl text-text-ink">
              {recipe.recipe_name ?? "食譜"}
            </h1>
            <div className="flex shrink-0 flex-wrap gap-2">
              {FLAGS.sharing && recipe.id && (
                <RecipeShareMenu
                  recipeId={recipe.id}
                  initialToken={recipe.share_token}
                  initialPublishedAt={recipe.published_at}
                />
              )}
              {FLAGS.cookingMode && recipe.id && (
                <Button asChild size="lg">
                  <Link href={`/app/library/${recipe.id}/cook`}>
                    <ChefHat className="size-5" aria-hidden />
                    進入烹飪模式
                  </Link>
                </Button>
              )}
            </div>
          </div>
          {recipe.summary && (
            <p className="mt-2 text-text-muted">{recipe.summary}</p>
          )}
          {recipe.cuisine && (
            <p className="mt-1 text-sm text-text-muted">菜系：{recipe.cuisine}</p>
          )}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <section className="mt-6">
              <h2 className="font-serif text-xl text-text-ink">食材</h2>
              <ul className="mt-2 list-inside list-disc text-text-body">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>{formatIngredient(ing)}</li>
                ))}
              </ul>
            </section>
          )}
          {recipe.steps && recipe.steps.length > 0 && (
            <section className="mt-6">
              <h2 className="font-serif text-xl text-text-ink">步驟</h2>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-text-body">
                {recipe.steps.map((step, i) => (
                  <li key={i}>{formatStep(step)}</li>
                ))}
              </ol>
            </section>
          )}
          {/* TODO: version history, hero image editor — Prompt 4+ */}
        </article>
      )}
    </div>
  );
}
