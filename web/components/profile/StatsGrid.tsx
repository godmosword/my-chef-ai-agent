"use client";

import { BookOpen, Heart, Share2, Trophy } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface StatTile {
  key: string;
  label: string;
  value: number;
  hint?: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: "amber" | "green" | "rose" | "purple";
}

export interface StatsGridProps {
  recipeCount: number;
  favoritesCount: number;
  sharedCount: number;
  longestStreak: number;
}

const ACCENT_CLASSES: Record<StatTile["accent"], string> = {
  amber: "bg-brand-primaryLight text-brand-primaryDark",
  green: "bg-brand-greenLight text-brand-green",
  rose: "bg-[#FBE9E4] text-[#B0432D]",
  purple: "bg-[#EFEAF7] text-[#5E4889]",
};

export function StatsGrid({
  recipeCount,
  favoritesCount,
  sharedCount,
  longestStreak,
}: StatsGridProps) {
  const tiles: StatTile[] = [
    {
      key: "recipes",
      label: "食譜",
      value: recipeCount,
      hint: "已建立",
      Icon: BookOpen,
      accent: "amber",
    },
    {
      key: "favorites",
      label: "收藏",
      value: favoritesCount,
      hint: "最愛的菜",
      Icon: Heart,
      accent: "rose",
    },
    {
      key: "streak",
      label: "最長連續",
      value: longestStreak,
      hint: longestStreak > 0 ? `${longestStreak} 天` : "天",
      Icon: Trophy,
      accent: "green",
    },
    {
      key: "shared",
      label: "公開分享",
      value: sharedCount,
      hint: "連結",
      Icon: Share2,
      accent: "purple",
    },
  ];

  return (
    <section
      aria-label="統計"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {tiles.map(({ key, label, value, hint, Icon, accent }) => (
        <div
          key={key}
          className="rounded-lg border border-border-default bg-surface-default p-4 shadow-card"
        >
          <div className="flex items-start justify-between">
            <span
              aria-hidden
              className={`inline-flex size-9 items-center justify-center rounded-full ${ACCENT_CLASSES[accent]}`}
            >
              <Icon className="size-4" />
            </span>
            <span className="font-serif text-2xl text-text-ink">{value}</span>
          </div>
          <p className="mt-3 text-sm font-medium text-text-ink">{label}</p>
          {hint && <p className="text-xs text-text-muted">{hint}</p>}
        </div>
      ))}
    </section>
  );
}
