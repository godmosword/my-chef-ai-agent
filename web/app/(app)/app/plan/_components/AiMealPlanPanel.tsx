"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MealPlanConstraints } from "@/domain/meal-planning/types";
import {
  abandonMealPlanApi,
  activateMealPlanApi,
  createMealPlanGeneration,
  expandMealSlotApi,
  fetchLatestMealPlan,
  fetchMealPlan,
  fetchMealPlanStatus,
  swapMealSlotApi,
  type MealPlanClient,
  type MealSlotClient,
  type PlanSummary,
} from "@/application/api/meal-plans";
import { Button } from "@/components/primitives/Button";
import { Dialog } from "@/components/primitives/Dialog";
import { useToast } from "@/components/providers/ToastProvider";
import { addDaysIso } from "@/lib/locale/week";

function tomorrowIso(): string {
  return addDaysIso(new Date().toISOString().slice(0, 10), 1);
}

function defaultConstraints(): MealPlanConstraints {
  const start = tomorrowIso();
  const end = addDaysIso(start, 6);
  return {
    start_date: start,
    end_date: end,
    meal_pattern: { breakfast: false, lunch: true, dinner: true },
    budget_total_twd: 1500,
    weekday_max_time_min: 30,
    weekend_max_time_min: 60,
  };
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
};

export function AiMealPlanPanel() {
  const { toast } = useToast();
  const [plan, setPlan] = useState<MealPlanClient | null>(null);
  const [summary, setSummary] = useState<PlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [progressHint, setProgressHint] = useState("");
  const [constraints, setConstraints] = useState(defaultConstraints);
  const [selectedSlot, setSelectedSlot] = useState<MealSlotClient | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapCandidates, setSwapCandidates] = useState<
    Array<{ dish_title: string; estimated_time_min?: number | null }>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const latest = await fetchLatestMealPlan();
      if (latest && latest.status !== "abandoned") {
        const full =
          latest.slots?.length > 0
            ? latest
            : (await fetchMealPlan(latest.id)).plan;
        setPlan(full);
        setSummary((await fetchMealPlan(latest.id)).summary);
        setGeneratingId(full.status === "generating" ? full.id : null);
      } else {
        setPlan(null);
        setSummary(null);
        setGeneratingId(null);
      }
    } catch (e) {
      toast({
        title: "無法載入 AI 週菜單",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!generatingId) return;
    const t = setInterval(async () => {
      try {
        const st = await fetchMealPlanStatus(generatingId);
        setProgressHint(st.progress_hint || st.phase);
        if (st.done) {
          const { plan: p, summary: s } = await fetchMealPlan(generatingId);
          setPlan(p);
          setSummary(s);
          setGeneratingId(null);
          if (st.status === "abandoned" || st.phase === "error") {
            toast({
              title: "規劃失敗",
              description: st.errors?.[0] ?? "請調整條件後重試",
              variant: "error",
            });
          } else {
            toast({ title: "菜單規劃完成" });
          }
        }
      } catch {
        /* ignore poll errors */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [generatingId, toast]);

  const dates = useMemo(() => {
    if (!plan) return [];
    const out: string[] = [];
    let d = plan.start_date;
    while (d <= plan.end_date) {
      out.push(d);
      d = addDaysIso(d, 1);
    }
    return out;
  }, [plan]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, MealSlotClient[]>();
    for (const s of plan?.slots ?? []) {
      if (s.status !== "planned") continue;
      const list = map.get(s.slot_date) ?? [];
      list.push(s);
      map.set(s.slot_date, list);
    }
    return map;
  }, [plan]);

  const startGenerate = async () => {
    setFormOpen(false);
    try {
      const { plan_id } = await createMealPlanGeneration(constraints);
      setGeneratingId(plan_id);
      setProgressHint("已開始規劃，大約 30 秒…");
      toast({ title: "開始規劃", description: "完成後會自動顯示菜單" });
    } catch (e) {
      toast({
        title: "無法開始規劃",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    }
  };

  const onActivate = async () => {
    if (!plan) return;
    try {
      const updated = await activateMealPlanApi(plan.id);
      setPlan(updated);
      toast({ title: "已啟用菜單" });
    } catch (e) {
      toast({
        title: "啟用失敗",
        description: e instanceof Error ? e.message : "",
        variant: "error",
      });
    }
  };

  const onAbandon = async () => {
    if (!plan) return;
    try {
      await abandonMealPlanApi(plan.id);
      setPlan(null);
      setSummary(null);
      toast({ title: "已放棄菜單" });
    } catch (e) {
      toast({ title: "操作失敗", variant: "error" });
    }
  };

  const onSwap = async (mode: "similar" | "different") => {
    if (!plan || !selectedSlot) return;
    try {
      const res = await swapMealSlotApi(plan.id, selectedSlot.id, { mode });
      if (res.applied && res.slot) {
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                slots: prev.slots.map((s) =>
                  s.id === res.slot!.id ? res.slot! : s,
                ),
              }
            : prev,
        );
        setSelectedSlot(res.slot);
        setSwapOpen(false);
        toast({ title: `已換成「${res.slot.dish_title}」` });
        return;
      }
      setSwapCandidates(
        (res.candidates as Array<{ dish_title: string; estimated_time_min?: number }>) ??
          [],
      );
      setSwapOpen(true);
    } catch (e) {
      toast({
        title: "換菜失敗",
        description: e instanceof Error ? e.message : "",
        variant: "error",
      });
    }
  };

  const pickCandidate = async (index: number) => {
    if (!plan || !selectedSlot) return;
    const res = await swapMealSlotApi(plan.id, selectedSlot.id, {
      mode: "similar",
      candidate_index: index,
    });
    if (res.slot) {
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              slots: prev.slots.map((s) =>
                s.id === res.slot!.id ? res.slot! : s,
              ),
            }
          : prev,
      );
      setSelectedSlot(res.slot);
      setSwapOpen(false);
      toast({ title: `已換成「${res.slot.dish_title}」` });
    }
  };

  if (loading) {
    return <p className="text-text-muted">載入 AI 週菜單…</p>;
  }

  if (generatingId) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-default p-8 text-center">
        <p className="font-serif text-xl text-text-ink">正在規劃你的週菜單</p>
        <p className="mt-2 text-sm text-text-muted">{progressHint}</p>
        <p className="mt-4 text-xs text-text-muted">約 30 秒，會自動更新</p>
        <Button
          variant="ghost"
          className="mt-6"
          onClick={() => {
            if (generatingId) void abandonMealPlanApi(generatingId);
            setGeneratingId(null);
          }}
        >
          取消
        </Button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-lg border border-dashed border-border-default p-8 text-center">
        <p className="font-serif text-xl text-text-ink">規劃你的第一份 AI 週菜單</p>
        <p className="mt-2 text-sm text-text-muted">
          依口味、冰箱與預算自動安排一週午晚餐
        </p>
        <Button className="mt-4" onClick={() => setFormOpen(true)}>
          開始規劃
        </Button>
        <ConstraintFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          constraints={constraints}
          onChange={setConstraints}
          onSubmit={() => void startGenerate()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-text-muted">
            {summary?.date_range_zh} · {plan.status === "active" ? "進行中" : "草稿"}
          </p>
          {summary && (
            <p className="text-sm text-text-body">
              預估 NT${summary.total_cost ?? "—"}
              {summary.budget != null ? ` / 預算 ${summary.budget}` : ""}
              {summary.pantry_reuse_pct != null
                ? ` · 冰箱可用 ${summary.pantry_reuse_pct}%`
                : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.status === "draft" && (
            <Button size="sm" onClick={() => void onActivate()}>
              啟用菜單
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setFormOpen(true)}>
            重新規劃
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void onAbandon()}>
            放棄
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3 pb-2">
          {dates.map((date) => (
            <div
              key={date}
              className="w-44 shrink-0 rounded-lg border border-border-default bg-surface-default p-3"
            >
              <p className="mb-2 text-xs font-medium text-text-muted">{date}</p>
              {(slotsByDate.get(date) ?? []).map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className="mb-2 w-full rounded-md border border-border-default p-2 text-left hover:bg-surface-muted"
                  onClick={() => setSelectedSlot(slot)}
                >
                  <p className="text-xs text-text-muted">
                    {MEAL_LABELS[slot.meal_type] ?? slot.meal_type}
                  </p>
                  <p className="font-medium text-text-ink">{slot.dish_title}</p>
                  <p className="text-xs text-text-muted">
                    {slot.estimated_time_min ?? "—"} 分 · {slot.cuisine ?? "—"}
                  </p>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={Boolean(selectedSlot)}
        onOpenChange={(o) => !o && setSelectedSlot(null)}
        title={selectedSlot?.dish_title ?? "餐點"}
        description={selectedSlot?.rationale ?? undefined}
        contentTestId="meal-slot-detail"
      >
        {selectedSlot && (
          <div className="space-y-3">
            <ul className="text-sm text-text-body">
              {selectedSlot.key_ingredients.slice(0, 6).map((ing) => (
                <li key={ing.display_name}>
                  {ing.display_name}
                  {ing.from_pantry ? " ✓冰箱" : ""}
                  {ing.urgency === "urgent" ? " ⚠️" : ""}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void onSwap("similar")}
              >
                換類似菜
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void onSwap("different")}
              >
                換口味
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await expandMealSlotApi(plan.id, selectedSlot.id);
                    toast({ title: "食譜已展開", description: "可於食譜庫查看完整步驟" });
                  } catch (e) {
                    toast({
                      title: "展開失敗",
                      description: e instanceof Error ? e.message : "",
                      variant: "error",
                    });
                  }
                }}
              >
                看完整食譜
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={swapOpen}
        onOpenChange={setSwapOpen}
        title="選擇替代菜色"
      >
        <ul className="space-y-2">
          {swapCandidates.map((c, i) => (
            <li key={c.dish_title}>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => void pickCandidate(i)}
              >
                {i + 1}. {c.dish_title}
                {c.estimated_time_min != null ? `（${c.estimated_time_min} 分）` : ""}
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>

      <ConstraintFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        constraints={constraints}
        onChange={setConstraints}
        onSubmit={() => void startGenerate()}
      />
    </div>
  );
}

function ConstraintFormDialog({
  open,
  onOpenChange,
  constraints,
  onChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  constraints: MealPlanConstraints;
  onChange: (c: MealPlanConstraints) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="規劃條件">
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="text-text-muted">開始日期</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-border-default p-2"
            value={constraints.start_date}
            onChange={(e) =>
              onChange({ ...constraints, start_date: e.target.value })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-text-muted">結束日期</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-border-default p-2"
            value={constraints.end_date}
            onChange={(e) =>
              onChange({ ...constraints, end_date: e.target.value })
            }
          />
        </label>
        <fieldset className="text-sm">
          <legend className="text-text-muted">每天規劃</legend>
          <div className="mt-2 flex gap-4">
            {(["lunch", "dinner", "breakfast"] as const).map((meal) => (
              <label key={meal} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={constraints.meal_pattern[meal]}
                  onChange={(e) =>
                    onChange({
                      ...constraints,
                      meal_pattern: {
                        ...constraints.meal_pattern,
                        [meal]: e.target.checked,
                      },
                    })
                  }
                />
                {MEAL_LABELS[meal]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm">
          <span className="text-text-muted">預算（TWD）</span>
          <input
            type="number"
            className="mt-1 w-full rounded border border-border-default p-2"
            value={constraints.budget_total_twd ?? ""}
            onChange={(e) =>
              onChange({
                ...constraints,
                budget_total_twd: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-text-muted">平日最多（分鐘）</span>
          <input
            type="number"
            className="mt-1 w-full rounded border border-border-default p-2"
            value={constraints.weekday_max_time_min ?? 30}
            onChange={(e) =>
              onChange({
                ...constraints,
                weekday_max_time_min: Number(e.target.value),
              })
            }
          />
        </label>
        <Button onClick={onSubmit}>規劃菜單</Button>
      </div>
    </Dialog>
  );
}
