import { MARKETING_SECTION } from "@/lib/marketing/content";

const { hero } = MARKETING_SECTION;
const demo = hero.demoRecipe;
const accent: [string, string] = ["#E5A33D", "#C8881A"];

/** Decorative preview: Tonight input + recipe summary, no hero image. */
export function LandingHeroMock() {
  return (
    <div aria-hidden="true" className="space-y-3 p-3">
      <div className="overflow-hidden rounded-xl border-2 border-border-default bg-surface-default shadow-card">
        <div className="border-b border-border-default px-3 py-2.5 text-sm leading-snug text-text-muted">
          {hero.demoPrefill}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border-default bg-surface-muted px-3 py-2">
          <span className="text-[10px] text-text-muted">⌘ + ↵ 送出</span>
          <span className="pointer-events-none rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-brand-greenText">
            生成食譜 →
          </span>
        </div>
      </div>

      <article className="relative overflow-hidden rounded-lg border border-border-default bg-surface-default p-3 shadow-card">
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background: `linear-gradient(90deg, ${accent[0]}, ${accent[1]})`,
          }}
        />
        <div className="flex items-start justify-between gap-2 pt-1">
          <h3 className="font-serif text-lg font-medium text-text-ink">{demo.title}</h3>
          <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-text-muted">
            {demo.cuisine}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {demo.ingredientCount} 樣食材 · {demo.stepCount} 個步驟
        </p>
      </article>
    </div>
  );
}
