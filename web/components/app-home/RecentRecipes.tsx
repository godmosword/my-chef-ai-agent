"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/patterns/SectionHeader";
import { RecipeCardSkeleton } from "@/components/patterns/RecipeCard";
import { RecipeCardWithHero } from "@/components/recipe/RecipeCardWithHero";
import type { RecipeCardModel } from "@/domain/recipe/recipe-display";
import { Button } from "@/components/primitives/Button";

export type RecentRecipesProps = {
  items: RecipeCardModel[];
  loading: boolean;
  disabled?: boolean;
  onGenerate?: (message: string) => void;
};

export function RecentRecipes({ items, loading, disabled, onGenerate }: RecentRecipesProps) {
  return (
    <section aria-label="最近食譜">
      <SectionHeader title="最近" actionHref="/app/library" actionLabel="全部 →" />
      {loading ? (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none md:px-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <RecipeCardSkeleton key={i} className="w-40 shrink-0 snap-start md:w-48" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border-default px-6 py-10 text-center">
          <span className="text-6xl" aria-hidden>
            🍳
          </span>
          <p className="mt-4 text-xl font-medium text-text-ink">還沒有食譜</p>
          <p className="mt-2 max-w-sm text-sm text-text-muted">
            從上方輸入你今晚想吃的，AI 會幫你想出可行的一餐
          </p>
          {onGenerate && (
            <Button
              className="mt-6"
              disabled={disabled}
              onClick={() => onGenerate("30 分鐘內的家常晚餐")}
            >
              去今晚生成
            </Button>
          )}
        </div>
      ) : (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none md:px-0">
          {items.slice(0, 8).map((r) => (
            <RecipeCardWithHero
              key={r.id}
              recipe={r}
              href={`/app/library/${r.id}`}
              compact
              className="w-40 shrink-0 snap-start md:w-48"
            />
          ))}
          {items.length > 8 && (
            <Link
              href="/app/library"
              className="flex w-24 shrink-0 snap-start items-center justify-center rounded-xl border border-border-default text-sm text-brand-primaryDark hover:bg-surface-muted"
            >
              全部 →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
