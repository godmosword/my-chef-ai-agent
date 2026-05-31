"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  generateMealPlanApi,
  storeMealPlanWarnings,
} from "@/application/api/meal-plans";
import { BackLink } from "@/components/patterns/BackLink";
import { Button } from "@/components/primitives/Button";
import { useToast } from "@/components/providers/ToastProvider";
import {
  addDaysIso,
  currentWeekMonday,
  formatWeekRangeLabel,
} from "@/lib/locale/week";
import { FLAGS } from "@/platform/config/flags";
import { capture } from "@/platform/analytics/events";

const DEFAULT_WEEKLY_BUDGET_TWD = 1500;

const MEAL_LABELS = [
  { key: "breakfast" as const, label: "早餐" },
  { key: "lunch" as const, label: "午餐" },
  { key: "dinner" as const, label: "晚餐" },
];

export default function PlanGeneratePage() {
  const router = useRouter();
  const { toast } = useToast();
  const weekStart = useMemo(() => currentWeekMonday(), []);
  const weekEnd = useMemo(() => addDaysIso(weekStart, 6), [weekStart]);

  const [meals, setMeals] = useState({
    breakfast: false,
    lunch: false,
    dinner: true,
  });
  const [budget, setBudget] = useState(String(DEFAULT_WEEKLY_BUDGET_TWD));
  const [loading, setLoading] = useState(false);

  if (!FLAGS.mealPlan) {
    return (
      <div className="space-y-4">
        <BackLink href="/app/plan" label="返回週菜單" />
        <p className="text-sm text-text-muted">週菜單功能未啟用。</p>
      </div>
    );
  }

  const toggleMeal = (key: keyof typeof meals) => {
    setMeals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onGenerate = async () => {
    if (!meals.breakfast && !meals.lunch && !meals.dinner) {
      toast({
        title: "請至少選一個餐次",
        variant: "error",
      });
      return;
    }

    const budgetNum = parseInt(budget, 10);
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      toast({ title: "請輸入有效預算", variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const { plan, warnings, pantry_reuse_score } = await generateMealPlanApi({
        start_date: weekStart,
        end_date: weekEnd,
        meal_pattern: meals,
        budget_total_twd: budgetNum,
      });
      storeMealPlanWarnings(plan.id, warnings);
      capture("meal_plan_generated", {
        slot_count: plan.slots.length,
        pantry_reuse_score,
      });
      toast({
        title: "本週菜單已產生",
        description:
          warnings.length > 0
            ? `有 ${warnings.length} 則提醒，請先檢視再啟用`
            : "請檢視餐點後啟用計畫",
        variant: "default",
      });
      router.push(`/app/plan/sessions/${plan.id}`);
    } catch (e) {
      toast({
        title: "無法產生菜單",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <BackLink href="/app/plan" label="返回週菜單" />
      <header>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-brand-primary" aria-hidden />
          <h1 className="font-serif text-2xl text-text-ink">AI 規劃本週菜單</h1>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          {formatWeekRangeLabel(weekStart)} · 會參考冰箱與個人偏好
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-border-default bg-surface-default p-4">
        <h2 className="text-sm font-medium text-text-ink">要規劃哪些餐次？</h2>
        <ul className="flex flex-wrap gap-2">
          {MEAL_LABELS.map(({ key, label }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggleMeal(key)}
                className={
                  meals[key]
                    ? "rounded-full border border-brand-primary bg-brand-primaryLight px-3 py-1 text-sm text-brand-primaryDark"
                    : "rounded-full border border-border-default px-3 py-1 text-sm text-text-muted"
                }
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border border-border-default bg-surface-default p-4">
        <label htmlFor="budget" className="text-sm font-medium text-text-ink">
          本週食材預算（NT$）
        </label>
        <input
          id="budget"
          type="number"
          min={100}
          step={100}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm"
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void onGenerate()} disabled={loading}>
          {loading ? "規劃中…" : "開始規劃"}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/app/plan">取消</Link>
        </Button>
      </div>

      <p className="text-xs text-text-muted">
        產生後可先檢視每道菜的建議與理由，確認無誤再「啟用計畫」；啟用後會建立採買清單並可收到每日提醒。
      </p>
    </div>
  );
}
