"use client";

import { useCallback } from "react";
import { Button } from "@/components/primitives/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { buildShareUrl } from "@/platform/config/site-url";

export function ShareTargets({ token }: { token: string }) {
  const { toast } = useToast();
  const url = buildShareUrl(token, "line");

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "已複製連結" });
    } catch {
      toast({ title: "無法複製", variant: "error" });
    }
  }, [toast, url]);

  const canNativeShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  const nativeShare = useCallback(async () => {
    if (!canNativeShare) return copy();
    try {
      await navigator.share({ url, title: "職人料理大腦食譜" });
    } catch {
      /* cancelled */
    }
  }, [canNativeShare, copy, url]);

  if (canNativeShare) {
    return (
      <Button type="button" variant="secondary" onClick={nativeShare}>
        分享
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="secondary" size="sm">
        <a
          href={`https://line.me/R/msg/text/?${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          LINE
        </a>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </a>
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={copy}>
        複製連結
      </Button>
    </div>
  );
}
