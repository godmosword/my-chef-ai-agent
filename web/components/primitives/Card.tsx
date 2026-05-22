import { cn } from "@/lib/utils/cn";

export type CardProps = {
  as?: "div" | "article" | "button";
  interactive?: boolean;
  padding?: "none" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export function Card({
  as = "div",
  interactive,
  padding = "md",
  children,
  className,
  onClick,
}: CardProps) {
  const Comp = as;
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border-default bg-surface-default shadow-card",
        padding === "md" && "p-4",
        padding === "lg" && "p-6",
        interactive &&
          "cursor-pointer transition-[transform,box-shadow] duration-[var(--motion-duration-normal)] hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
