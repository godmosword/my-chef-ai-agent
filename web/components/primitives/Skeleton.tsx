import { cn } from "@/lib/utils/cn";

export type SkeletonProps = {
  variant?: "text" | "rect" | "circle";
  className?: string;
};

export function Skeleton({ variant = "rect", className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse bg-surface-muted",
        variant === "text" && "h-4 w-full rounded",
        variant === "rect" && "h-full w-full rounded-lg",
        variant === "circle" && "size-10 rounded-full",
        className,
      )}
    />
  );
}
