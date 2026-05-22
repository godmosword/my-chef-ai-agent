"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Card } from "@/components/primitives/Card";
import { Chip } from "@/components/primitives/Chip";
import { formatRelativeTime } from "@/lib/utils/format";
import type { RecipeCardModel } from "@/lib/recipe-display";
import { cn } from "@/lib/utils/cn";

export type RecipeCardProps = {
  recipe: RecipeCardModel;
  href: string;
  compact?: boolean;
  onFavoriteToggle?: () => void;
  favorited?: boolean;
  className?: string;
};

export function RecipeCard({
  recipe,
  href,
  compact,
  onFavoriteToggle,
  favorited,
  className,
}: RecipeCardProps) {
  return (
    <Card
      as="article"
      interactive
      padding="none"
      className={cn("group overflow-hidden", compact ? "min-w-[15rem] shrink-0" : "h-[12.5rem]", className)}
    >
      <Link href={href} className="flex h-full flex-col focus:outline-none">
        <div className="relative h-28 shrink-0 bg-surface-muted">
          {recipe.heroUrl ? (
            <Image
              src={recipe.heroUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 240px, 320px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-text-muted">
              尚無主圖
            </div>
          )}
          {onFavoriteToggle && (
            <button
              type="button"
              aria-label={favorited ? "取消收藏" : "收藏"}
              className="absolute right-2 top-2 rounded-full bg-surface-default/90 p-1.5 shadow-card"
              onClick={(e) => {
                e.preventDefault();
                onFavoriteToggle();
              }}
            >
              <Heart
                className={cn("size-4", favorited && "fill-brand-primary text-brand-primary")}
                aria-hidden
              />
            </button>
          )}
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
