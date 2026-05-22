import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { ChefHat } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex max-w-content items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <ChefHat className="size-7 text-brand-primary" aria-hidden />
          <span className="font-serif text-xl text-text-ink">職人料理大腦</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/legal/privacy" className="text-text-muted hover:text-text-ink">
            隱私
          </Link>
          <Button asChild size="sm">
            <Link href="/app">進入 App</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-content px-4 pb-16 pt-8 md:pt-16">
        <h1 className="max-w-2xl font-serif text-4xl leading-tight text-text-ink md:text-5xl">
          用一句話，換一桌剛好的晚餐
        </h1>
        <p className="mt-4 max-w-xl text-lg text-text-muted">
          AI 食譜助理：記住你的口味、生成步驟與食材，並在 Library 裡累積你的料理檔案。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/app">開始料理</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/legacy">使用經典聊天介面</Link>
          </Button>
        </div>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            { title: "Today", body: "描述今晚想吃的，立即生成食譜。" },
            { title: "Library", body: "搜尋、篩選與收藏你的食譜庫。" },
            { title: "配額透明", body: "文字與圖片配額一目了然。" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border-default bg-surface-default p-5 shadow-card"
            >
              <h2 className="font-serif text-xl text-text-ink">{f.title}</h2>
              <p className="mt-2 text-sm text-text-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
