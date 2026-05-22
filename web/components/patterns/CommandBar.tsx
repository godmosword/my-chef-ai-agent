"use client";

import { useToast } from "@/components/providers/ToastProvider";

/** Placeholder for ⌘K — Prompt 4 */
export function CommandBar() {
  const { toast } = useToast();

  return (
    <button
      type="button"
      className="hidden w-full max-w-xs items-center justify-between rounded-lg border border-border-default bg-surface-muted px-3 py-2 text-left text-sm text-text-muted md:flex"
      onClick={() =>
        toast({
          title: "指令列即將推出",
          description: "Prompt 4 會接上 ⌘K 搜尋與快捷操作",
        })
      }
    >
      <span>搜尋或指令…</span>
      <kbd className="rounded border border-border-default bg-surface-default px-1.5 py-0.5 font-mono text-xs">
        ⌘K
      </kbd>
    </button>
  );
}
