"use client";

import { Suspense } from "react";
import Link from "next/link";
import { GreetingHeader } from "@/components/patterns/GreetingHeader";
import { SectionHeader } from "@/components/patterns/SectionHeader";
import { PrefillHeroInput } from "@/components/patterns/PrefillHeroInput";
import { StreamingRecipe } from "@/components/patterns/StreamingRecipe";
import { RecipeCardSkeleton } from "@/components/patterns/RecipeCard";
import { RecipeCardWithHero } from "@/components/recipe/RecipeCardWithHero";
import { EmptyStateOnboarding } from "@/components/patterns/EmptyStateOnboarding";
import { InspirationCard } from "@/components/patterns/InspirationCard";
import { Button } from "@/components/primitives/Button";
import { useRecipeGeneration } from "@/hooks/useRecipeGeneration";
import { listRecipes } from "@/lib/api/recipes";
import { recipeListItemToCard } from "@/lib/recipe-display";
import { useEffect, useState } from "react";
export default function TodayPage() {
  const { recipe, streaming, error, generate, reset } = useRecipeGeneration();
  const [recent, setRecent] = useState<ReturnType<typeof recipeListItemToCard>[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoadingRecent(false);
    }, 12_000);

    (async () => {
      try {
        const res = await listRecipes({ limit: 6 });
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
    <div className="space-y-8">
      <GreetingHeader />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-8 min-w-0">
          <section aria-label="生成食譜">
            <Suspense fallback={null}>
              <PrefillHeroInput
                disabled={streaming}
                streaming={streaming}
                onSubmit={(message) => generate({ message })}
              />
            </Suspense>
            {(recipe || streaming || error) && (
              <div className="mt-4 space-y-3">
                <StreamingRecipe recipe={recipe} streaming={streaming} error={error} />
                {recipe?.id && !streaming && (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/app/library/${recipe.id}`}>查看詳情</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={reset}>
                      再來一道
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section aria-label="最近食譜">
            <SectionHeader title="最近做過" actionHref="/app/library" />
            {loadingRecent ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <RecipeCardSkeleton key={i} />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <EmptyStateOnboarding
                disabled={streaming}
                onPick={(message) => generate({ message })}
              />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {recent.map((r) => (
                  <RecipeCardWithHero
                    key={r.id}
                    recipe={r}
                    href={`/app/library/${r.id}`}
                    compact
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <InspirationCard />
        </div>
      </div>
    </div>
  );
}
