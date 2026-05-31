"use client";

import { useEffect, useState } from "react";
import { PantryListResponseSchema } from "@chef/shared-types";
import {
  categorizeForDisplay,
  formatQuantityForDisplay,
  itemToCleanFridgeLine,
  type PantryDisplayItem,
} from "@/domain/pantry/pantry-ui";
import { parseApiResponse } from "@/lib/api-client/client";
import { Button } from "@/components/primitives/Button";

export type CleanFridgeDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (lines: string[], mode: "all" | "expiring") => void;
};

type PantryApiItem = PantryDisplayItem & { id: number };

export function CleanFridgeDialog({
  open,
  onClose,
  onConfirm,
}: CleanFridgeDialogProps) {
  const [items, setItems] = useState<PantryApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/me/pantry?include_expired=0");
        const data = await parseApiResponse(res, PantryListResponseSchema);
        if (cancelled) return;
        const list = data.items as PantryApiItem[];
        setItems(list);
        setSelected(new Set(list.map((i) => i.id!)));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const lines = items
    .filter((i) => selected.has(i.id!))
    .map((i) => itemToCleanFridgeLine(i));

  const expiringIds = new Set<number>();
  const groups = categorizeForDisplay(items, new Date().toISOString().slice(0, 10), 3);
  const expiringGroup = groups.find((g) => g.id === "expiring");
  for (const it of expiringGroup?.items ?? []) {
    if (it.id != null) expiringIds.add(it.id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="clean-fridge-title"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-xl bg-surface-default p-4 shadow-lg">
        <h2 id="clean-fridge-title" className="font-serif text-lg text-text-ink">
          用冰箱現有食材做菜
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {loading
            ? "讀取冰箱庫存…"
            : items.length
              ? `你的冰箱有 ${items.length} 項，要選哪些？`
              : "冰箱還是空的，將使用手動清單"}
        </p>
        {!loading && items.length > 0 && (
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {items.slice(0, 12).map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(item.id!)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(item.id!)) next.delete(item.id!);
                    else next.add(item.id!);
                    setSelected(next);
                  }}
                  className="mt-1"
                />
                <span>
                  {item.display_name} · {formatQuantityForDisplay(item)}
                </span>
              </li>
            ))}
            {items.length > 12 && (
              <li className="text-text-muted">…還有 {items.length - 12} 項</li>
            )}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!lines.length}
            onClick={() => {
              onConfirm(lines, "all");
              onClose();
            }}
          >
            開始做菜
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!expiringIds.size}
            onClick={() => {
              const expLines = items
                .filter((i) => expiringIds.has(i.id!))
                .map((i) => itemToCleanFridgeLine(i));
              onConfirm(expLines.length ? expLines : lines, "expiring");
              onClose();
            }}
          >
            優先快過期
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}
