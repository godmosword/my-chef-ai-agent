"use client";

import Link from "next/link";
import type { RecipePayload } from "@chef/shared-types";
import { ChefHat } from "lucide-react";
import { Chip } from "@/components/primitives/Chip";
import { Button } from "@/components/primitives/Button";
import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import { FLAGS } from "@/lib/flags";

type RecipeDetailLayoutProps = {
  recipe: RecipePayload;
  headerActions?: React.ReactNode;
  onHeroUpdated?: (patch: Partial<RecipePayload>) => void;
  children: React.ReactNode;
};

export function RecipeDetailLayout({
  recipe,
  headerActions,
  onHeroUpdated,
  children,
}: RecipeDetailLayoutProps) {
  const showStickyCook = FLAGS.cookingMode && Boolean(recipe.id);

  return (
    <article className={showStickyCook ? "pb-24 md:pb-0" : undefined}>
      <RecipeDetailHero recipe={recipe} onHeroUpdated={onHeroUpdated} />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="font-serif text-3xl text-text-ink">
            {recipe.recipe_name ?? "食譜"}
          </h1>
          {recipe.cuisine && <Chip label={recipe.cuisine} />}
        </div>
        {headerActions && (
          <div className="flex shrink-0 flex-wrap gap-2">{headerActions}</div>
        )}
      </div>

      {recipe.summary && (
        <p className="mt-2 text-text-muted">{recipe.summary}</p>
      )}

      <div className="mt-6 space-y-6">{children}</div>

      {showStickyCook && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-surface-default/95 p-3 pb-safe backdrop-blur md:hidden">
          <Button asChild size="lg" className="w-full">
            <Link href={`/app/library/${recipe.id}/cook`}>
              <ChefHat className="size-5" aria-hidden />
              進入烹飪模式
            </Link>
          </Button>
        </div>
      )}
    </article>
  );
}
