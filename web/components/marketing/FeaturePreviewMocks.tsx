import { MARKETING_SECTION } from "@/lib/marketing/content";
import { MarketingVisual } from "@/components/marketing/MarketingVisual";

function CookingMock() {
  return (
    <div
      className="cooking-mode flex h-full flex-col justify-center space-y-3 p-4"
      aria-hidden
    >
      <p className="text-xs uppercase tracking-wide text-text-muted">步驟 2 / 5</p>
      <p className="font-serif text-2xl leading-snug text-text-ink">中火下鍋，煎至兩面金黃</p>
      <div className="inline-flex w-fit rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-brand-greenText">
        計時 08:00
      </div>
    </div>
  );
}

export function LibraryFeatureShot() {
  const { library } = MARKETING_SECTION.features;
  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-border-default">
      <MarketingVisual
        src={library.screenshot}
        alt="料理書列表示意"
        fallbackGradient={["#D9CFBE", "#A39A8E"]}
        screenshotCaption={library.title}
        className="h-full w-full"
      />
    </div>
  );
}

export function CookingFeatureShot() {
  const { cooking } = MARKETING_SECTION.features;
  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-border-default">
      <div className="absolute inset-0">
        <CookingMock />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3">
        <p className="text-sm font-medium text-white">{cooking.title}</p>
        <p className="text-xs text-white/80">廚房模式示意</p>
      </div>
    </div>
  );
}
