import { cn } from "@/lib/utils/cn";

const sizes = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
} as const;

export type AvatarProps = {
  label: string;
  size?: keyof typeof sizes;
  className?: string;
};

export function Avatar({ label, size = "md", className }: AvatarProps) {
  const initial = (label.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-greenLight font-medium text-brand-green",
        sizes[size],
        className,
      )}
    >
      {initial}
    </span>
  );
}
