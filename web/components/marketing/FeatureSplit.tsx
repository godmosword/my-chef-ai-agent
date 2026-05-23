import { LibraryFeatureShot, CookingFeatureShot } from "@/components/marketing/FeaturePreviewMocks";
import { MARKETING_SECTION } from "@/lib/marketing/content";

const { library, cooking } = MARKETING_SECTION.features;

export function FeatureSplit() {
  return (
    <section aria-labelledby="landing-features-heading">
      <h2
        id="landing-features-heading"
        className="text-center font-serif text-2xl font-medium text-text-ink sm:text-3xl"
      >
        一道食譜，三種使用方式
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-text-muted">
        生成後留在料理書，進廚房用專注模式跟著做。
      </p>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <LibraryFeatureShot />
          <h3 className="mt-4 font-serif text-xl font-medium text-text-ink">{library.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-body">{library.body}</p>
        </div>
        <div>
          <CookingFeatureShot />
          <h3 className="mt-4 font-serif text-xl font-medium text-text-ink">{cooking.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-body">{cooking.body}</p>
        </div>
      </div>
    </section>
  );
}
