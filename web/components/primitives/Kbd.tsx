import { cn } from "@/lib/utils/cn";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[1.25rem] items-center justify-center rounded border border-border-default bg-canvas px-1 py-0.5 font-mono text-[10px] text-text-body",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
