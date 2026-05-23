"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/primitives/Button";

const VISIT_KEY = "chef_visit_count";
const DISMISS_KEY = "a2hs_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}

export function A2HSBanner() {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      if (dismissed) return;
      const visits = Number(localStorage.getItem(VISIT_KEY) ?? "0") + 1;
      localStorage.setItem(VISIT_KEY, String(visits));
      if (visits < 2) return;
    } catch {
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
      setIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    if (isIosSafari()) {
      setIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
    setDeferred(null);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }, [deferred]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border border-border-default bg-surface-default p-4 shadow-card md:bottom-6 md:left-auto md:right-6">
      <div className="flex items-start justify-between gap-2">
        <div className="text-left">
          <p className="font-medium text-text-ink">加到主畫面，下次更快開啟</p>
          {iosHint && !deferred ? (
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-text-muted">
              <li>點下方分享 ↑</li>
              <li>選「加入主畫面」</li>
              <li>點「加入」</li>
            </ol>
          ) : (
            <p className="mt-1 text-sm text-text-muted">安裝後可像 App 一樣全螢幕使用。</p>
          )}
        </div>
        <button
          type="button"
          aria-label="關閉"
          className="rounded p-1 text-text-muted hover:bg-surface-muted"
          onClick={dismiss}
        >
          <X className="size-4" />
        </button>
      </div>
      {deferred && (
        <Button className="mt-3 w-full" size="sm" onClick={install}>
          安裝 App
        </Button>
      )}
    </div>
  );
}
