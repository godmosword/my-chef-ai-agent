import { cn } from "@/lib/utils/cn";

function toneClass(value: number, max: number, tone: "auto" | "primary" | "warning" | "danger") {
  if (tone !== "auto") {
    return tone === "primary"
      ? "bg-brand-primary"
      : tone === "warning"
        ? "bg-warning"
        : "bg-danger";
  }
  const pct = max > 0 ? value / max : 0;
  if (pct >= 0.9) return "bg-danger";
  if (pct >= 0.7) return "bg-warning";
  return "bg-brand-primary";
}

export type ProgressBarProps = {
  value: number;
  max: number;
  tone?: "auto" | "primary" | "warning" | "danger";
  className?: string;
};

export function ProgressBar({
  value,
  max,
  tone = "auto",
  className,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-[var(--motion-duration-normal)]", toneClass(value, max, tone))}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
