"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchRecipeWithOffline } from "@/lib/offline/recipes";
import type { RecipePayload } from "@chef/shared-types";
import { Skeleton } from "@/components/primitives/Skeleton";
import { Button } from "@/components/primitives/Button";
import { Heart } from "lucide-react";
import { BackLink } from "@/components/patterns/BackLink";
import { FLAGS } from "@/lib/flags";
import { listFavorites } from "@/lib/api/recipes";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { cn } from "@/lib/utils/cn";
import { RecipeDetailLayout } from "@/components/recipe/RecipeDetailLayout";
import { RecipeDetailSections } from "@/components/recipe/RecipeDetailSections";
import { RecipeNotes } from "@/components/recipe/RecipeNotes";
import { RecipeShareMenu } from "@/components/sharing/RecipeShareMenu";
import { RecipeActionsMenu } from "@/components/recipe/RecipeActionsMenu";
import { capture } from "@/lib/analytics/events";

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [recipe, setRecipe] = useState<RecipePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const { favoriteIds, toggle, syncInitial } = useFavoriteToggle(new Set());

  useEffect(() => {
    let cancelled = false;
    void listFavorites()
      .then((res) => {
        if (cancelled) return;
        const ids = new Set<string>();
        for (const f of res.items) {
          if (f.recipe_id) ids.add(f.recipe_id);
        }
        syncInitial(ids);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [syncInitial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchRecipeWithOffline(id);
        if (!cancelled) {
          setRecipe(res.recipe);
          setFromCache(res.fromCache);
          if (res.recipe.id) {
            capture("recipe_viewed", {
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

  const favorited = recipe?.id ? favoriteIds.has(recipe.id) : false;

  const headerActions =
    recipe && (FLAGS.sharing || FLAGS.cookingMode || recipe.id) ? (
      <>
        {recipe.id && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2"
            aria-label={favorited ? "取消收藏" : "收藏"}
            onClick={() => void toggle(recipe.id!)}
          >
            <Heart
              className={cn("size-5", favorited && "fill-brand-primary text-brand-primary")}
              aria-hidden
            />
          </Button>
        )}
        <RecipeActionsMenu recipe={recipe} />
        {FLAGS.sharing && recipe.id && (
          <RecipeShareMenu
            recipeId={recipe.id}
            initialToken={recipe.share_token}
            initialPublishedAt={recipe.published_at}
          />
        )}
      </>
    ) : null;

  return (
    <div className="space-y-6">
      <BackLink href="/app/library" label="返回食譜" />

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
            recipeId={recipe.id}
            ingredients={recipe.ingredients}
            steps={recipe.steps}
            servings={recipe.servings}
          />
          <RecipeNotes recipeId={recipe.id} />
        </RecipeDetailLayout>
      )}
    </div>
  );
}
