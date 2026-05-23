"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/primitives/Button";
import { track } from "@/lib/analytics/track";

const STORAGE_KEY = "chef_onboarded_v1";

export function hasAppOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function markAppOnboarded(): void {
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
    track("onboarding_completed", { version: "v1" });
    setOpen(false);
  };

  if (!open) return null;

  const slides = [
    {
      title: "今晚想煮什麼？",
      body: "在首頁輸入想法，AI 會幫你生成完整食譜與採買建議。",
    },
    {
      title: "料理書保存一切",
      body: "食譜會自動存入料理書，離線也能查看已快取的版本。",
    },
    {
      title: "分享與烹飪",
      body: "可建立公開連結給朋友，或進入全螢幕烹飪模式逐步引導。",
    },
  ];

  const current = slides[step]!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-onboard-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border-default bg-surface-default p-6 shadow-lg">
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
