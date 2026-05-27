"use client";

import { useState } from "react";
import Link from "next/link";
import type { AppliedPersonalization } from "@/application/personalization/applied-personalization";
import { appliedPersonalizationIsEmpty } from "@/application/personalization/applied-personalization";
import { showAppliedPersonalization } from "@/platform/config/personalization-ui-config";

type Props = {
  applied: AppliedPersonalization | null | undefined;
};

export function WhyThisRecipe({ applied }: Props) {
  const [open, setOpen] = useState(false);

  if (!showAppliedPersonalization() || !applied) return null;

  const empty = appliedPersonalizationIsEmpty(applied);

  return (
    <div className="rounded-lg border border-border-default bg-surface-muted/40 px-3 py-2 text-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left font-medium text-text-ink"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{open ? "▾" : "▸"} 為什麼推薦這個</span>
      </button>
      {open ? (
        <div className="mt-2 space-y-2 text-text-body">
          {empty ? (
            <p className="text-text-muted">
              我還不太了解你的口味。
              <Link href="/app/onboarding" className="ml-1 text-brand-primary underline">
                開始快速設定
              </Link>
            </p>
          ) : (
            <>
              <p className="text-text-muted">我考慮了以下偏好：</p>
              <ul className="list-inside list-disc space-y-1">
                {[
                  ...applied.hard_constraints_applied,
                  ...applied.soft_preferences_applied,
                  ...applied.household_considered,
                ].map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Link
                href="/app/profile"
                className="inline-block text-brand-primary underline hover:no-underline"
              >
                編輯口味檔案
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
