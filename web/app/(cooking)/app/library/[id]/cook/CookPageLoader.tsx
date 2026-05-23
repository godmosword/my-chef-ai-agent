"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { recipePayloadToCooking } from "@/lib/cooking/normalizeSteps";
import type { CookingRecipe } from "@/lib/cooking/types";
import { fetchRecipeWithOffline } from "@/lib/offline/recipes";
import { CookPageClient } from "./CookPageClient";

export default function CookPageLoader() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id;

  const [recipe, setRecipe] = useState<CookingRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { recipe: payload } = await fetchRecipeWithOffline(id);
        const cooking = recipePayloadToCooking(payload);
        if (!cooking.steps.length) {
          if (!cancelled) router.replace(`/app/library/${id}`);
          return;
        }
        if (!cancelled) setRecipe(cooking);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "無法載入食譜");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return (
      <div className="cooking-mode flex min-h-screen items-center justify-center text-text-ink">
        載入烹飪模式…
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="cooking-mode flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg text-text-ink">{error ?? "找不到食譜"}</p>
        <button
          type="button"
          className="text-brand-primary underline"
          onClick={() => router.push(`/app/library/${id}`)}
        >
          返回食譜
        </button>
      </div>
    );
  }

  const initialStep = Math.max(0, parseInt(searchParams.get("step") ?? "0", 10) || 0);
  const initialVoice = searchParams.get("voice") === "1";

  return (
    <CookPageClient
      recipe={recipe}
      initialStep={initialStep}
      initialVoice={initialVoice}
    />
  );
}
