"use client";

import {
  Award,
  ChefHat,
  Crown,
  Flame,
  Heart,
  Share2,
  Sprout,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils/cn";

interface AchievementSpec {
  key: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  unlocked: (input: AchievementInput) => boolean;
  hint: string;
}

interface AchievementInput {
  recipeCount: number;
  favoritesCount: number;
  sharedCount: number;
  currentStreak: number;
  longestStreak: number;
}

const ACHIEVEMENTS: AchievementSpec[] = [
  {
    key: "first-recipe",
    label: "開鍋",
    Icon: Sprout,
    unlocked: ({ recipeCount }) => recipeCount >= 1,
    hint: "建立第 1 道食譜",
  },
  {
    key: "five-recipes",
    label: "入門",
    Icon: ChefHat,
    unlocked: ({ recipeCount }) => recipeCount >= 5,
    hint: "建立 5 道食譜",
  },
  {
    key: "first-favorite",
    label: "心頭好",
    Icon: Heart,
    unlocked: ({ favoritesCount }) => favoritesCount >= 1,
    hint: "收藏第 1 道菜",
  },
  {
    key: "first-share",
    label: "分享家",
    Icon: Share2,
    unlocked: ({ sharedCount }) => sharedCount >= 1,
    hint: "公開分享第 1 道菜",
  },
  {
    key: "streak-3",
    label: "連續 3 天",
    Icon: Flame,
    unlocked: ({ longestStreak }) => longestStreak >= 3,
    hint: "連續下廚 3 天",
  },
  {
    key: "streak-7",
    label: "一週不間斷",
    Icon: Award,
    unlocked: ({ longestStreak }) => longestStreak >= 7,
    hint: "連續下廚 7 天",
  },
  {
    key: "twenty-recipes",
    label: "家常老手",
    Icon: Crown,
    unlocked: ({ recipeCount }) => recipeCount >= 20,
    hint: "建立 20 道食譜",
  },
];

export interface AchievementsRowProps extends AchievementInput {}

export function AchievementsRow(props: AchievementsRowProps) {
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked(props)).length;

  return (
    <section aria-label="成就" className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-text-ink">成就</h3>
        <span className="text-xs text-text-muted">
          {unlockedCount} / {ACHIEVEMENTS.length} 已解鎖
        </span>
      </header>

      <ul
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2"
        role="list"
      >
        {ACHIEVEMENTS.map(({ key, label, Icon, unlocked, hint }) => {
          const isOn = unlocked(props);
          return (
            <li key={key} className="shrink-0">
              <div
                title={hint}
                className={cn(
                  "flex w-24 flex-col items-center gap-2 rounded-lg border p-3 text-center",
                  isOn
                    ? "border-brand-primary/40 bg-brand-primaryLight"
                    : "border-border-default bg-surface-muted",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full",
                    isOn
                      ? "bg-gradient-to-br from-brand-primary to-brand-primaryDark text-white"
                      : "bg-surface-default text-text-muted",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <p
                  className={cn(
                    "text-xs font-medium leading-tight",
                    isOn ? "text-brand-primaryDark" : "text-text-muted",
                  )}
                >
                  {label}
                </p>
                <p className="text-[10px] leading-tight text-text-muted">
                  {hint}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
