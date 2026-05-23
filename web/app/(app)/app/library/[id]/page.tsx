"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchRecipeWithOffline } from "@/lib/offline/recipes";
import type { RecipePayload } from "@chef/shared-types";
import { Skeleton } from "@/components/primitives/Skeleton";
import { Button } from "@/components/primitives/Button";
import { ArrowLeft, ChefHat } from "lucide-react";
import { FLAGS } from "@/lib/flags";
import { RecipeDetailLayout } from "@/components/recipe/RecipeDetailLayout";
import { RecipeDetailSections } from "@/components/recipe/RecipeDetailSections";
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

  const headerActions =
    recipe && (FLAGS.sharing || FLAGS.cookingMode) ? (
      <>
        {FLAGS.sharing && recipe.id && (
          <RecipeShareMenu
            recipeId={recipe.id}
            initialToken={recipe.share_token}
            initialPublishedAt={recipe.published_at}
          />
        )}
        {FLAGS.cookingMode && recipe.id && (
          <Button asChild size="lg" className="hidden md:inline-flex">
            <Link href={`/app/library/${recipe.id}/cook`}>
              <ChefHat className="size-5" aria-hidden />
              進入烹飪模式
            </Link>
          </Button>
        )}
      </>
    ) : null;

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
        <RecipeDetailLayout
          recipe={recipe}
          headerActions={headerActions}
          onHeroUpdated={(patch) => setRecipe((prev) => (prev ? { ...prev, ...patch } : prev))}
        >
          <RecipeDetailSections
            ingredients={recipe.ingredients}
            steps={recipe.steps}
          />
        </RecipeDetailLayout>
      )}
    </div>
  );
}
