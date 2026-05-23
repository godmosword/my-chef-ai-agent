import { MarketingImage } from "@/components/marketing/MarketingImage";
import { MARKETING_SECTION } from "@/lib/marketing/content";

const demo = MARKETING_SECTION.hero.demoRecipe;

export function DemoRecipeCard() {
  return (
    <article className="bg-surface-default p-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
        <MarketingImage
          src={demo.image}
          alt={demo.imageAlt}
          fill
          sizes="280px"
          fallbackGradient={["#E5A33D", "#C8881A"]}
          fallbackLabel="三杯雞"
          priority
        />
        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white backdrop-blur">
          {demo.cuisine}
        </span>
      </div>
      <h3 className="mt-3 font-serif text-lg font-medium text-text-ink">{demo.title}</h3>
      <p className="mt-1 text-xs text-text-muted">
        {demo.ingredientCount} 樣食材 · {demo.stepCount} 個步驟
      </p>
    </article>
  );
}
