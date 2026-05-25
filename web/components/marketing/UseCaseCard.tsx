import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { appPrefillHref } from "@/lib/marketing/content";

export type UseCaseCardModel = {
  label: string;
  title: string;
  quote: string;
  prefill: string;
  gradient: [string, string];
};

/**
 * Editorial recipe-card style: typography-first, no flat color block hero.
 * The gradient is reduced to a 4px accent stripe at the top so each card still
 * carries its scenario's color identity without screaming AI-slop.
 */
export function UseCaseCard({ item }: { item: UseCaseCardModel }) {
  return (
    <Link
      href={appPrefillHref(item.prefill)}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border-default bg-surface-default p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${item.gradient[0]}, ${item.gradient[1]})`,
        }}
      />

      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
        {item.label}
      </span>

      <h3 className="mt-3 font-serif text-2xl leading-snug text-text-ink">
        {item.title}
      </h3>

      <p className="mt-3 flex-1 font-serif text-base italic leading-relaxed text-text-body">
        &ldquo;{item.quote}&rdquo;
      </p>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary transition-transform duration-200 group-hover:translate-x-0.5">
        生成這道
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
