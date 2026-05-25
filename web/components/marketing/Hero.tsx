"use client";

import Link from "next/link";
import { PhoneFrame } from "@/components/marketing/PhoneFrame";
import { LandingHeroMock } from "@/components/marketing/LandingHeroMock";
import { appPrefillHref, MARKETING_SECTION } from "@/lib/marketing/content";
import { capture } from "@/lib/analytics/events";

const { hero } = MARKETING_SECTION;

export function Hero() {
  return (
    <section
      aria-labelledby="landing-hero-heading"
      className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12"
    >
      <div className="order-2 lg:order-1 lg:col-span-6">
        <p className="text-xs font-medium uppercase tracking-widest text-brand-primary">
          {hero.eyebrow}
        </p>
        <h1
          id="landing-hero-heading"
          className="mt-3 text-balance font-serif text-[2rem] font-medium leading-tight text-text-ink sm:text-4xl lg:text-5xl"
        >
          {hero.headline}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-text-body lg:text-lg">
          {hero.body}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/app"
            onClick={() => capture("landing_primary_cta_clicked")}
            className="inline-flex h-[var(--spacing-btn-lg)] items-center justify-center rounded-lg bg-brand-primary px-6 text-lg font-medium text-brand-greenText transition-colors duration-200 hover:bg-brand-primaryDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            {hero.primaryCta}
          </Link>
          <Link
            href={hero.secondaryHref}
            onClick={() => capture("landing_demo_cta_clicked")}
            className="inline-flex h-[var(--spacing-btn-lg)] items-center justify-center rounded-lg border border-border-default bg-surface-default px-6 text-lg font-medium text-text-ink transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            {hero.secondaryCta}
          </Link>
        </div>
      </div>

      <div className="order-1 flex justify-center lg:order-2 lg:col-span-6">
        <PhoneFrame>
          <LandingHeroMock />
        </PhoneFrame>
      </div>
    </section>
  );
}
