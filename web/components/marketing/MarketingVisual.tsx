import { cn } from "@/lib/utils/cn";

const USE_REAL_IMAGES = process.env.NEXT_PUBLIC_MARKETING_USE_REAL_IMAGES === "1";

export type MarketingVisualProps = {
  src: string;
  alt: string;
  fallbackGradient: [string, string];
  fallbackLabel?: string;
  className?: string;
  /** Screenshot-style placeholder (muted block + caption) instead of gradient */
  screenshotCaption?: string;
};

/** Marketing asset: gradient placeholder by default; opt-in real files via env. */
export function MarketingVisual({
  src,
  alt,
  fallbackGradient,
  fallbackLabel,
  className,
  screenshotCaption,
}: MarketingVisualProps) {
  const isMarketing = src.startsWith("/marketing/");
  const showPhoto = USE_REAL_IMAGES && isMarketing;

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  if (screenshotCaption) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center bg-surface-muted px-4 text-center",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <p className="text-sm font-medium text-text-ink">{screenshotCaption}</p>
        <p className="mt-1 text-xs text-text-muted">{alt}</p>
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-full w-full items-center justify-center", className)}
      style={{
        background: `linear-gradient(135deg, ${fallbackGradient[0]}, ${fallbackGradient[1]})`,
      }}
      role="img"
      aria-label={alt}
    >
      {fallbackLabel ? (
        <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] text-white backdrop-blur">
          {fallbackLabel}
        </span>
      ) : null}
    </div>
  );
}
