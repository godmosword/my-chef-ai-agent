"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PANTRY_TONIGHT_MAX } from "@/domain/pantry/tonight";
import { useTonightPantry } from "@/hooks/useTonightPantry";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { cn } from "@/lib/utils/cn";

export type TonightPantryPanelProps = {
  className?: string;
  disabled?: boolean;
};

export function TonightPantryPanel({ className, disabled }: TonightPantryPanelProps) {
  const { items, hydrated, addItem, removeItem } = useTonightPantry();
  const [draft, setDraft] = useState("");

  if (!hydrated) return null;

  const onAdd = () => {
    if (!draft.trim() || items.length >= PANTRY_TONIGHT_MAX) return;
    addItem(draft);
    setDraft("");
  };

  return (
    <section
      className={cn(
        "rounded-lg border border-border-default bg-surface-muted/40 p-4",
        className,
      )}
      aria-label="今晚要清掉的食材"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-text-ink">今晚清冰箱</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            最多 {PANTRY_TONIGHT_MAX} 樣，生成時會優先使用
          </p>
        </div>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((name, i) => (
            <li
              key={`${name}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-surface-default px-2.5 py-1 text-sm text-text-ink ring-1 ring-border-default"
            >
              {name}
              <button
                type="button"
                className="rounded p-0.5 text-text-muted hover:text-text-ink"
                aria-label={`移除 ${name}`}
                disabled={disabled}
                onClick={() => removeItem(i)}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length < PANTRY_TONIGHT_MAX && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd();
          }}
        >
          <Input
            value={draft}
            onChange={setDraft}
            placeholder="例如：高麗菜、絞肉"
            disabled={disabled}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={disabled || !draft.trim()}
          >
            加入
          </Button>
        </form>
      )}
    </section>
  );
}
