"use client";

import { Volume2, VolumeX, X } from "lucide-react";
import { IconButton } from "@/components/primitives/IconButton";
import { ProgressBar } from "@/components/primitives/ProgressBar";

export type CookingHeaderProps = {
  currentStep: number;
  totalSteps: number;
  voiceEnabled: boolean;
  onVoiceChange: (v: boolean) => void;
  onExitRequest: () => void;
  onJumpToStep?: (index: number) => void;
  wakeBanner?: string;
};

export function CookingHeader({
  currentStep,
  totalSteps,
  voiceEnabled,
  onVoiceChange,
  onExitRequest,
  onJumpToStep,
  wakeBanner,
}: CookingHeaderProps) {
  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0;

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-border-default px-4 py-3">
      {wakeBanner && (
        <p className="text-xs text-brand-primary" role="status">
          {wakeBanner}
        </p>
      )}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>
              步驟 {currentStep + 1} / {totalSteps}
            </span>
            {totalSteps > 15 && onJumpToStep && (
              <label className="flex items-center gap-1">
                <span className="sr-only">跳到步驟</span>
                <select
                  className="rounded border border-border-default bg-surface-muted px-2 py-1 text-text-ink"
                  value={currentStep}
                  onChange={(e) => onJumpToStep(Number(e.target.value))}
                >
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <option key={i} value={i}>
                      第 {i + 1} 步
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <ProgressBar value={progress * 100} max={100} className="mt-2" tone="primary" />
        </div>
        <IconButton
          icon={voiceEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          aria-label={voiceEnabled ? "關閉語音" : "開啟語音"}
          variant="secondary"
          onClick={() => onVoiceChange(!voiceEnabled)}
        />
        <IconButton
          icon={<X className="size-5" />}
          aria-label="離開烹飪模式"
          variant="secondary"
          onClick={onExitRequest}
        />
      </div>
    </header>
  );
}
