import Link from "next/link";
import { Button } from "@/components/primitives/Button";

export default function QuotaReachedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl text-text-ink">今日額度已用完</h1>
      <p className="max-w-sm text-sm text-text-muted">
        明天會重置配額。你仍可在料理書查看與烹飪既有食譜。
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/app/library">前往料理書</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/app">回到今晚</Link>
        </Button>
      </div>
    </main>
  );
}
