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
    <div className="space-y-3" aria-label="今日配額">
      <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
        今日配額
      </p>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-text-body">文字</span>
          <span className="text-[11px] text-text-muted">
            {text.remaining} / {text.limit}
          </span>
        </div>
        <ProgressBar value={text.used} max={text.limit} tone="auto" className="mt-1.5 h-[3px]" />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-text-body">圖片</span>
          <span className="text-[11px] text-text-muted">
            {image.remaining} / {image.limit}
          </span>
        </div>
        <ProgressBar value={image.used} max={image.limit} tone="auto" className="mt-1.5 h-[3px]" />
      </div>
    </div>
  );
}
