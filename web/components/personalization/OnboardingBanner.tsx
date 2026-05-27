"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchOnboardingStatus } from "@/application/api/personalization";

export function OnboardingBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchOnboardingStatus();
        if (!cancelled && status === "pending") setShow(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-4 py-3 text-sm"
      role="status"
    >
      <span>想要更個人化的推薦？30 秒快速設定口味</span>
      <Link
        href="/app/onboarding"
        className="font-medium text-brand-primary underline hover:no-underline"
      >
        快速設定 →
      </Link>
    </div>
  );
}
