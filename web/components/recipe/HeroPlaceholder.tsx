"use client";

import { ChefHat, Paintbrush } from "lucide-react";
import type { HeroStatus } from "@chef/shared-types";

const CUISINE_COLORS: Record<string, [string, string]> = {
  台式: ["#E5A33D", "#C8881A"],
  日式: ["#F5C4B3", "#D85A30"],
  義式: ["#C0DD97", "#639922"],
  中式: ["#FAC775", "#BA7517"],
  韓式: ["#F7C1C1", "#A32D2D"],
  泰式: ["#9FE1CB", "#1D9E75"],
  西式: ["#B5D4F4", "#378ADD"],
  default: ["#D9CFBE", "#A39A8E"],
};

function colorsForCuisine(cuisine?: string | null): [string, string] {
  if (!cuisine?.trim()) return CUISINE_COLORS.default;
  const key = Object.keys(CUISINE_COLORS).find((k) => cuisine.includes(k));
  return key ? CUISINE_COLORS[key]! : CUISINE_COLORS.default;
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
  const [from, to] = colorsForCuisine(cuisine);
  const isLoading = status === "pending" || status === "generating";
  const showHat = status === "failed" || status === "skipped";

  return (
    <div
      className={className ?? "flex h-full w-full flex-col items-center justify-center relative gap-2 px-3 text-center"}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {isLoading && (
        <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur">
          <Paintbrush className="size-3 animate-pulse text-white" aria-hidden />
          <span className="text-[11px] text-white">正在繪製...</span>
        </div>
      )}
      {showHat && <ChefHat className="size-8 text-white/70" aria-hidden />}
      {showHat && error && (
        <p className="max-w-[18rem] text-[11px] leading-snug text-white/90">{error}</p>
      )}
    </div>
  );
}
