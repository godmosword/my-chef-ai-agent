"use client";

import Image from "next/image";
import type { RecipePayload } from "@chef/shared-types";
import { HeroPlaceholder } from "@/components/recipe/HeroPlaceholder";
import { useHeroPolling } from "@/hooks/useHeroPolling";

export function RecipeResultHero({ recipe }: { recipe: RecipePayload }) {
  const initialStatus =
    recipe.hero_status ?? (recipe.photo_url ? "ready" : "pending");
  const { status, url, error } = useHeroPolling(
    recipe.id,
    initialStatus,
    recipe.photo_url,
    Boolean(recipe.id) &&
      (initialStatus === "pending" || initialStatus === "generating"),
  );
  const heroUrl = url ?? recipe.photo_url ?? "";
  const canShowImage =
    heroUrl.length > 0 &&
    (status === "ready" ||
      heroUrl.startsWith("/") ||
      heroUrl.startsWith("data:"));

  return (
    <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl border border-border-default">
      {canShowImage ? (
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
          error={error}
        />
      )}
    </div>
  );
}
