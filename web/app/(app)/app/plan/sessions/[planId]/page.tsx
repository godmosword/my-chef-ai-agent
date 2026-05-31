"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  activateMealPlanApi,
  clearMealPlanWarnings,
  fetchMealPlan,
  readMealPlanWarnings,
  type MealPlanJson,
} from "@/application/api/meal-plans";
import { BackLink } from "@/components/patterns/BackLink";
import { Button } from "@/components/primitives/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { capture } from "@/platform/analytics/events";

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
};

export default function MealPlanSessionPage() {
  const params = useParams<{ planId: string }>();
  const planId = parseInt(params.planId, 10);
  const router = useRouter();
  const { toast } = useToast();

  const [plan, setPlan] = useState<MealPlanJson | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(planId)) return;
    setLoading(true);
    try {
      const data = await fetchMealPlan(planId);
      setPlan(data);
      setWarnings(readMealPlanWarnings(planId));
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onActivate = async () => {
    setActivating(true);
    try {
      const activated = await activateMealPlanApi(planId);
      clearMealPlanWarnings(planId);
      capture("meal_plan_activated", { plan_id: planId });
      toast({
        title: "本週菜單已啟用",
        description: "可前往採買清單與每日提醒",
        variant: "default",
      });
      router.push(`/app/plan/${activated.id}/shopping`);
    } catch (e) {
      toast({
        title: "無法啟用",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setActivating(false);
    }
  };

  if (!Number.isFinite(planId)) {
    return <p className="text-text-muted">無效的計畫</p>;
  }

  if (loading) {
    return <p className="text-text-muted">載入菜單…</p>;
  }

  if (!plan) {
    return (
      <div className="space-y-4">
        <BackLink href="/app/plan" label="返回週菜單" />
        <p className="text-text-muted">找不到這份菜單。</p>
      </div>
    );
  }

  const slotsByDate = [...plan.slots].sort((a, b) =>
    a.slot_date.localeCompare(b.slot_date) ||
    a.meal_type.localeCompare(b.meal_type),
  );

  const isDraft = plan.status === "draft";
  const isActive = plan.status === "active";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/app/plan" label="返回週菜單" />

      <header>
        <h1 className="font-serif text-2xl text-text-ink">
          {plan.name ?? "本週菜單"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {plan.start_date} ～ {plan.end_date}
          {plan.pantry_reuse_score != null && (
            <> · 冰箱利用率 {Math.round(plan.pantry_reuse_score * 100)}%</>
          )}
          {plan.total_estimated_cost != null && (
            <> · 預估 NT$ {Math.round(plan.total_estimated_cost)}</>
          )}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
          狀態：{statusLabel(plan.status)}
        </p>
      </header>

      {warnings.length > 0 && (
        <section
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          <p className="font-medium">規劃提醒</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-text-ink">建議餐點</h2>
        <ul className="space-y-2" role="list">
          {slotsByDate.map((slot) => (
            <li
              key={slot.id}
              className="rounded-lg border border-border-default bg-surface-default p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-text-ink">{slot.dish_title}</p>
                <span className="text-xs text-text-muted">
                  {slot.slot_date.slice(5)} ·{" "}
                  {MEAL_TYPE_LABEL[slot.meal_type] ?? slot.meal_type}
                </span>
              </div>
              {slot.rationale && (
                <p className="mt-1 text-sm text-text-muted">{slot.rationale}</p>
              )}
              <p className="mt-1 text-xs text-text-muted">
                {[
                  slot.cuisine,
                  slot.estimated_time_min
                    ? `約 ${slot.estimated_time_min} 分`
                    : null,
                  slot.estimated_cost != null
                    ? `NT$ ${Math.round(slot.estimated_cost)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        {isDraft && (
          <Button onClick={() => void onActivate()} disabled={activating}>
            {activating ? "啟用中…" : "啟用計畫"}
          </Button>
        )}
        {isActive && (
          <Button asChild>
            <Link href={`/app/plan/${plan.id}/shopping`}>採買清單</Link>
          </Button>
        )}
        {isActive && (
          <Button asChild variant="secondary">
            <Link href={`/app/plan/${plan.id}/review`}>週回顧</Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/app/dashboard">儀表板</Link>
        </Button>
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "草稿";
    case "active":
      return "進行中";
    case "completed":
      return "已完成";
    case "archived":
      return "已封存";
    case "abandoned":
      return "已放棄";
    default:
      return status;
  }
}
