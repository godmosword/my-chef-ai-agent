"use client";

import dynamic from "next/dynamic";
import type { CookingRecipe } from "@/domain/cook/types";
import type { CookAnalyticsSource } from "@/domain/cook/cook-source";

const CookingModeClient = dynamic(
  () =>
    import("@/components/cooking/CookingModeClient").then((m) => m.CookingModeClient),
  {
    ssr: false,
    loading: () => (
      <div className="cooking-mode flex min-h-screen items-center justify-center text-text-ink">
        載入烹飪模式…
      </div>
    ),
  },
);

export type CookPageClientProps = {
  recipe: CookingRecipe;
  initialStep: number;
  initialVoice: boolean;
  cookSource?: CookAnalyticsSource;
};

export function CookPageClient(props: CookPageClientProps) {
  return <CookingModeClient {...props} />;
}
