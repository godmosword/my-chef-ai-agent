"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/primitives/Button";
import { capture } from "@/platform/analytics/events";

const STORAGE_KEY = "chef_onboarded_v1";

function hasAppOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

function markAppOnboarded(): void {
  localStorage.setItem(STORAGE_KEY, "1");
}

export function AppOnboardingOverlay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hasAppOnboarded()) setOpen(true);
  }, []);

  const finish = () => {
    markAppOnboarded();
    capture("onboarding_completed", { version: "v1" });
    setOpen(false);
  };

  if (!open) return null;

  const slides = [
    {
      title: "今晚想煮什麼？",
      body: "在首頁輸入想法，AI 會幫你生成完整食譜與採買建議。",
    },
    {
      title: "這台裝置的料理書",
      body: "已生成的食譜會保存在這台裝置，已快取的版本離線也能查看。",
    },
    {
      title: "分享與烹飪",
      body: "可建立公開連結給朋友，或進入全螢幕烹飪模式逐步引導。",
    },
  ];

  const current = slides[step]!;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 pt-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-onboard-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border-default bg-surface-default p-6 shadow-lg sm:mb-0">
        <p className="text-xs text-text-muted">
          步驟 {step + 1} / {slides.length}
        </p>
        <h2 id="app-onboard-title" className="mt-2 font-serif text-xl text-text-ink">
          {current.title}
        </h2>
        <p className="mt-2 text-sm text-text-body">{current.body}</p>
        <div className="mt-6 flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={finish}>
            略過
          </Button>
          {step < slides.length - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              下一步
            </Button>
          ) : (
            <Button size="sm" onClick={finish}>
              開始使用
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
