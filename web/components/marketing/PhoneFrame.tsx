import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PhoneFrameProps = {
  children: ReactNode;
  className?: string;
};

export function PhoneFrame({ children, className }: PhoneFrameProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[280px] rounded-[2rem] border-[8px] border-text-ink/90 bg-text-ink p-2 shadow-card sm:max-w-[320px]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.4rem] bg-canvas">{children}</div>
    </div>
  );
}
