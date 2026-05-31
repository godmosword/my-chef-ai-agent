"use client";

import { useEffect, useState } from "react";
import {
  DISPLAY_NAME_CHANGED_EVENT,
  readDisplayName,
} from "@/platform/browser-storage/display-name";

const FALLBACK = "美食家";

/** React hook that re-renders when displayName changes (same tab or other tabs). */
export function useDisplayName(): string {
  const [name, setName] = useState<string>(FALLBACK);

  useEffect(() => {
    setName(readDisplayName());
    const onChange = () => setName(readDisplayName());
    window.addEventListener(DISPLAY_NAME_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(DISPLAY_NAME_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return name;
}
