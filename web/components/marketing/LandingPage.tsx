import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Hero } from "@/components/marketing/Hero";
import { UseCaseGrid } from "@/components/marketing/UseCaseGrid";
import { Footer } from "@/components/marketing/Footer";

const sectionY = "py-[clamp(3rem,8vw,5rem)]";

export function LandingPage() {
  return (
    <div id="top" className="min-h-screen scroll-smooth bg-canvas">
      <MarketingHeader />
      <main className="mx-auto max-w-[70rem] px-6">
        <div className={sectionY}>
          <Hero />
        </div>
        <div className={sectionY}>
          <UseCaseGrid />
        </div>
        <Footer />
      </main>
    </div>
  );
}
