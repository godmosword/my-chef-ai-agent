import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-default py-8">
      <div className="flex flex-col gap-4 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} 職人料理大腦 ·{" "}
          <a
            href="https://github.com/godmosword/my-chef-ai-agent"
            className="text-brand-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            MIT licensed
          </a>
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="頁尾連結">
          <Link href="/legal/privacy" className="hover:text-text-ink">
            隱私
          </Link>
          <Link href="/legal/disclaimer" className="hover:text-text-ink">
            免責
          </Link>
          <a
            href="https://github.com/godmosword/my-chef-ai-agent"
            className="hover:text-text-ink"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
