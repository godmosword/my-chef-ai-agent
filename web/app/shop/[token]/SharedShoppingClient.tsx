"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type SharedShoppingListPayload,
  type ShoppingListItem,
  SharedShoppingListResponseSchema,
} from "@chef/shared-types";
import { SECTION_DISPLAY_ORDER, SECTION_LABELS } from "@/domain/shopping-list/sections";
import type { ShoppingSection } from "@/domain/shopping-list/sections";
import { ApiError, parseApiResponse } from "@/lib/api-client/client";

type Item = ShoppingListItem;
type Payload = SharedShoppingListPayload;

export function SharedShoppingClient({ token }: { token: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shared/shopping-lists/${token}`);
      const json = await parseApiResponse(res, SharedShoppingListResponseSchema);
      setData(json.list);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "連線失敗");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (itemId: number, checked: boolean) => {
    const res = await fetch(
      `/api/shared/shopping-lists/${token}/items/${itemId}/check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      },
    );
    if (res.ok) await load();
  };

  if (loading) return <p className="p-6 text-sm text-text-muted">載入中…</p>;
  if (error) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="font-serif text-xl">採買清單</h1>
        <p className="mt-4 text-sm text-red-600">{error}</p>
      </main>
    );
  }
  if (!data) return null;

  const bySection = new Map<string, Item[]>();
  for (const item of data.items) {
    if (!bySection.has(item.section)) bySection.set(item.section, []);
    bySection.get(item.section)!.push(item);
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <header>
        <p className="text-sm text-text-muted">家人代買清單</p>
        <h1 className="font-serif text-2xl text-text-ink">
          {data.name ?? "採買清單"}
        </h1>
        <p className="text-sm text-text-muted">
          {data.progress.checked} / {data.progress.total} 項已勾選
        </p>
      </header>
      <p className="text-xs text-text-muted">
        僅可勾選品項，無法修改或刪除。連結 7 天內有效。
      </p>
      {SECTION_DISPLAY_ORDER.map((sec) => {
        const items = bySection.get(sec);
        if (!items?.length) return null;
        const label = SECTION_LABELS[sec as ShoppingSection];
        return (
          <section key={sec}>
            <h2 className="mb-2 font-medium">{label}</h2>
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-card px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={(e) => toggle(item.id, e.target.checked)}
                    className="size-5"
                  />
                  <span className={item.is_checked ? "text-text-muted line-through" : ""}>
                    {item.display_name} · {item.quantity_display}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
