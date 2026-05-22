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
      <div>
        <div className="text-xs text-text-muted">文字配額</div>
        <ProgressBar value={text.used} max={text.limit} className="mt-1" />
        <div className="mt-0.5 text-xs text-text-muted">
          {text.remaining} / {text.limit} 次
        </div>
      </div>
      <div>
        <div className="text-xs text-text-muted">圖片配額</div>
        <ProgressBar value={image.used} max={image.limit} className="mt-1" />
        <div className="mt-0.5 text-xs text-text-muted">
          {image.remaining} / {image.limit} 次
        </div>
      </div>
    </div>
  );
}
