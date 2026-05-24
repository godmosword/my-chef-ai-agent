"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right" | "bottom";
  title?: string;
  children: React.ReactNode;
};

const sideClass = {
  left: "inset-y-0 left-0 h-full w-[min(100%,22rem)] data-[state=open]:slide-in-from-left",
  right:
    "inset-y-0 right-0 h-full w-[min(100%,24rem)] data-[state=open]:slide-in-from-right",
  bottom:
    "inset-x-0 bottom-0 w-full max-h-[85dvh] rounded-t-lg data-[state=open]:slide-in-from-bottom",
};

export function Sheet({
  open,
  onOpenChange,
  side = "right",
  title,
  children,
}: SheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-text-ink/40" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col border border-border-default bg-surface-default p-4 shadow-card focus:outline-none",
            sideClass[side],
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            {title ? (
              <DialogPrimitive.Title className="font-serif text-lg text-text-ink">
                {title}
              </DialogPrimitive.Title>
            ) : (
              <span />
            )}
            <DialogPrimitive.Close
              className="rounded-lg p-1 hover:bg-surface-muted"
              aria-label="關閉"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
