"use client";

import { useState } from "react";
import { capture } from "@/lib/analytics/events";
import { Button } from "@/components/primitives/Button";

type Props = {
  recipeId: string;
  stepIndex: number;
  disabled?: boolean;
};

export function StepImageButton({ recipeId, stepIndex, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    capture("step_image_requested", { step_index: stepIndex });
    capture("hero_image_generation_started", { kind: "step" });
    try {
      const res = await fetch(
        `/api/recipes/${recipeId}/steps/${stepIndex}/image`,
        { method: "POST" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        image_url?: string;
      };
      if (!res.ok) {
        const err =
          data.error ??
          (res.status === 429
            ? "今天的圖片額度已用完，但你仍可以繼續料理。"
            : "圖片暫時無法產生");
        setMessage(err);
        capture("hero_image_generation_failed", { kind: "step" });
        return;
      }
      setMessage(
        data.image_url
          ? "步驟圖已產生，重新整理後可在烹飪模式查看。"
          : "已送出，請稍後查看步驟圖。",
      );
      capture("hero_image_generation_succeeded", { kind: "step" });
    } catch {
      setMessage("圖片暫時無法產生，食譜文字仍可正常使用。");
      capture("hero_image_generation_failed", { kind: "step" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || loading}
        onClick={() => void generate()}
      >
        {loading ? "產生中…" : "產生這一步的示意圖"}
      </Button>
      <p className="mt-1 text-[11px] text-text-muted">將使用 1 次圖片額度</p>
      {message && <p className="mt-1 text-xs text-text-muted">{message}</p>}
    </div>
  );
}
