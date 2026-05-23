"use client";

import Image from "next/image";
import { useState } from "react";
import { MARKETING_SECTION } from "@/lib/marketing/content";

function LibraryMock() {
  const cards = MARKETING_SECTION.useCases.map((u) => ({
    title: u.title,
    gradient: u.gradient,
  }));

  return (
    <div className="grid h-full grid-cols-2 gap-2 p-3" aria-hidden>
      {cards.map((c) => (
        <div
          key={c.title}
          className="overflow-hidden rounded-lg border border-border-default bg-surface-default"
        >
          <div
            className="h-14"
            style={{
              background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})`,
            }}
          />
          <p className="p-2 font-serif text-xs text-text-ink">{c.title}</p>
        </div>
      ))}
    </div>
  );
}

function CookingMock() {
  return (
    <div className="flex h-full flex-col justify-center space-y-3 bg-[#0f0e0d] p-4 text-[#f5f0e6]" aria-hidden>
      <p className="text-xs uppercase tracking-wide text-[#9c8f84]">步驟 2 / 5</p>
      <p className="font-serif text-2xl leading-snug">中火下鍋，煎至兩面金黃</p>
      <div className="inline-flex w-fit rounded-full bg-[#c8922a] px-4 py-2 text-sm font-medium">
        計時 08:00
      </div>
    </div>
  );
}

type FeatureShotProps = {
  src: string;
  alt: string;
  mock: React.ReactNode;
};

function FeatureShot({ src, alt, mock }: FeatureShotProps) {
  const [showPhoto, setShowPhoto] = useState(true);

  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-border-default bg-surface-muted">
      {!showPhoto && <div className="absolute inset-0">{mock}</div>}
      {showPhoto && (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          onError={() => setShowPhoto(false)}
        />
      )}
    </div>
  );
}

export function LibraryFeatureShot() {
  return (
    <FeatureShot
      src={MARKETING_SECTION.features.library.screenshot}
      alt="料理書列表示意"
      mock={<LibraryMock />}
    />
  );
}

export function CookingFeatureShot() {
  return (
    <FeatureShot
      src={MARKETING_SECTION.features.cooking.screenshot}
      alt="廚房模式示意"
      mock={<CookingMock />}
    />
  );
}
