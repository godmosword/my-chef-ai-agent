import { BookOpen, ChefHat, UtensilsCrossed, Zap } from "lucide-react";
import { MARKETING_SECTION } from "@/lib/marketing/content";

const ICONS = {
  "chef-hat": ChefHat,
  book: BookOpen,
  zap: Zap,
  utensils: UtensilsCrossed,
} as const;

export function FeaturePills() {
  return (
    <section aria-labelledby="landing-why-heading">
      <h2
        id="landing-why-heading"
        className="text-center font-serif text-2xl font-medium text-text-ink sm:text-3xl"
      >
        為什麼是它
      </h2>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MARKETING_SECTION.pills.map((pill) => {
          const Icon = ICONS[pill.icon];
          return (
            <li
              key={pill.title}
              className="rounded-xl border border-border-default bg-surface-default p-5 shadow-card"
            >
              <Icon className="size-8 text-brand-primary" aria-hidden />
              <h3 className="mt-3 font-serif text-base font-medium text-text-ink">
                {pill.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{pill.body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
