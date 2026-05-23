import Link from "next/link";
import { Button } from "@/components/primitives/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-text-muted">404</p>
      <h1 className="font-serif text-2xl text-text-ink">找不到這個頁面</h1>
      <p className="max-w-sm text-sm text-text-muted">
        連結可能已失效，或頁面已移動。公開食譜若已取消分享也會無法開啟。
      </p>
      <Button asChild>
        <Link href="/app">回到首頁</Link>
      </Button>
    </main>
  );
}
