"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/primitives/Button";

type Suggestion = {
  suggestion_id: string;
  recipe_title: string;
  cuisine: string;
  estimated_time_min: number;
  priority_ingredients_used: string[];
  other_pantry_ingredients_used: string[];
  rationale: string;
  recipe_full: { recipe_name?: string; steps?: unknown[] } | null;
};

type StoredResult = {
  priority_names: string[];
  suggestions: Suggestion[];
};

export function UseItUpPanel({ onPickRecipe }: { onPickRecipe: (recipe: unknown) => void }) {
  const [data, setData] = useState<StoredResult | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("chef_use_it_up_result");
    if (!raw) return;
    try {
      setData(JSON.parse(raw) as StoredResult);
    } catch {
      setData(null);
    }
  }, []);

  if (!data?.suggestions?.length) return null;

  return (
    <section className="rounded-xl border border-surface-muted bg-surface-default p-4">
      <h2 className="font-serif text-lg text-text-ink">🍳 用這些做菜</h2>
      <p className="mt-1 text-sm text-text-muted">
        優先使用：{data.priority_names.join("、")}
      </p>
      <ul className="mt-4 space-y-4">
        {data.suggestions.map((s, idx) => (
          <li key={s.suggestion_id} className="border-t border-surface-muted pt-3">
            <p className="font-medium">
              {idx === 0 ? "⭐ " : ""}
              {s.recipe_title}
            </p>
            <p className="text-sm text-text-muted">
              {s.estimated_time_min} 分鐘 · {s.cuisine}
            </p>
            <p className="text-sm">
              用到：
              {[...s.priority_ingredients_used, ...s.other_pantry_ingredients_used].join("、")}
            </p>
            <p className="text-sm text-text-muted">{s.rationale}</p>
            {s.recipe_full?.steps ? (
              <Button
                type="button"
                className="mt-2"
                onClick={() => onPickRecipe(s.recipe_full)}
              >
                看完整食譜
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                disabled={loadingId === s.suggestion_id}
                onClick={async () => {
                  setLoadingId(s.suggestion_id);
                  try {
                    const res = await fetch("/api/me/pantry/use-it-up", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ max_suggestions: 1 }),
                    });
                    const json = await res.json();
                    const full = json.suggestions?.[0]?.recipe_full;
                    if (full) onPickRecipe(full);
                  } finally {
                    setLoadingId(null);
                  }
                }}
              >
                看完整食譜
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="ghost"
        className="mt-3"
        onClick={() => {
          sessionStorage.removeItem("chef_use_it_up_result");
          setData(null);
        }}
      >
        關閉
      </Button>
    </section>
  );
}
