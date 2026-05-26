"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listRecipesWithOffline } from "@/lib/offline/recipes";
import { recipeListItemToCard } from "@/lib/recipe-display";
import { SearchInput } from "@/components/patterns/SearchInput";
import { FilterRail, type FilterOption } from "@/components/patterns/FilterRail";
import { ViewToggle, type LibraryView } from "@/components/patterns/ViewToggle";
import { RecipeCardSkeleton } from "@/components/patterns/RecipeCard";
import { RecipeCardWithHero } from "@/components/recipe/RecipeCardWithHero";
import { EmptyState } from "@/components/patterns/EmptyState";
import { LibraryEmpty } from "@/components/empty-states/LibraryEmpty";
import { BookOpen, Sparkles, Trash2 } from "lucide-react";
import { DeleteRecipeDialog } from "@/components/recipe/DeleteRecipeDialog";
import { formatRelativeTime } from "@/lib/utils/format";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { appPrefillHref } from "@/lib/marketing/content";

const INSPIRATION: Array<{ label: string; prefill: string }> = [
  { label: "清冰箱", prefill: "冰箱剩下這些食材，幫我想一道菜" },
  { label: "30 分鐘內", prefill: "30 分鐘內可以做好的家常晚餐" },
  { label: "兒童餐", prefill: "小孩會喜歡、不辣的兒童晚餐" },
  { label: "帶便當", prefill: "適合明天帶便當、放冷不變難吃的菜" },
  { label: "招待客人", prefill: "週末 6 個人的晚餐，看起來體面一點" },
  { label: "一鍋料理", prefill: "一個鍋子煮完的懶人料理" },
  { label: "低油低鹽", prefill: "低油、低鹽、適合長輩的清淡菜" },
  { label: "素食", prefill: "純素、沒有蛋奶的一道主菜" },
];

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [view, setView] = useState<LibraryView>("gallery");
  const [items, setItems] = useState<ReturnType<typeof recipeListItemToCard>[]>([]);
  const { favoriteIds, toggle, syncInitial } = useFavoriteToggle(new Set());
  const [loading, setLoading] = useState(true);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRecipesWithOffline({
        q: q.trim() || undefined,
        cuisine: cuisine ?? undefined,
        limit: 50,
      });
      setItems(res.items);
      syncInitial(res.favoriteIds);
      setOfflineOnly(res.offlineOnly);
    } catch {
      setItems([]);
      setOfflineOnly(false);
    } finally {
      setLoading(false);
    }
  }, [q, cuisine, syncInitial]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const filterOptions: FilterOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const c = item.cuisine?.trim();
      if (!c) continue;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([id, count]) => ({
      id,
      label: id,
      count,
    }));
  }, [items]);

  const filtered = useMemo(() => {
    if (!cuisine) return items;
    return items.filter((i) => i.cuisine === cuisine);
  }, [items, cuisine]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl text-text-ink">我的食譜</h1>
        <p className="mt-1 text-sm text-text-muted">你的收藏與歷史</p>
      </header>

      <section
        aria-label="找食譜的靈感"
        className="rounded-xl border border-border-default bg-surface-muted/40 p-3"
      >
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Sparkles className="size-4 text-brand-primary" aria-hidden />
          <span>沒想法？試試這些情境，會帶你去今晚吃什麼直接生成</span>
        </div>
        <ul className="mt-2 flex flex-wrap gap-2" role="list">
          {INSPIRATION.map((item) => (
            <li key={item.label}>
              <Link
                href={appPrefillHref(item.prefill)}
                className="inline-flex items-center rounded-full border border-border-default bg-surface-default px-3 py-1 text-xs text-text-body transition-colors hover:border-brand-primary hover:bg-brand-primaryLight hover:text-brand-primaryDark"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {offlineOnly && (
        <p
          role="status"
          className="rounded-lg border border-border-default bg-surface-muted px-3 py-2 text-sm text-text-muted"
        >
          離線模式：僅顯示已快取的食譜
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} className="flex-1" />
        <ViewToggle view={view} onChange={setView} />
      </div>

      <FilterRail options={filterOptions} selectedId={cuisine} onSelect={setCuisine} />

      {loading ? (
        <div
          className={
            view === "gallery"
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "space-y-2"
          }
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <RecipeCardSkeleton key={i} className={view === "gallery" ? "" : "min-w-0"} />
          ))}
        </div>
      ) : items.length === 0 && !q.trim() && !cuisine ? (
        <LibraryEmpty />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-10" />}
          title="找不到食譜"
          body="試試其他關鍵字，或回到今晚吃什麼生成新食譜。"
          actions={
            <Link href="/app" className="text-sm text-brand-primary hover:underline">
              前往今晚吃什麼
            </Link>
          }
        />
      ) : view === "gallery" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RecipeCardWithHero
              key={r.id}
              recipe={r}
              href={`/app/library/${r.id}`}
              favorited={favoriteIds.has(r.id)}
              onFavoriteToggle={() => void toggle(r.id)}
              onDelete={() =>
                setDeleteTarget({ id: r.id, title: r.title })
              }
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-default">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-border-default bg-surface-muted">
              <tr>
                <th className="px-4 py-2 font-medium text-text-ink">名稱</th>
                <th className="px-4 py-2 font-medium text-text-ink">菜系</th>
                <th className="px-4 py-2 font-medium text-text-ink">最近</th>
                <th className="px-4 py-2 font-medium text-text-ink w-16">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border-default last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/library/${r.id}`}
                      className="font-medium text-brand-primary hover:underline"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{r.cuisine ?? "—"}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {r.lastCookedAt ? formatRelativeTime(r.lastCookedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-label={`刪除 ${r.title}`}
                      className="rounded-lg p-2 text-text-muted hover:bg-surface-muted hover:text-danger"
                      onClick={() =>
                        setDeleteTarget({ id: r.id, title: r.title })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeleteRecipeDialog
        recipeId={deleteTarget?.id ?? null}
        recipeTitle={deleteTarget?.title ?? ""}
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={(id) => {
          setItems((prev) => prev.filter((item) => item.id !== id));
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
