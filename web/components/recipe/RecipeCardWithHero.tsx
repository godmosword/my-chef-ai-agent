"use client";

import {
  RecipeCard,
  type RecipeCardProps,
} from "@/components/patterns/RecipeCard";
import { useHeroPolling } from "@/hooks/useHeroPolling";
import type { HeroStatus } from "@chef/shared-types";

/** Recipe card that polls hero-status while image is generating. */
export function RecipeCardWithHero(props: RecipeCardProps) {
  const { recipe } = props;
  const shouldPoll =
    recipe.heroStatus === "pending" || recipe.heroStatus === "generating";

  const { status, url } = useHeroPolling(
    recipe.id,
    recipe.heroStatus,
    recipe.heroUrl,
    shouldPoll,
  );

  return (
    <RecipeCard
      {...props}
      recipe={{
        ...recipe,
        heroStatus: status as HeroStatus,
        heroUrl: url ?? recipe.heroUrl,
      }}
    />
  );
}
