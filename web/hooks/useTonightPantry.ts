"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PANTRY_STORAGE_KEY,
  sanitizeTonightPantry,
} from "@/domain/pantry/tonight";
import { capture } from "@/platform/analytics/events";

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PANTRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sanitizeTonightPantry(parsed.map(String));
  } catch {
    return [];
  }
}

export function useTonightPantry() {
  const [items, setItems] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  const save = useCallback((next: string[]) => {
    const clean = sanitizeTonightPantry(next);
    setItems(clean);
    try {
      localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      /* quota */
    }
    capture("pantry_tonight_saved", { pantry_items_count: clean.length });
    return clean;
  }, []);

  const addItem = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return items;
      return save([...items, trimmed]);
    },
    [items, save],
  );

  const removeItem = useCallback(
    (index: number) => {
      const next = items.filter((_, i) => i !== index);
      return save(next);
    },
    [items, save],
  );

  return { items, hydrated, save, addItem, removeItem };
}
