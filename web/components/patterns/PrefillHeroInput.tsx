"use client";

import { useSearchParams } from "next/navigation";
import { InputHero, type InputHeroProps } from "@/components/app-home/InputHero";
import type { GenerationErrorView } from "@/lib/api/error-types";

export function PrefillHeroInput(
  props: Omit<InputHeroProps, "defaultValue" | "error"> & {
    error?: string | null;
    errorView?: GenerationErrorView | null;
  },
) {
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

  return <InputHero {...props} defaultValue={defaultValue} />;
}
