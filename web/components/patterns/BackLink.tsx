import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type BackLinkProps = {
  href: string;
  label: string;
  className?: string;
};

export function BackLink({ href, label, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
