"use client";

import { Share2 } from "lucide-react";
import { buildWeekPlanShareUrl } from "@/domain/plan/share-week";
import { getSiteUrl } from "@/platform/config/site-url";
import { capture } from "@/platform/analytics/events";
import { Button } from "@/components/primitives/Button";
import { useToast } from "@/components/providers/ToastProvider";

export type ShareWeekPlanButtonProps = {
  weekOf: string;
};

export function ShareWeekPlanButton({ weekOf }: ShareWeekPlanButtonProps) {
  const { toast } = useToast();
  const url = buildWeekPlanShareUrl(getSiteUrl(), weekOf);

  const onShare = async () => {
    capture("meal_plan_week_shared", { channel: "link" });
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "本週菜單",
          text: "我們家這週的菜單",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "已複製週菜單連結" });
    } catch {
      toast({ title: "無法分享", variant: "error" });
    }
  };

  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => void onShare()}>
      <Share2 className="size-4" aria-hidden />
      分享本週菜單
    </Button>
  );
}
