"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { HeroPlaceholder } from "@/components/recipe/HeroPlaceholder";
import { RecipeImageFallback } from "@/components/recipe/RecipeImageFallback";
import { Card } from "@/components/primitives/Card";
import { Chip } from "@/components/primitives/Chip";
import { formatRelativeTime } from "@/lib/utils/format";
import type { RecipeCardModel } from "@/lib/recipe-display";
import { cn } from "@/lib/utils/cn";
import type { HeroStatus } from "@chef/shared-types";

export type RecipeCardProps = {
  recipe: RecipeCardModel;
  href: string;
  compact?: boolean;
  onFavoriteToggle?: () => void;
  favorited?: boolean;
  onDelete?: () => void;
  className?: string;
};

export function RecipeCard({
  recipe,
  href,
  compact,
  onFavoriteToggle,
  favorited,
  onDelete,
  className,
}: RecipeCardProps) {
  const [heroImageError, setHeroImageError] = useState(false);
  const showHeroImage =
    recipe.heroUrl &&
    !heroImageError &&
    (recipe.heroStatus === "ready" ||
      recipe.heroUrl.startsWith("/") ||
      recipe.heroUrl.startsWith("data:"));
  const heroLoading =
    recipe.heroStatus === "pending" || recipe.heroStatus === "generating";

  return (
    <Card
      as="article"
      interactive
      padding="none"
      className={cn(
        "recipe-card group overflow-hidden",
        compact ? "min-w-[15rem] shrink-0" : "h-[12.5rem]",
        className,
      )}
    >
      <Link href={href} className="flex h-full flex-col focus:outline-none">
        <div
          className="relative h-28 shrink-0 overflow-hidden bg-surface-muted"
          title={
            recipe.heroUrl &&
            (recipe.heroStatus === "ready" ||
              recipe.heroUrl.startsWith("/") ||
              recipe.heroUrl.startsWith("data:"))
              ? "主圖已儲存"
              : undefined
          }
        >
          {showHeroImage ? (
            <Image
              src={recipe.heroUrl!}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 240px, 320px"
              unoptimized
              onError={() => setHeroImageError(true)}
            />
          ) : heroLoading ? (
            <HeroPlaceholder
              status={(recipe.heroStatus ?? "pending") as HeroStatus}
              cuisine={recipe.cuisine}
            />
          ) : (
            <RecipeImageFallback
              cuisine={recipe.cuisine}
              className="h-full w-full"
            />
          )}
          {recipe.cuisine && (
            <span
              className={cn(
                "absolute top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white backdrop-blur",
                onFavoriteToggle ? "left-2" : "right-2",
              )}
            >
              {recipe.cuisine}
            </span>
          )}
          <div className="absolute right-2 top-2 flex gap-1">
            {onDelete ? (
              <button
                type="button"
                aria-label="刪除食譜"
                className="rounded-full bg-surface-default/90 p-1.5 shadow-card text-text-muted hover:text-danger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            ) : null}
            {onFavoriteToggle ? (
              <button
                type="button"
                aria-label={favorited ? "取消收藏" : "收藏"}
                className="rounded-full bg-surface-default/90 p-1.5 shadow-card"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFavoriteToggle();
                }}
              >
                <Heart
                  className={cn("size-4", favorited && "fill-brand-primary text-brand-primary")}
                  aria-hidden
                />
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-2 font-serif text-lg leading-snug text-text-ink">
            {recipe.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {recipe.cuisine && <Chip label={recipe.cuisine} />}
            {recipe.lastCookedAt && (
              <span className="text-xs text-text-muted">
                {formatRelativeTime(recipe.lastCookedAt)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}

export function RecipeCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-[12.5rem] min-w-[15rem] shrink-0 overflow-hidden rounded-lg border border-border-default bg-surface-default",
        className,
      )}
    >
      <div className="h-28 animate-pulse bg-surface-muted" />
      <div className="space-y-2 p-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}
