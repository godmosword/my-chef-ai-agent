"use client";

import { useRef } from "react";
import type { RecipePayload } from "@chef/shared-types";
import { Chip } from "@/components/primitives/Chip";
import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import { RecipeStats } from "@/components/recipe/RecipeStats";
import { DesktopCookCTA, StickyCookCTA } from "@/components/recipe/StickyCookCTA";
import { FLAGS } from "@/lib/flags";
import { usePastHeroSticky } from "@/hooks/usePastHeroSticky";

type RecipeDetailLayoutProps = {
  recipe: RecipePayload;
  /** Cook mode link (library id or demo path). */
  cookHref?: string;
  headerActions?: React.ReactNode;
  onHeroUpdated?: (patch: Partial<RecipePayload>) => void;
  children: React.ReactNode;
};

export function RecipeDetailLayout({
  recipe,
  cookHref,
  headerActions,
  onHeroUpdated,
  children,
}: RecipeDetailLayoutProps) {
  const heroSentinelRef = useRef<HTMLDivElement>(null);
  const pastHero = usePastHeroSticky(heroSentinelRef);
  const resolvedCookHref =
    cookHref ??
    (recipe.id ? `/app/library/${recipe.id}/cook` : undefined);
  const showCookCta = FLAGS.cookingMode && Boolean(resolvedCookHref);

  return (
    <article className={showCookCta ? "pb-24 md:pb-0" : undefined}>
      <div ref={heroSentinelRef}>
        <RecipeDetailHero recipe={recipe} onHeroUpdated={onHeroUpdated} />
      </div>

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

      <RecipeStats
        prepMinutes={recipe.prep_minutes}
        cookMinutes={recipe.cook_minutes}
        servings={recipe.servings}
      />

      {showCookCta && resolvedCookHref ? (
        <DesktopCookCTA cookHref={resolvedCookHref} className="mt-6" />
      ) : null}

      <div className="mt-6 space-y-6">{children}</div>

      {showCookCta && resolvedCookHref ? (
        <StickyCookCTA cookHref={resolvedCookHref} visible={pastHero} />
      ) : null}
    </article>
  );
}
