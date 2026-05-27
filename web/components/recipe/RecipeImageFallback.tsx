"use client";

import { getCuisineMeta } from "@/domain/recipe/cuisine-meta";
import { cn } from "@/lib/utils/cn";

export type RecipeImageFallbackProps = {
  cuisine?: string | null;
  className?: string;
};

export function RecipeImageFallback({ cuisine, className }: RecipeImageFallbackProps) {
  const meta = getCuisineMeta(cuisine);
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        meta.bgClass,
        className,
      )}
      aria-hidden
    >
      <span className="text-5xl">{meta.emoji}</span>
    </div>
  );
}
