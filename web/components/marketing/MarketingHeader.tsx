import Link from "next/link";
import { ChefHat } from "lucide-react";

export function MarketingHeader() {
  return (
    <header className="mx-auto flex max-w-[70rem] items-center justify-between px-6 py-6">
      <Link
        href="/#top"
        className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <ChefHat className="size-7 text-brand-primary" aria-hidden />
        <span className="font-serif text-xl text-text-ink">職人料理大腦</span>
      </Link>
      <nav className="flex items-center gap-3 text-sm" aria-label="主要導覽">
        <Link href="/legal/privacy" className="text-text-muted hover:text-text-ink">
          隱私
        </Link>
        <Link
          href="/app"
          className="inline-flex h-[var(--spacing-btn-sm)] items-center rounded-lg bg-brand-primary px-4 text-sm font-medium text-brand-greenText transition-colors hover:bg-brand-primaryDark"
        >
          進入 App
        </Link>
      </nav>
    </header>
  );
}
