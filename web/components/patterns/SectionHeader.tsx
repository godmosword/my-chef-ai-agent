import Link from "next/link";

export type SectionHeaderProps = {
  title: string;
  actionHref?: string;
  actionLabel?: string;
};

export function SectionHeader({
  title,
  actionHref,
  actionLabel = "看全部",
}: SectionHeaderProps) {
  return (
    <header className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-medium text-text-ink">{title}</h2>
      {actionHref ? (
        <Link href={actionHref} className="text-xs text-brand-primary hover:underline">
          {actionLabel} <span aria-hidden>→</span>
        </Link>
      ) : null}
    </header>
  );
}
