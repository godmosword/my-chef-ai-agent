"use client";

import { useSearchParams } from "next/navigation";
import { HeroInput, type HeroInputProps } from "@/components/patterns/HeroInput";

export function PrefillHeroInput(props: Omit<HeroInputProps, "defaultValue">) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("prefill");
  let defaultValue = "";
  if (raw) {
    try {
      defaultValue = decodeURIComponent(raw);
    } catch {
      defaultValue = raw;
    }
  }

  return <HeroInput {...props} defaultValue={defaultValue} />;
}
