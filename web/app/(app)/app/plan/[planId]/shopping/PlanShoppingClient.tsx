"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  type ShoppingListItem,
  type ShoppingListPayload,
  ShoppingListResponseSchema,
} from "@chef/shared-types";
import { SECTION_DISPLAY_ORDER, SECTION_LABELS } from "@/domain/shopping-list/sections";
import type { ShoppingSection } from "@/domain/shopping-list/sections";
import { parseApiResponse } from "@/lib/api-client/client";
import { Button } from "@/components/primitives/Button";
import { useToast } from "@/components/providers/ToastProvider";

type Item = ShoppingListItem;
type ListPayload = ShoppingListPayload;

export function PlanShoppingClient({ planId }: { planId: string }) {
  const { toast } = useToast();
  const [list, setList] = useState<ListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res = await fetch("/api/me/shopping-lists/active");
      let data = await parseApiResponse(res, ShoppingListResponseSchema);
      if (!data.list?.id) {
        res = await fetch("/api/me/shopping-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meal_plan_id: Number(planId) }),
        });
        data = await parseApiResponse(res, ShoppingListResponseSchema);
      }
      if (!data.list) throw new Error("載入失敗");
      setList(data.list);
    } catch (e) {
      toast({
        title: "無法載入採買清單",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [planId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const check = async (itemId: number, checked: boolean) => {
    if (!list) return;
    await fetch(`/api/me/shopping-lists/${list.id}/items/${itemId}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked }),
    });
    await load();
  };

  const regenerate = async () => {
    if (!list) return;
    const res = await fetch(`/api/me/shopping-lists/${list.id}/regenerate`, {
      method: "POST",
    });
    if (res.ok) {
      toast({ title: "已重新整理清單" });
      await load();
    }
  };

  const share = async () => {
    if (!list) return;
    const res = await fetch(`/api/me/shopping-lists/${list.id}/share`, {
      method: "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setShareUrl(json.url);
      await navigator.clipboard.writeText(json.url);
      toast({ title: "已複製分享連結" });
    }
  };

  const complete = async () => {
    if (!list) return;
    const res = await fetch(`/api/me/shopping-lists/${list.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (res.ok) {
      toast({
        title: "採買完成",
        description: json.pantry_sync
          ? `已同步 ${json.pantry_sync.added} 項到冰箱`
          : undefined,
      });
      await load();
    }
  };

  if (loading) return <p className="text-sm text-text-muted">載入採買清單…</p>;
  if (!list) return null;

  const bySection = new Map<string, Item[]>();
  for (const item of list.items) {
    if (!bySection.has(item.section)) bySection.set(item.section, []);
    bySection.get(item.section)!.push(item);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/app/plan" className="text-sm text-brand-primary">
            ← 返回週菜單
          </Link>
          <h1 className="font-serif text-2xl">{list.name ?? "採買清單"}</h1>
          <p className="text-sm text-text-muted">
            {list.progress.checked} / {list.progress.total} 項
            {list.estimated_total_cost != null
              ? ` · 預估 NT$ ${Math.round(list.estimated_total_cost)}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={regenerate}>
            重新整理
          </Button>
          <Button variant="secondary" onClick={share}>
            分享
          </Button>
          <Button onClick={complete}>完成採買</Button>
        </div>
      </div>
      {shareUrl ? (
        <p className="text-xs text-text-muted break-all">{shareUrl}</p>
      ) : null}
      {SECTION_DISPLAY_ORDER.map((sec) => {
        const items = bySection.get(sec);
        if (!items?.length) return null;
        return (
          <section key={sec} className="rounded-xl border border-border-subtle bg-surface-card p-4">
            <h2 className="mb-3 font-medium">
              {SECTION_LABELS[sec as ShoppingSection]} · {items.length} 項
            </h2>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={item.is_checked}
                    onChange={(e) => check(item.id, e.target.checked)}
                  />
                  <div>
                    <span className={item.is_checked ? "text-text-muted line-through" : ""}>
                      {item.display_name} · {item.quantity_display}
                      {item.estimated_total_price != null
                        ? ` · NT$ ${item.estimated_total_price}`
                        : ""}
                    </span>
                    {item.pantry_coverage_note ? (
                      <p className="text-xs text-text-muted">{item.pantry_coverage_note}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
