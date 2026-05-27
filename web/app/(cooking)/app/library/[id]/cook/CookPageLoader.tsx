"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { recipePayloadToCooking } from "@/domain/cook/normalizeSteps";
import type { CookingRecipe } from "@/domain/cook/types";
import { fetchRecipeWithOffline } from "@/platform/sync/recipes";
import { parseCookSource } from "@/domain/cook/cook-source";
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
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      const { recipe: payload } = await fetchRecipeWithOffline(id);
      const cooking = recipePayloadToCooking(payload);
      if (!cooking.steps.length) {
        if (!cancelled) router.replace(`/app/library/${id}`);
        return null;
      }
      return cooking;
    };

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cooking = await load();
        if (!cooking || cancelled) return;
        setRecipe(cooking);

        const needsPoll = cooking.steps.some(
          (s) =>
            s.imageStatus === "pending" ||
            s.imageStatus === "generating" ||
            (s.imageStatus === "ready" && !s.imageUrl),
        );
        if (needsPoll) {
          pollTimer = setInterval(async () => {
            try {
              const next = await load();
              if (!next || cancelled) return;
              setRecipe(next);
              const done = !next.steps.some(
                (s) => s.imageStatus === "pending" || s.imageStatus === "generating",
              );
              if (done && pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
              }
            } catch {
              /* keep last state */
            }
          }, 4000);
        }
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
      if (pollTimer) clearInterval(pollTimer);
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
  const cookSource = parseCookSource(searchParams.get("source"));

  return (
    <CookPageClient
      recipe={recipe}
      initialStep={initialStep}
      initialVoice={initialVoice}
      cookSource={cookSource}
    />
  );
}
