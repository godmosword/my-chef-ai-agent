"use client";

import { useCallback, useMemo, useState } from "react";
import type { QuickChip } from "@/lib/copy/quick-chips";

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").replace(/，+/g, "，").trim();
}

function appendInsert(current: string, insert: string): string {
  const base = current.trimEnd();
  if (!base) return insert;
  if (base.endsWith(insert.trim())) return base;
  const sep = base.endsWith("，") || base.endsWith(",") ? "" : "，";
  return normalizeSpaces(`${base}${sep}${insert}`);
}

function removeInsert(current: string, insert: string): string {
  const trimmed = insert.trim();
  let next = current;
  if (next.includes(insert)) {
    next = next.split(insert).join("");
  } else if (trimmed && next.includes(trimmed)) {
    next = next.split(trimmed).join("");
  }
  return normalizeSpaces(next.replace(/^，|，$/g, ""));
}

export function useChipState(chips: readonly QuickChip[], text: string, setText: (v: string) => void) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const syncFromText = useCallback(
    (value: string) => {
      const next = new Set<string>();
      for (const chip of chips) {
        if (value.includes(chip.insert.trim())) next.add(chip.id);
      }
      setSelected(next);
    },
    [chips],
  );

  const onTextChange = useCallback(
    (value: string) => {
      setText(value);
      if (!value.trim()) {
        setSelected(new Set());
        return;
      }
      syncFromText(value);
    },
    [setText, syncFromText],
  );

  const toggleChip = useCallback(
    (chip: QuickChip) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(chip.id)) {
          next.delete(chip.id);
          setText(removeInsert(text, chip.insert));
        } else {
          next.add(chip.id);
          setText(appendInsert(text, chip.insert));
        }
        return next;
      });
    },
    [text, setText],
  );

  const setSelectedIds = useCallback((ids: readonly string[]) => {
    setSelected(new Set(ids));
    let merged = text;
    for (const id of ids) {
      const chip = chips.find((c) => c.id === id);
      if (chip && !merged.includes(chip.insert.trim())) {
        merged = appendInsert(merged, chip.insert);
      }
    }
    if (merged !== text) setText(merged);
  }, [chips, text, setText]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return { selected, selectedIds, toggleChip, onTextChange, setSelectedIds };
}
