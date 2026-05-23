"use client";

import { Suspense } from "react";
import { ShoppingPageClient } from "./ShoppingPageClient";

export default function ShoppingPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">載入採買清單…</p>}>
      <ShoppingPageClient />
    </Suspense>
  );
}
