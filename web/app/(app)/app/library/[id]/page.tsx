"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getRecipe } from "@/lib/api/recipes";
import type { RecipePayload } from "@chef/shared-types";
import { formatIngredient, formatStep } from "@/lib/recipe-steps";
import { Skeleton } from "@/components/primitives/Skeleton";
import { Button } from "@/components/primitives/Button";
import { ArrowLeft, ChefHat } from "lucide-react";
import { FLAGS } from "@/lib/flags";

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [recipe, setRecipe] = useState<RecipePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRecipe(id);
        if (!cancelled) setRecipe(res.recipe);
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
          返回 Library
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

      {recipe && !loading && (
        <article>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="font-serif text-3xl text-text-ink">
              {recipe.recipe_name ?? "食譜"}
            </h1>
            {FLAGS.cookingMode && recipe.id && (
              <Button asChild size="lg" className="shrink-0">
                <Link href={`/app/library/${recipe.id}/cook`}>
                  <ChefHat className="size-5" aria-hidden />
                  進入烹飪模式
                </Link>
              </Button>
            )}
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
