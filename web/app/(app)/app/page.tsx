"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GreetingHeader } from "@/components/app-home/GreetingHeader";
import { RecentRecipes } from "@/components/app-home/RecentRecipes";
import { InspirationCards } from "@/components/app-home/InspirationCards";
import { PrefillHeroInput } from "@/components/patterns/PrefillHeroInput";
import { StreamingRecipe } from "@/components/patterns/StreamingRecipe";
import { Button } from "@/components/primitives/Button";
import { useRecipeGeneration } from "@/hooks/useRecipeGeneration";
import { useTonightPantry } from "@/hooks/useTonightPantry";
import { TonightPantryPanel } from "@/components/app-home/TonightPantryPanel";
import { AddToWeekPlanButton } from "@/components/app-home/AddToWeekPlanButton";
import { FLAGS } from "@/platform/config/flags";
import { listRecipes } from "@/application/api/recipes";
import { reportRegenerateFeedback } from "@/application/api/recipe-feedback";
import { recipeListItemToCard } from "@/domain/recipe/recipe-display";
import { useEffect, useState } from "react";

export default function TodayPage() {
  const router = useRouter();
  const { recipe, streaming, error, errorView, generate, reset } = useRecipeGeneration();
  const { items: pantryItems } = useTonightPantry();
  const [recent, setRecent] = useState<ReturnType<typeof recipeListItemToCard>[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoadingRecent(false);
    }, 12_000);

    (async () => {
      try {
        const res = await listRecipes({ limit: 8 });
        if (!cancelled) {
          setRecent(res.items.map(recipeListItemToCard));
        }
      } catch {
        if (!cancelled) setRecent([]);
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [recipe?.id]);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <GreetingHeader />

      <section aria-label="生成食譜" className="space-y-4">
        {FLAGS.pantryTonight && (
          <TonightPantryPanel disabled={streaming} />
        )}
        <Suspense fallback={null}>
          <PrefillHeroInput
            disabled={streaming}
            streaming={streaming}
            error={error}
            errorView={errorView}
            onSubmit={(message) =>
              generate({
                message,
                pantry_items:
                  FLAGS.pantryTonight && pantryItems.length > 0
                    ? pantryItems
                    : undefined,
              })
            }
          />
        </Suspense>
        {(recipe || streaming) && (
          <div className="space-y-3">
            <StreamingRecipe
              recipe={recipe}
              streaming={streaming}
              error={null}
              pantryItems={FLAGS.pantryTonight ? pantryItems : []}
            />
            {recipe?.id && !streaming && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/app/library/${recipe.id}`}>查看詳情</Link>
                </Button>
                {FLAGS.mealPlan && (
                  <AddToWeekPlanButton
                    recipeId={recipe.id}
                    recipeTitle={recipe.recipe_name}
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (recipe?.recipe_name) {
                      void reportRegenerateFeedback(
                        recipe.recipe_name,
                        recipe.cuisine,
                      );
                    }
                    reset();
                  }}
                >
                  再來一道
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      <RecentRecipes
        items={recent}
        loading={loadingRecent}
        disabled={streaming}
        onGenerate={(message) => generate({ message })}
      />

      <InspirationCards
        disabled={streaming}
        onPick={(prefill) => {
          router.replace(`/app?prefill=${encodeURIComponent(prefill)}`);
        }}
      />
    </div>
  );
}
