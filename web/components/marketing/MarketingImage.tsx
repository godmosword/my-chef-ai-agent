"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type MarketingImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  fallbackGradient: [string, string];
  fallbackLabel?: string;
};

export function MarketingImage({
  src,
  alt,
  width,
  height,
  className,
  priority,
  fill,
  sizes,
  fallbackGradient,
  fallbackLabel = "示範圖即將更新",
}: MarketingImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          className,
        )}
        style={{
          background: `linear-gradient(135deg, ${fallbackGradient[0]}, ${fallbackGradient[1]})`,
        }}
        role="img"
        aria-label={alt}
      >
        <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] text-white backdrop-blur">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <div className={cn("absolute inset-0", className)}>
        {failed ? (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${fallbackGradient[0]}, ${fallbackGradient[1]})`,
            }}
            role="img"
            aria-label={alt}
          >
            <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] text-white backdrop-blur">
              {fallbackLabel}
            </span>
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            priority={priority}
            sizes={sizes}
            onError={() => setFailed(true)}
          />
        )}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 600}
      className={cn("h-full w-full object-cover", className)}
      priority={priority}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
