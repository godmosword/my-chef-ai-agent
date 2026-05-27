"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  categorizeForDisplay,
  expiryLabel,
  formatQuantityForDisplay,
  getCategoryZh,
  getLocationZh,
  type PantryDisplayItem,
} from "@/domain/pantry/pantry-ui";
import { parseManualPantryText } from "@/application/pantry/vision/manual-entry";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { displayDateKey } from "@/lib/locale/datetime";
import { UseItUpPanel } from "@/components/notifications/UseItUpPanel";
import { useSearchParams } from "next/navigation";

type PantryRow = PantryDisplayItem & {
  id: number;
  notes?: string | null;
};

type Summary = {
  total_count: number;
  expiring_count: number;
  expired_count: number;
};

function PantryPageInner() {
  const searchParams = useSearchParams();
  const showUseItUp = searchParams.get("use_it_up") === "1";
  const [hasUseItUpStored, setHasUseItUpStored] = useState(false);
  const [items, setItems] = useState<PantryRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<"all" | "expiring" | "expired">("all");
  const [search, setSearch] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q =
        filter === "expiring"
          ? "?expiring_within_days=3&include_expired=0"
          : filter === "expired"
            ? "?expired_only=1"
            : "?include_expired=1";
      const [listRes, sumRes] = await Promise.all([
        fetch(`/api/me/pantry${q}`),
        fetch("/api/me/pantry/summary"),
      ]);
      const listData = (await listRes.json()) as { items: PantryRow[] };
      setItems(listData.items ?? []);
      setSummary((await sumRes.json()) as Summary);
    } catch {
      setMessage("無法載入冰箱庫存");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setHasUseItUpStored(Boolean(sessionStorage.getItem("chef_use_it_up_result")));
  }, []);

  const today = displayDateKey();
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.display_name.toLowerCase().includes(q));
  }, [items, search]);

  const groups = useMemo(
    () => categorizeForDisplay(filtered, today, 3),
    [filtered, today],
  );

  const addBulk = async () => {
    const { items: parsed } = parseManualPantryText(bulkText);
    if (!parsed.length) {
      setMessage("無法解析批次內容");
      return;
    }
    await fetch("/api/me/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: parsed }),
    });
    setBulkText("");
    setMessage(`已加入 ${parsed.length} 項`);
    void load();
  };

  const consumeFull = async (id: number) => {
    await fetch(`/api/me/pantry/${id}/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full: true }),
    });
    void load();
  };

  const wipeAll = async () => {
    const phrase = window.prompt('輸入「清空冰箱」以確認');
    if (phrase !== "清空冰箱") return;
    await fetch("/api/me/pantry", { method: "DELETE" });
    void load();
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/app" className="text-sm text-brand-primary hover:underline">
        ← 返回今晚
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl text-text-ink">我的冰箱</h1>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="text-sm text-brand-primary hover:underline"
            onClick={async () => {
              const res = await fetch("/api/me/pantry/use-it-up", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              });
              const data = await res.json();
              if (data.empty_expiring) {
                setMessage(data.message ?? "沒有快過期食材");
                return;
              }
              sessionStorage.setItem("chef_use_it_up_result", JSON.stringify(data));
              setMessage(null);
            }}
          >
            用快過期食材做菜
          </button>
          <Link
            href="/app/pantry/scan"
            className="text-sm text-brand-primary hover:underline"
          >
            拍照盤點
          </Link>
        </div>
      </div>

      {(showUseItUp || hasUseItUpStored) && (
        <div className="mt-4">
          <UseItUpPanel
            onPickRecipe={() => {
              setMessage("請回到首頁查看生成的食譜，或點「看完整食譜」後在對話中繼續。");
            }}
          />
        </div>
      )}

      {summary && (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${filter === "all" ? "bg-brand-primary text-white" : "bg-surface-muted"}`}
            onClick={() => setFilter("all")}
          >
            共 {summary.total_count} 項
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${filter === "expiring" ? "bg-amber-500 text-white" : "bg-surface-muted"}`}
            onClick={() => setFilter("expiring")}
          >
            ⚠️ {summary.expiring_count} 快過期
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${filter === "expired" ? "bg-red-600 text-white" : "bg-surface-muted"}`}
            onClick={() => setFilter("expired")}
          >
            🚨 {summary.expired_count} 已過期
          </button>
        </div>
      )}

      <Input
        className="mt-4"
        placeholder="搜尋食材…"
        value={search}
        onChange={setSearch}
      />

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">載入中…</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed p-8 text-center">
          <p className="text-text-body">你的冰箱還是空的</p>
          <p className="mt-2 text-sm text-text-muted">
            到「拍照盤點」掃冰箱或收據，或在下方批次貼上食材
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <section key={group.id}>
              <h2 className="text-sm font-medium text-text-ink">
                {group.emoji} {group.title} · {group.items.length} 項
              </h2>
              <ul className="mt-2 space-y-2">
                {group.items.map((item) => {
                  const row = item as PantryRow;
                  const exp = expiryLabel(item, today, 3);
                  return (
                    <li
                      key={row.id ?? item.item_key}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-elevated p-3 text-sm"
                    >
                      <div>
                        <span className="font-medium text-text-ink">
                          {item.display_name}
                        </span>
                        <span className="ml-2 text-text-muted">
                          {formatQuantityForDisplay(item)}
                        </span>
                        <span
                          className={`ml-2 text-xs ${
                            exp.urgency === "expired" || exp.urgency === "urgent"
                              ? "text-amber-700"
                              : "text-text-muted"
                          }`}
                        >
                          {exp.text}
                        </span>
                        {item.location !== "fridge_main" && (
                          <span className="ml-2 text-xs text-text-muted">
                            📍 {getLocationZh(item.location)}
                          </span>
                        )}
                        {item.category && (
                          <span className="ml-1 text-xs text-text-muted">
                            · {getCategoryZh(item.category)}
                          </span>
                        )}
                      </div>
                      {row.id != null && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-brand-primary"
                            onClick={() => void consumeFull(row.id)}
                          >
                            用掉
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="mt-10 rounded-xl border border-border-subtle p-4">
        <h2 className="text-sm font-medium">批次加入</h2>
        <textarea
          className="mt-2 w-full rounded-lg border p-3 text-sm"
          rows={4}
          placeholder={"番茄 3 顆\n雞蛋 1 盒"}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <Button type="button" className="mt-2" size="sm" onClick={() => void addBulk()}>
          加入冰箱
        </Button>
      </section>

      <section className="mt-8 border-t pt-6">
        <button
          type="button"
          className="text-sm text-red-600"
          onClick={() => void wipeAll()}
        >
          清空整個冰箱
        </button>
      </section>

      {message && (
        <p className="mt-4 text-sm text-text-muted whitespace-pre-wrap">{message}</p>
      )}
    </main>
  );
}

export default function PantryPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-text-muted">載入中…</main>}>
      <PantryPageInner />
    </Suspense>
  );
}
