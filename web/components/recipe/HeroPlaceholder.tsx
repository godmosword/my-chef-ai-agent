"use client";

import { ChefHat, Paintbrush } from "lucide-react";
import type { HeroStatus } from "@chef/shared-types";

const CUISINE_GRADIENTS: Record<string, string> = {
  台式: "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-primaryDark))",
  日式: "linear-gradient(135deg, var(--color-cuisine-japanese), var(--color-text-muted))",
  義式: "linear-gradient(135deg, var(--color-brand-greenLight), var(--color-brand-green))",
  中式: "linear-gradient(135deg, var(--color-brand-primaryLight), var(--color-brand-primary))",
  韓式: "linear-gradient(135deg, var(--color-surface-muted), var(--color-cuisine-taiwanese))",
  泰式: "linear-gradient(135deg, var(--color-brand-greenLight), var(--color-cuisine-thai))",
  西式: "linear-gradient(135deg, var(--color-surface-alt), var(--color-cuisine-european))",
  default: "linear-gradient(135deg, var(--color-surface-muted), var(--color-text-muted))",
};

function gradientForCuisine(cuisine?: string | null): string {
  if (!cuisine?.trim()) return CUISINE_GRADIENTS.default;
  const key = Object.keys(CUISINE_GRADIENTS).find((k) => cuisine.includes(k));
  return key ? CUISINE_GRADIENTS[key]! : CUISINE_GRADIENTS.default;
}

export type HeroPlaceholderProps = {
  status: HeroStatus | string;
  cuisine?: string | null;
  error?: string | null;
  className?: string;
};

export function HeroPlaceholder({
  status,
  cuisine,
  error,
  className,
}: HeroPlaceholderProps) {
  const gradient = gradientForCuisine(cuisine);
  const isLoading = status === "pending" || status === "generating";
  const showHat = status === "failed" || status === "skipped";

  return (
    <div
      className={className ?? "flex h-full w-full flex-col items-center justify-center relative gap-2 px-3 text-center"}
      style={{ background: gradient }}
    >
      {isLoading && (
        <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur">
          <Paintbrush className="size-3 animate-pulse text-white" aria-hidden />
          <span className="text-xs text-white">正在繪製...</span>
        </div>
      )}
      {showHat && <ChefHat className="size-8 text-white/70" aria-hidden />}
      {showHat && error && (
        <p className="max-w-[18rem] text-xs leading-snug text-white/90">{error}</p>
      )}
    </div>
  );
}
