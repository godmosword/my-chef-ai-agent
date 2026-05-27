"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BackLink } from "@/components/patterns/BackLink";

type Insights = {
  plan_name: string;
  date_range: [string, string];
  slots_cooked: number;
  slots_skipped: number;
  slots_swapped: number;
  slots_total: number;
  cook_rate: number;
  estimated_total_cost: number | null;
  actual_total_cost: number | null;
  skip_reasons_summary: Record<string, number>;
  expiring_items_wasted: string[];
  new_dishes_tried: string[];
};

export default function PlanReviewPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [insights, setInsights] = useState<Insights | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/me/meal-plans/${planId}/insights`);
    const json = await res.json();
    if (json.insights) setInsights(json.insights);
  }, [planId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!insights) {
    return (
      <div className="space-y-4">
        <BackLink href="/app/dashboard" label="返回儀表板" />
        <p className="text-sm text-text-muted">載入中…</p>
      </div>
    );
  }

  const pct = Math.round(insights.cook_rate * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/app/dashboard" label="返回儀表板" />
      <header>
        <h1 className="font-serif text-2xl text-text-ink">📅 {insights.plan_name}</h1>
        <p className="text-sm text-text-muted">
          {insights.date_range[0]} ～ {insights.date_range[1]}
        </p>
      </header>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-4 space-y-2 text-sm">
        <p>
          煮了 {insights.slots_cooked}/{insights.slots_total} 餐（{pct}%）
        </p>
        <p>
          跳過 {insights.slots_skipped} · 換掉 {insights.slots_swapped}
        </p>
        {insights.estimated_total_cost != null && (
          <p>
            預估 NT$ {insights.estimated_total_cost}
            {insights.actual_total_cost != null &&
              ` · 實際 NT$ ${insights.actual_total_cost}`}
          </p>
        )}
      </div>

      {Object.keys(insights.skip_reasons_summary).length > 0 && (
        <section className="rounded-xl border border-border-subtle p-4">
          <h2 className="text-sm font-medium">跳過原因</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(insights.skip_reasons_summary).map(([k, v]) => (
              <li key={k}>
                {k}：{v}
              </li>
            ))}
          </ul>
        </section>
      )}

      {insights.expiring_items_wasted.length > 0 && (
        <p className="text-sm text-amber-800">
          浪費食材：{insights.expiring_items_wasted.join("、")}
        </p>
      )}

      {insights.new_dishes_tried.length > 0 && (
        <section className="rounded-xl border border-border-subtle p-4">
          <h2 className="text-sm font-medium">嘗試新菜</h2>
          <p className="text-sm">{insights.new_dishes_tried.join("、")}</p>
        </section>
      )}
    </div>
  );
}
