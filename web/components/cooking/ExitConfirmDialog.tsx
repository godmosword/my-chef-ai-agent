"use client";

import { useRef, useState } from "react";
import { Dialog } from "@/components/primitives/Dialog";
import { Button } from "@/components/primitives/Button";

export type ExitConfirmDialogProps = {
  open: boolean;
  stepsRemaining: number;
  onContinue: () => void;
  onLeave: () => void;
};

export function ExitConfirmDialog({
  open,
  stepsRemaining,
  onContinue,
  onLeave,
}: ExitConfirmDialogProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = () => {
    const start = Date.now();
    holdTimer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 1000);
      setHoldProgress(p);
      if (p >= 1) {
        clearHold();
        onLeave();
      }
    }, 50);
  };

  const clearHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHoldProgress(0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onContinue();
      }}
      title="真的要離開嗎？"
      description={`你還有 ${stepsRemaining} 步沒做完。`}
    >
      <div className="flex flex-col gap-3">
        <Button variant="primary" onClick={onContinue}>
          繼續烹飪
        </Button>
        <Button
          variant="secondary"
          onMouseDown={startHold}
          onMouseUp={clearHold}
          onMouseLeave={clearHold}
          onTouchStart={startHold}
          onTouchEnd={clearHold}
        >
          {holdProgress > 0
            ? `放開取消（${Math.round(holdProgress * 100)}%）`
            : "長按 1 秒離開"}
        </Button>
      </div>
    </Dialog>
  );
}
