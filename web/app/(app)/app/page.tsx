"use client";

import { Suspense } from "react";
import Link from "next/link";
import { GreetingHeader } from "@/components/patterns/GreetingHeader";
import { PrefillHeroInput } from "@/components/patterns/PrefillHeroInput";
import { StreamingRecipe } from "@/components/patterns/StreamingRecipe";
import { RecipeCardSkeleton } from "@/components/patterns/RecipeCard";
import { RecipeCardWithHero } from "@/components/recipe/RecipeCardWithHero";
import { EmptyStateOnboarding } from "@/components/patterns/EmptyStateOnboarding";
import { Button } from "@/components/primitives/Button";
import { useRecipeGeneration } from "@/hooks/useRecipeGeneration";
import { listRecipes } from "@/lib/api/recipes";
import { recipeListItemToCard } from "@/lib/recipe-display";
import { useEffect, useState } from "react";
import { AppOnboardingOverlay } from "@/components/onboarding/AppOnboardingOverlay";

export default function TodayPage() {
  const { recipe, streaming, error, generate, reset } = useRecipeGeneration();
  const [recent, setRecent] = useState<ReturnType<typeof recipeListItemToCard>[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listRecipes({ limit: 6 });
        if (!cancelled) {
          setRecent(res.items.map(recipeListItemToCard));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipe?.id]);

  return (
    <div className="page-enter space-y-8">
      <AppOnboardingOverlay />
      <GreetingHeader />

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

      <section className="mt-7" aria-label="最近食譜">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-text-ink">最近做過</h2>
          <Link
            href="/app/library"
            className="text-xs text-brand-primary hover:underline"
          >
            看全部 <span aria-hidden>→</span>
          </Link>
        </header>
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
  );
}
