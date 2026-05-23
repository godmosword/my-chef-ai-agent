import Link from "next/link";
import { MarketingImage } from "@/components/marketing/MarketingImage";
import { appPrefillHref } from "@/lib/marketing/content";

export type UseCaseCardModel = {
  label: string;
  title: string;
  quote: string;
  prefill: string;
  image: string;
  gradient: [string, string];
};

export function UseCaseCard({ item }: { item: UseCaseCardModel }) {
  return (
    <Link
      href={appPrefillHref(item.prefill)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border-default bg-surface-default shadow-card transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <div className="relative h-[120px] w-full shrink-0">
        <MarketingImage
          src={item.image}
          alt={item.title}
          fallbackGradient={item.gradient}
          fallbackLabel={item.label}
          className="absolute inset-0"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-primary">
          {item.label}
        </span>
        <h3 className="mt-1 font-serif text-base font-medium text-text-ink">{item.title}</h3>
        <p className="mt-2 text-sm text-text-muted">&ldquo;{item.quote}&rdquo;</p>
      </div>
    </Link>
  );
}
