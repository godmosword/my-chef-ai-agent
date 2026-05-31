"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { type Dashboard, DashboardResponseSchema } from "@chef/shared-types";
import { parseApiResponse } from "@/lib/api-client/client";
import { BackLink } from "@/components/patterns/BackLink";
import { useMountAsync } from "@/hooks/useMountAsync";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    setLoadFailed(false);
    try {
      const res = await fetch("/api/me/dashboard");
      const json = await parseApiResponse(res, DashboardResponseSchema);
      if (!isActive()) return;
      if (json.dashboard) setData(json.dashboard);
      else setLoadFailed(true);
    } catch {
      if (isActive()) setLoadFailed(true);
    }
  }, []);

  useMountAsync((isActive) => load(isActive), [load]);

  if (loadFailed) {
    return (
      <div className="space-y-4">
        <BackLink href="/app" label="返回" />
        <p className="text-sm text-text-muted">無法載入儀表板，請稍後再試。</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink href="/app" label="返回" />
        <p className="text-sm text-text-muted">載入中…</p>
      </div>
    );
  }

  const cookPct = Math.round(data.avg_cook_rate * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/app" label="返回" />
      <header>
        <h1 className="font-serif text-2xl text-text-ink">菜單儀表板</h1>
        <p className="text-sm text-text-muted">規劃 → 採買 → 開煮 → 回顧</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="連續規劃" value={`${data.streak_weeks} 週`} />
        <Metric label="平均煮菜率" value={`${cookPct}%`} />
        <Metric
          label="平均週費用"
          value={
            data.avg_weekly_cost != null
              ? `NT$ ${Math.round(data.avg_weekly_cost)}`
              : "—"
          }
        />
        <Metric
          label="食材浪費率"
          value={`${Math.round(data.waste_rate * 100)}%`}
        />
      </div>

      {data.cook_rate_history.length > 0 && (
        <section className="rounded-xl border border-border-subtle bg-surface-card p-4">
          <h2 className="text-sm font-medium text-text-ink">近四週煮菜率</h2>
          <div className="mt-3 flex items-end gap-2 h-24">
            {data.cook_rate_history.map((h) => (
              <div key={h.plan_id} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-brand-primary/80"
                  style={{ height: `${Math.max(8, h.cook_rate * 100)}%` }}
                />
                <span className="text-[10px] text-text-muted">
                  {h.end_date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.active_plan && (
        <section className="rounded-xl border border-border-subtle bg-surface-card p-4">
          <h2 className="font-medium">本週菜單</h2>
          <p className="text-sm text-text-muted">
            {data.active_plan.start_date} ～ {data.active_plan.end_date}
          </p>
          <Link
            href={`/app/plan/${data.active_plan.id}/shopping`}
            className="mt-2 inline-block text-sm text-brand-primary underline"
          >
            採買清單
          </Link>
        </section>
      )}

      {data.last_completed_insights && (
        <section className="rounded-xl border border-border-subtle bg-surface-card p-4">
          <h2 className="font-medium">上週回顧</h2>
          <p className="text-sm">
            {data.last_completed_insights.plan_name} · 煮了{" "}
            {data.last_completed_insights.slots_cooked}/
            {data.last_completed_insights.slots_total} 餐
          </p>
          <Link
            href={`/app/plan/${data.last_completed_insights.plan_id}/review`}
            className="mt-2 inline-block text-sm text-brand-primary underline"
          >
            看完整數據
          </Link>
        </section>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/app/plan/generate" className="text-brand-primary underline">
          AI 規劃本週菜單
        </Link>
        <Link href="/app/plan" className="text-brand-primary underline">
          週菜單
        </Link>
        <Link href="/app/pantry" className="text-brand-primary underline">
          冰箱
        </Link>
        <Link
          href="/app/settings/notifications"
          className="text-brand-primary underline"
        >
          通知設定
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-medium text-text-ink">{value}</p>
    </div>
  );
}
