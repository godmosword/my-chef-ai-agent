"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { QuotaIndicator } from "@/components/patterns/QuotaIndicator";
import { Button } from "@/components/primitives/Button";
import { FLAGS } from "@/lib/flags";

export default function MePage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header>
        <h1 className="font-serif text-2xl text-text-ink">Me</h1>
        <p className="mt-1 text-sm text-text-muted">配額、外觀與法律資訊</p>
      </header>

      <section className="rounded-lg border border-border-default bg-surface-default p-4">
        <h2 className="font-medium text-text-ink">今日配額</h2>
        <div className="mt-4">
          <QuotaIndicator refreshIntervalMs={15_000} />
        </div>
      </section>

      <section className="rounded-lg border border-border-default bg-surface-default p-4">
        <h2 className="font-medium text-text-ink">外觀</h2>
        <p className="mt-1 text-sm text-text-muted">跟隨系統或手動切換淺色／深色</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <Button
              key={t}
              variant={theme === t ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTheme(t)}
            >
              {t === "light" ? "淺色" : t === "dark" ? "深色" : "系統"}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border-default bg-surface-default p-4 text-sm">
        <h2 className="font-medium text-text-ink">法律與隱私</h2>
        <ul className="mt-2 space-y-2 text-brand-primary">
          <li>
            <Link href="/legal/privacy" className="hover:underline">
              隱私權政策
            </Link>
          </li>
          <li>
            <Link href="/legal/disclaimer" className="hover:underline">
              免責聲明
            </Link>
          </li>
        </ul>
      </section>

      {!FLAGS.newUI && (
        <p className="text-xs text-text-muted">
          新 UI 需設定環境變數 <code className="rounded bg-surface-muted px-1">NEXT_PUBLIC_NEW_UI=1</code>
        </p>
      )}
    </div>
  );
}
