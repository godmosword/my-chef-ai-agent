"use client";

import dynamic from "next/dynamic";
import type { CookingRecipe } from "@/lib/cooking/types";

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
};

export function CookPageClient(props: CookPageClientProps) {
  return <CookingModeClient {...props} />;
}
