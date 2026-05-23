"use client";

import Image from "next/image";
import type { RecipePayload } from "@chef/shared-types";
import { HeroPlaceholder } from "@/components/recipe/HeroPlaceholder";
import { useHeroPolling } from "@/hooks/useHeroPolling";

export function RecipeResultHero({ recipe }: { recipe: RecipePayload }) {
  const initialStatus =
    recipe.hero_status ?? (recipe.photo_url ? "ready" : "pending");
  const { status, url } = useHeroPolling(
    recipe.id,
    initialStatus,
    recipe.photo_url,
    Boolean(recipe.id) &&
      (initialStatus === "pending" || initialStatus === "generating"),
  );
  const heroUrl = url ?? recipe.photo_url;

  return (
    <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl border border-border-default">
      {status === "ready" && heroUrl ? (
        <Image
          src={heroUrl}
          alt=""
          fill
          className="object-cover"
          unoptimized
          sizes="640px"
        />
      ) : (
        <HeroPlaceholder
          status={status}
          cuisine={recipe.cuisine ?? recipe.theme}
        />
      )}
    </div>
  );
}
