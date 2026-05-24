"use client";

import { useEffect, useState } from "react";
import { fetchQuota } from "@/lib/api/recipes";
import { ProgressBar } from "@/components/primitives/ProgressBar";

export function QuotaIndicator({ refreshIntervalMs = 30_000 }: { refreshIntervalMs?: number }) {
  const [text, setText] = useState({ used: 0, limit: 20, remaining: 20 });
  const [image, setImage] = useState({ used: 0, limit: 5, remaining: 5 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const q = await fetchQuota();
        if (!cancelled) {
          setText(q.text);
          setImage(q.image);
        }
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, refreshIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshIntervalMs]);

  return (
    <div className="space-y-3" aria-label="你的今日配額">
      <div title="免費方案的個人帳號每日上限，凌晨重置">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
          你的今日配額
        </p>
        <p className="mt-0.5 text-[10px] text-text-muted/80">
          免費方案 · 凌晨重置
        </p>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-text-body">文字</span>
          <span className="text-xs tabular-nums text-text-muted">
            {text.remaining} / {text.limit}
          </span>
        </div>
        <ProgressBar value={text.used} max={text.limit} tone="auto" className="mt-1.5 h-[3px]" />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-text-body">圖片</span>
          <span className="text-xs tabular-nums text-text-muted">
            {image.remaining} / {image.limit}
          </span>
        </div>
        <ProgressBar value={image.used} max={image.limit} tone="auto" className="mt-1.5 h-[3px]" />
      </div>
    </div>
  );
}
