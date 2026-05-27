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
import { listRecipes } from "@/application/api/recipes";
import { recipeListItemToCard } from "@/domain/recipe/recipe-display";
import { useEffect, useState } from "react";

export default function TodayPage() {
  const router = useRouter();
  const { recipe, streaming, error, errorView, generate, reset } = useRecipeGeneration();
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
        <Suspense fallback={null}>
          <PrefillHeroInput
            disabled={streaming}
            streaming={streaming}
            error={error}
            errorView={errorView}
            onSubmit={(message) => generate({ message })}
          />
        </Suspense>
        {(recipe || streaming) && (
          <div className="space-y-3">
            <StreamingRecipe recipe={recipe} streaming={streaming} error={null} />
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
