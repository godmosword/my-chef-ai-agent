"use client";

import { useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { capture } from "@/platform/analytics/events";
import { DEMO_RECIPE } from "@/lib/demo/demo-recipe";
import { recipePayloadToCooking } from "@/domain/cook/normalizeSteps";

const CookingModeClient = dynamic(
  () =>
    import("@/components/cooking/CookingModeClient").then((m) => m.CookingModeClient),
  { ssr: false },
);

function toCookingRecipe() {
  const recipe = recipePayloadToCooking({ ...DEMO_RECIPE, id: "demo" });
  return recipe;
}

export default function DemoCookPage() {
  useEffect(() => {
    capture("demo_recipe_cook_mode_clicked", { source: "demo_cook_page" });
  }, []);

  return (
    <div>
      <p className="sr-only">示範烹飪模式，不會儲存進度</p>
      <CookingModeClient recipe={toCookingRecipe()} initialStep={0} initialVoice={false} />
      <div className="fixed left-4 top-4 z-50">
        <Link
          href="/demo/recipe"
          className="rounded-lg bg-surface-default/90 px-3 py-1.5 text-sm shadow-card"
        >
          ← 返回示範食譜
        </Link>
      </div>
    </div>
  );
}
