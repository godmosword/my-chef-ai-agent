"use client";

import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/primitives/Button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas p-8 text-center">
      <CloudOff className="mb-6 size-16 text-text-muted" aria-hidden />
      <h1 className="font-serif text-2xl text-text-ink">你目前處於離線狀態</h1>
      <p className="mt-2 max-w-md text-text-muted">
        生成新食譜需要網路連線。但你已經做過的食譜仍可離線開啟。
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/app/library">開啟我的食譜</Link>
        </Button>
        <Button variant="secondary" type="button" onClick={() => window.location.reload()}>
          重試
        </Button>
      </div>
    </div>
  );
}
