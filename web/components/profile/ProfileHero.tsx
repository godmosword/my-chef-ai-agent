"use client";

import { Flame, Sparkles } from "lucide-react";
import { chefTitle, daysSinceIso } from "@/lib/profile/title";
import { cn } from "@/lib/utils/cn";

export interface ProfileHeroProps {
  displayName?: string | null;
  currentStreak: number;
  firstRecipeAt: string | null;
  loading?: boolean;
}

export function ProfileHero({
  displayName,
  currentStreak,
  firstRecipeAt,
  loading,
}: ProfileHeroProps) {
  const name = displayName?.trim() || "美食家";
  const initial = (name[0] ?? "?").toUpperCase();
  const days = daysSinceIso(firstRecipeAt);
  const title = chefTitle(days);

  return (
    <section
      aria-label="使用者概覽"
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-border-default",
        "bg-gradient-to-br from-brand-primaryLight via-surface-default to-brand-greenLight",
        "p-6 shadow-card",
      )}
    >
      <div
        aria-hidden
        className="absolute -right-12 -top-12 size-44 rounded-full bg-brand-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-16 -left-10 size-44 rounded-full bg-brand-green/15 blur-3xl"
      />

      <div className="relative flex items-center gap-4">
        <div
          aria-hidden
          className={cn(
            "flex size-16 shrink-0 items-center justify-center rounded-full",
            "bg-gradient-to-br from-brand-primary to-brand-primaryDark",
            "font-serif text-2xl text-white shadow-card",
          )}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-green">
            {title}
          </p>
          <h2 className="mt-1 truncate font-serif text-2xl text-text-ink">
            {name}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {firstRecipeAt
              ? `已下廚 ${days} 天`
              : loading
                ? "載入中…"
                : "從第一道菜開始你的旅程"}
          </p>
        </div>
      </div>

      <div className="relative mt-5 flex items-center gap-3 rounded-full bg-surface-default/70 px-4 py-2 backdrop-blur">
        {currentStreak > 0 ? (
          <>
            <Flame
              aria-hidden
              className="size-5 shrink-0 text-brand-primary"
              fill="currentColor"
            />
            <p className="text-sm text-text-body">
              <span className="font-medium text-text-ink">
                {currentStreak} 天
              </span>{" "}
              連續下廚中，繼續加油
            </p>
          </>
        ) : (
          <>
            <Sparkles
              aria-hidden
              className="size-5 shrink-0 text-brand-green"
            />
            <p className="text-sm text-text-body">
              今天做一道菜，開啟你的連續紀錄
            </p>
          </>
        )}
      </div>
    </section>
  );
}
