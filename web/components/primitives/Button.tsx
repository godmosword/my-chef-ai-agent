"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[color,background,opacity] duration-[var(--motion-duration-normal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-primary text-brand-greenText hover:bg-brand-primaryDark",
        secondary:
          "border border-border-default bg-surface-default text-text-ink hover:bg-surface-muted",
        ghost: "bg-transparent text-text-body hover:bg-surface-muted",
      },
      size: {
        sm: "h-[var(--spacing-btn-sm)] px-4 text-sm",
        md: "h-[var(--spacing-btn-md)] px-5 text-base",
        lg: "h-[var(--spacing-btn-lg)] px-6 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "處理中…" : children}
    </Comp>
  );
}
