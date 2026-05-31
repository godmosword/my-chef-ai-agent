"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "chef_display_name";
const FALLBACK = "美食家";
const EVENT = "chef:display-name-changed";

export function readDisplayName(): string {
  if (typeof window === "undefined") return FALLBACK;
  const v = window.localStorage.getItem(STORAGE_KEY)?.trim();
  return v && v.length > 0 ? v : FALLBACK;
}

export function writeDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim().slice(0, 24);
  if (trimmed.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** React hook that re-renders when displayName changes (same tab or other tabs). */
export function useDisplayName(): string {
  const [name, setName] = useState<string>(FALLBACK);

  useEffect(() => {
    setName(readDisplayName());
    const onChange = () => setName(readDisplayName());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return name;
}
