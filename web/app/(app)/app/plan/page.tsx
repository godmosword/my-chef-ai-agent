"use client";

import { Suspense } from "react";
import { PlanPageClient } from "./PlanPageClient";

export default function PlanPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">載入週曆…</p>}>
      <PlanPageClient />
    </Suspense>
  );
}
