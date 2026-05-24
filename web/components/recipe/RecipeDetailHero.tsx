"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { HeroStatus, RecipePayload } from "@chef/shared-types";
import { HeroPlaceholder } from "@/components/recipe/HeroPlaceholder";
import { Button } from "@/components/primitives/Button";
import { useHeroPolling } from "@/hooks/useHeroPolling";
import { useToast } from "@/components/providers/ToastProvider";

type Props = {
  recipe: RecipePayload;
  onHeroUpdated?: (patch: Partial<RecipePayload>) => void;
};

export function RecipeDetailHero({ recipe, onHeroUpdated }: Props) {
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState(false);
  const initialStatus =
    recipe.hero_status ?? (recipe.photo_url ? "ready" : "skipped");

  const { status, url, error } = useHeroPolling(
    recipe.id,
    initialStatus,
    recipe.photo_url,
    initialStatus === "pending" || initialStatus === "generating",
  );

  const heroStatus = status as HeroStatus;
  const heroUrl = url ?? recipe.photo_url;

  useEffect(() => {
    if (heroStatus === "ready" && heroUrl) {
      onHeroUpdated?.({ hero_status: "ready", photo_url: heroUrl });
    } else if (heroStatus === "failed" || heroStatus === "generating") {
      onHeroUpdated?.({ hero_status: heroStatus, hero_error: error ?? undefined });
    }
  }, [heroStatus, heroUrl, error, onHeroUpdated]);

  const onRegenerate = async () => {
    if (!recipe.id) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/hero`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "無法重新生成主圖");
      }
      onHeroUpdated?.({ hero_status: "generating", photo_url: undefined });
      toast({ title: "正在繪製新主圖", variant: "default" });
    } catch (e) {
      toast({
        title: "主圖生成失敗",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/9] w-full max-w-[480px] overflow-hidden rounded-xl border border-border-default">
        {heroStatus === "ready" && heroUrl ? (
          <>
            <Image
              src={heroUrl}
              alt={recipe.recipe_name ?? "主圖"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 480px"
              unoptimized
            />
            <span
              title="主圖已永久儲存到你的料理書，不會自動消失"
              className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-green/85 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur"
            >
              <Check className="size-3" aria-hidden />
              已永久保存
            </span>
          </>
        ) : (
          <HeroPlaceholder status={heroStatus} cuisine={recipe.cuisine ?? recipe.theme} />
        )}
      </div>
      {error === "image_quota_exceeded" && (
        <p className="text-sm text-text-muted">今日圖片配額已用完</p>
      )}
      {recipe.id && (
        <Button
          variant="secondary"
          size="sm"
          disabled={regenerating || heroStatus === "generating"}
          onClick={() => void onRegenerate()}
        >
          {regenerating || heroStatus === "generating" ? "生成中…" : "重生主圖"}
        </Button>
      )}
    </div>
  );
}
