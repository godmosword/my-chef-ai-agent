"use client";

import { useEffect } from "react";
import Link from "next/link";
import { capture } from "@/lib/analytics/events";
import {
  DEMO_CHILD_TIP,
  DEMO_RECIPE,
  DEMO_RECIPE_ID,
  DEMO_SAFETY_TIP,
  DEMO_SWAP_TIP,
} from "@/lib/demo/demo-recipe";
import { RecipeDetailLayout } from "@/components/recipe/RecipeDetailLayout";
import { RecipeDetailSections } from "@/components/recipe/RecipeDetailSections";
import { Button } from "@/components/primitives/Button";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

const DEMO_PREFILL =
  "電鍋雞肉蔬菜炊飯，兩大一小，30 分鐘，不辣，一鍋完成";

export function DemoRecipeView() {
  useEffect(() => {
    capture("demo_recipe_viewed", { source: "demo_page" });
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <p className="mb-4 rounded-lg border border-brand-primary/30 bg-brand-primaryLight px-3 py-2 text-sm text-text-body">
          示範食譜 · 不消耗配額 · 不會寫入你的料理書
        </p>

        <RecipeDetailLayout
          recipe={{ ...DEMO_RECIPE, id: DEMO_RECIPE_ID }}
          cookHref="/demo/recipe/cook"
        >
          <div className="space-y-3 text-sm text-text-body">
            <p>
              <span className="font-medium text-text-ink">約 30 分鐘</span>
              {" · "}
              兩大一小 · 簡單 · 一鍋完成
            </p>
            <p className="rounded-lg bg-surface-muted px-3 py-2">{DEMO_CHILD_TIP}</p>
            <p className="rounded-lg border border-border-default px-3 py-2">
              {DEMO_SAFETY_TIP}
            </p>
            <p className="text-text-muted">{DEMO_SWAP_TIP}</p>
          </div>
          <RecipeDetailSections
            ingredients={DEMO_RECIPE.ingredients}
            steps={DEMO_RECIPE.steps}
            servings={DEMO_RECIPE.servings}
          />
        </RecipeDetailLayout>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link
              href={`/app?prefill=${encodeURIComponent(DEMO_PREFILL)}`}
              onClick={() =>
                capture("demo_recipe_generate_clicked", { source: "demo_page" })
              }
            >
              用我的食材生成類似料理
            </Link>
          </Button>
          <Button asChild variant="secondary" className="flex-1">
            <Link href="/">回到首頁</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
