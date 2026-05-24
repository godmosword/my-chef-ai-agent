"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Printer, ShoppingCart } from "lucide-react";
import type { AggregatedShoppingList } from "@chef/shared-types";
import { fetchShoppingList } from "@/lib/api/plan";
import {
  currentWeekMonday,
  floorToWeekMonday,
  formatWeekRangeLabel,
} from "@/lib/locale/week";
import { Button } from "@/components/primitives/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { ShoppingListView } from "./_components/ShoppingListView";

export function ShoppingPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [weekOf, setWeekOf] = useState(
    floorToWeekMonday(searchParams.get("week_of") ?? currentWeekMonday()),
  );
  const [list, setList] = useState<AggregatedShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchShoppingList(weekOf);
      setList(data);
      const normalized = floorToWeekMonday(data.week_of);
      if (normalized !== weekOf) setWeekOf(normalized);
      router.replace(`/app/shopping?week_of=${normalized}`, { scroll: false });
    } catch (e) {
      toast({
        title: "無法載入採買清單",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [weekOf, router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const onPrint = () => {
    setPrintOpen(true);
    requestAnimationFrame(() => window.print());
    setTimeout(() => setPrintOpen(false), 500);
  };

  return (
    <div className="space-y-4">
      <div className="shopping-screen-only flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-text-ink">買菜清單</h1>
          <p className="text-sm text-text-muted">{formatWeekRangeLabel(weekOf)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onPrint}>
            <Printer className="size-4" aria-hidden />
            列印
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/app/plan?week_of=${weekOf}`}>回到週菜單</Link>
          </Button>
        </div>
      </div>

      <div className="shopping-print-only hidden">
        <h1 className="shopping-print-title">採買清單 · {formatWeekRangeLabel(weekOf)}</h1>
      </div>

      {loading && <p className="text-text-muted">載入中…</p>}

      {!loading && list && list.items.length > 0 && (
        <ShoppingListView
          items={list.items}
          groups={list.groups}
          printMode={printOpen}
        />
      )}

      {!loading && list && list.items.length === 0 && (
        <EmptyShopping weekOf={weekOf} />
      )}
    </div>
  );
}

function EmptyShopping({ weekOf }: { weekOf: string }) {
  return (
    <div className="shopping-screen-only flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border-default bg-surface-default px-6 py-12 text-center">
      <div
        aria-hidden
        className="flex size-16 items-center justify-center rounded-full bg-brand-primaryLight text-brand-primary"
      >
        <ShoppingCart className="size-7" />
      </div>
      <div className="max-w-sm space-y-2">
        <h2 className="font-serif text-xl text-text-ink">這週的籃子還是空的</h2>
        <p className="text-sm text-text-body">
          先到週菜單規劃一些菜，這裡就會自動把食材整理成一份可勾選、可列印的買菜清單。
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="primary">
          <Link href={`/app/plan?week_of=${weekOf}`}>
            <CalendarDays className="size-4" aria-hidden />
            去週菜單規劃
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/app/library">從食譜挑一道</Link>
        </Button>
      </div>
    </div>
  );
}
