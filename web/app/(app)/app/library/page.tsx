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
import { BookOpen } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [view, setView] = useState<LibraryView>("gallery");
  const [items, setItems] = useState<ReturnType<typeof recipeListItemToCard>[]>([]);
  const { favoriteIds, toggle, syncInitial } = useFavoriteToggle(new Set());
  const [loading, setLoading] = useState(true);
  const [offlineOnly, setOfflineOnly] = useState(false);

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
        <h1 className="font-serif text-2xl text-text-ink">料理書</h1>
        <p className="mt-1 text-sm text-text-muted">你的食譜收藏與歷史</p>
      </header>

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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-10" />}
          title="找不到食譜"
          body="試試其他關鍵字，或回到今晚生成新食譜。"
          actions={
            <Link href="/app" className="text-sm text-brand-primary hover:underline">
              前往今晚
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
