"use client";

import { useMemo, useState } from "react";
import type { AggregatedShoppingItem, ShoppingCategory } from "@chef/shared-types";
import { shoppingItemAtHome } from "@/domain/plan/filter-pantry";
import { formatItemAmount } from "@/domain/plan/shopping-list";
import { cn } from "@/lib/utils/cn";

const GROUP_LABEL: Record<ShoppingCategory, string> = {
  produce: "蔬菜",
  protein: "蛋白質",
  dairy: "乳品",
  pantry: "乾貨",
  spice: "調味",
  other: "其他",
};

const GROUP_ORDER: ShoppingCategory[] = [
  "produce",
  "protein",
  "dairy",
  "pantry",
  "spice",
  "other",
];

export type ShoppingListViewProps = {
  items: AggregatedShoppingItem[];
  groups: Partial<Record<ShoppingCategory, AggregatedShoppingItem[]>>;
  printMode?: boolean;
  /** Tonight pantry: auto-strike items already at home */
  pantryItems?: string[];
};

export function ShoppingListView({
  items,
  groups,
  printMode,
  pantryItems = [],
}: ShoppingListViewProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const sections = useMemo(() => {
    return GROUP_ORDER.map((cat) => ({
      cat,
      label: GROUP_LABEL[cat],
      items: groups[cat]?.length ? groups[cat] : [],
    })).filter((s) => s.items.length > 0);
  }, [groups]);

  if (!items.length) {
    // Empty state is rendered by the parent so it has access to weekOf.
    return null;
  }

  return (
    <div className={cn(printMode && "shopping-print-root")}>
      {sections.map((section) => (
        <section
          key={section.cat}
          className={cn("mb-6", printMode && "shopping-print-group")}
        >
          <h2 className="mb-2 text-sm font-medium text-text-ink">
            {section.label}（{section.items.length} 項）
          </h2>
          <ul className="divide-y divide-border-default rounded-lg border border-border-default bg-surface-default">
            {section.items.map((item) => {
              const key = `${item.name}-${formatItemAmount(item)}`;
              const atHome = shoppingItemAtHome(item, pantryItems);
              const isChecked = checked[key] || (atHome && !printMode);
              return (
                <li
                  key={key}
                  className={cn(
                    "border-b border-border-default p-3 last:border-b-0",
                    isChecked && !printMode && "opacity-50",
                  )}
                >
                  <label className="flex cursor-pointer items-start gap-2">
                    {!printMode && (
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!!isChecked}
                        onChange={() =>
                          setChecked((c) => ({ ...c, [key]: !c[key] }))
                        }
                      />
                    )}
                    <span className="flex-1">
                      <span className="font-medium text-text-ink">
                        {item.name} {formatItemAmount(item)}
                        {atHome && (
                          <span className="ml-1 text-xs font-normal text-brand-primary">
                            家裡已有
                          </span>
                        )}
                      </span>
                      {!printMode && item.sources.length > 0 && (
                        <button
                          type="button"
                          className="mt-1 block text-xs text-brand-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            setExpanded(expanded === key ? null : key);
                          }}
                        >
                          {expanded === key ? "收合來源" : "查看來源"}
                        </button>
                      )}
                      {(printMode || expanded === key) && (
                        <ul className="mt-1 text-xs text-text-muted">
                          {item.sources.map((s, i) => (
                            <li key={i}>
                              {s.recipe_title}（{s.date} {s.slot}，{s.servings} 人）
                            </li>
                          ))}
                        </ul>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
